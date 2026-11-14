-- Keep a durable receipt for every successful cloud-record operation.
-- cloud_records.last_operation_id only remembers the latest write to a record;
-- this ledger also recognizes a delayed retry after a later write has superseded it.
create table if not exists public.cloud_record_sync_operations (
  workspace_id uuid not null,
  operation_id text not null,
  entity_type text not null,
  record_id text not null,
  request_signature text not null,
  record_data jsonb not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  constraint cloud_record_sync_operations_pkey
    primary key (workspace_id, operation_id),
  constraint cloud_record_sync_operations_operation_id_nonempty
    check (nullif(pg_catalog.btrim(operation_id), '') is not null),
  constraint cloud_record_sync_operations_entity_type_nonempty
    check (nullif(pg_catalog.btrim(entity_type), '') is not null),
  constraint cloud_record_sync_operations_record_id_nonempty
    check (nullif(pg_catalog.btrim(record_id), '') is not null)
);

create index if not exists cloud_record_sync_operations_record_idx
  on public.cloud_record_sync_operations (workspace_id, entity_type, record_id, created_at desc);

alter table public.cloud_record_sync_operations enable row level security;

revoke all on table public.cloud_record_sync_operations from public, anon;
grant select, insert on table public.cloud_record_sync_operations to authenticated;

drop policy if exists "Workspace members can read cloud sync operation receipts"
  on public.cloud_record_sync_operations;
create policy "Workspace members can read cloud sync operation receipts"
  on public.cloud_record_sync_operations
  for select
  to authenticated
  using (
    private.is_workspace_member(workspace_id)
    and private.has_workspace_permission(
      workspace_id,
      public.required_workspace_permission(entity_type, 'read', record_id)
    )
  );

drop policy if exists "Writers can record acknowledged cloud sync operations"
  on public.cloud_record_sync_operations;
create policy "Writers can record acknowledged cloud sync operations"
  on public.cloud_record_sync_operations
  for insert
  to authenticated
  with check (
    private.is_workspace_member(workspace_id)
    and created_by = (select auth.uid())
    and private.has_workspace_permission(
      workspace_id,
      public.required_workspace_permission(entity_type, 'read', record_id)
    )
    and (
      private.has_workspace_permission(
        workspace_id,
        public.required_workspace_permission(entity_type, 'insert', record_id)
      )
      or private.has_workspace_permission(
        workspace_id,
        public.required_workspace_permission(entity_type, 'update', record_id)
      )
    )
    and exists (
      select 1
      from public.cloud_records as synced_record
      where synced_record.workspace_id = cloud_record_sync_operations.workspace_id
        and synced_record.entity_type = cloud_record_sync_operations.entity_type
        and synced_record.record_id = cloud_record_sync_operations.record_id
        and synced_record.last_operation_id = cloud_record_sync_operations.operation_id
        and pg_catalog.to_jsonb(synced_record) = cloud_record_sync_operations.record_data
    )
  );

create or replace function public.sync_cloud_record_cas(
  p_workspace_id uuid,
  p_entity_type text,
  p_record_id text,
  p_payload jsonb,
  p_device_id text,
  p_operation_id text,
  p_expected_updated_at timestamptz default null,
  p_deleted boolean default false
)
returns table(sync_status text, record_data jsonb)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_row public.cloud_records%rowtype;
  v_operation public.cloud_record_sync_operations%rowtype;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_operation_id text;
  v_request_signature text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to synchronize cloud records.'
      using errcode = '28000';
  end if;

  if p_workspace_id is null
     or nullif(pg_catalog.btrim(p_entity_type), '') is null
     or nullif(pg_catalog.btrim(p_record_id), '') is null
     or nullif(pg_catalog.btrim(p_operation_id), '') is null then
    raise exception 'workspace, entity type, record id, and a non-empty operation id are required.'
      using errcode = '22023';
  end if;

  v_operation_id := pg_catalog.btrim(p_operation_id);
  v_request_signature := pg_catalog.md5(
    pg_catalog.jsonb_build_object(
      'workspace_id', p_workspace_id,
      'entity_type', p_entity_type,
      'record_id', p_record_id,
      'payload', coalesce(p_payload, '{}'::jsonb),
      'expected_updated_at', p_expected_updated_at,
      'deleted', p_deleted
    )::text
  );

  -- Serialize the same workspace operation key, including retries from other devices.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_workspace_id::text || ':' || v_operation_id, 0)
  );

  -- The append-only ledger survives later writes to cloud_records, so a delayed
  -- retry can still receive the original acknowledgement without replaying a mutation.
  select prior_operation.*
    into v_operation
  from public.cloud_record_sync_operations as prior_operation
  where prior_operation.workspace_id = p_workspace_id
    and prior_operation.operation_id = v_operation_id;

  if found then
    if v_operation.entity_type is distinct from p_entity_type
       or v_operation.record_id is distinct from p_record_id then
      raise exception 'The operation id has already been used for another cloud record in this workspace.'
        using errcode = '23505';
    end if;

    if v_operation.request_signature is distinct from v_request_signature then
      raise exception 'The operation id was replayed with a different request payload.'
        using errcode = '22023';
    end if;

    return query select 'synced'::text, v_operation.record_data;
    return;
  end if;

  select current_row.*
    into v_row
  from public.cloud_records as current_row
  where current_row.workspace_id = p_workspace_id
    and current_row.entity_type = p_entity_type
    and current_row.record_id = p_record_id
  for update;

  if found then
    if p_expected_updated_at is null or v_row.updated_at <> p_expected_updated_at then
      return query select 'conflict'::text, null::jsonb;
      return;
    end if;

    update public.cloud_records as current_row
    set payload = coalesce(p_payload, '{}'::jsonb),
        device_id = nullif(p_device_id, ''),
        updated_by = auth.uid(),
        updated_at = v_now,
        deleted_at = case when p_deleted then v_now else null end,
        last_operation_id = v_operation_id
    where current_row.workspace_id = p_workspace_id
      and current_row.entity_type = p_entity_type
      and current_row.record_id = p_record_id
      and current_row.updated_at = p_expected_updated_at
    returning current_row.* into v_row;
  else
    if p_expected_updated_at is not null then
      return query select 'conflict'::text, null::jsonb;
      return;
    end if;

    insert into public.cloud_records (
      workspace_id, entity_type, record_id, payload,
      device_id, updated_by, updated_at, deleted_at, last_operation_id
    )
    values (
      p_workspace_id, p_entity_type, p_record_id,
      coalesce(p_payload, '{}'::jsonb),
      nullif(p_device_id, ''), auth.uid(), v_now,
      case when p_deleted then v_now else null end,
      v_operation_id
    )
    on conflict (workspace_id, entity_type, record_id) do nothing
    returning * into v_row;

    if not found then
      select current_row.*
        into v_row
      from public.cloud_records as current_row
      where current_row.workspace_id = p_workspace_id
        and current_row.entity_type = p_entity_type
        and current_row.record_id = p_record_id
      for update;

      if found and v_row.last_operation_id = v_operation_id then
        return query select 'synced'::text, pg_catalog.to_jsonb(v_row);
        return;
      end if;

      return query select 'conflict'::text, null::jsonb;
      return;
    end if;
  end if;

  if not found then
    return query select 'conflict'::text, null::jsonb;
    return;
  end if;

  insert into public.cloud_record_sync_operations (
    workspace_id,
    operation_id,
    entity_type,
    record_id,
    request_signature,
    record_data,
    created_by,
    created_at
  )
  values (
    p_workspace_id,
    v_operation_id,
    p_entity_type,
    p_record_id,
    v_request_signature,
    pg_catalog.to_jsonb(v_row),
    auth.uid(),
    v_now
  );

  return query select 'synced'::text, pg_catalog.to_jsonb(v_row);
end;
$function$;

revoke all on function public.sync_cloud_record_cas(uuid, text, text, jsonb, text, text, timestamptz, boolean) from public, anon;
grant execute on function public.sync_cloud_record_cas(uuid, text, text, jsonb, text, text, timestamptz, boolean) to authenticated;

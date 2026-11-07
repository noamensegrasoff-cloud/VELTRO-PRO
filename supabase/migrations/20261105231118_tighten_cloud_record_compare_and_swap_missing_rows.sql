create or replace function public.sync_cloud_record_cas(
  p_workspace_id uuid,
  p_entity_type text,
  p_record_id text,
  p_payload jsonb,
  p_device_id text,
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
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to synchronize cloud records.'
      using errcode = '28000';
  end if;

  if p_workspace_id is null
     or nullif(pg_catalog.btrim(p_entity_type), '') is null
     or nullif(pg_catalog.btrim(p_record_id), '') is null then
    raise exception 'workspace, entity type, and record id are required.'
      using errcode = '22023';
  end if;

  if p_expected_updated_at is null then
    insert into public.cloud_records (
      workspace_id, entity_type, record_id, payload,
      device_id, updated_by, updated_at, deleted_at
    )
    values (
      p_workspace_id, p_entity_type, p_record_id,
      coalesce(p_payload, '{}'::jsonb),
      nullif(p_device_id, ''), auth.uid(), v_now,
      case when p_deleted then v_now else null end
    )
    on conflict (workspace_id, entity_type, record_id) do nothing
    returning * into v_row;
  else
    update public.cloud_records as current_row
    set payload = coalesce(p_payload, '{}'::jsonb),
        device_id = nullif(p_device_id, ''),
        updated_by = auth.uid(),
        updated_at = v_now,
        deleted_at = case when p_deleted then v_now else null end
    where current_row.workspace_id = p_workspace_id
      and current_row.entity_type = p_entity_type
      and current_row.record_id = p_record_id
      and current_row.updated_at = p_expected_updated_at
    returning current_row.* into v_row;
  end if;

  if not found then
    return query select 'conflict'::text, null::jsonb;
    return;
  end if;

  return query select 'synced'::text, pg_catalog.to_jsonb(v_row);
end;
$function$;

revoke all on function public.sync_cloud_record_cas(uuid, text, text, jsonb, text, timestamptz, boolean) from public, anon;
grant execute on function public.sync_cloud_record_cas(uuid, text, text, jsonb, text, timestamptz, boolean) to authenticated;

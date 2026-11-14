-- Minimal PostgreSQL fixture for the Supabase RPC/RLS migration test.
-- It contains no production data and is created in an ephemeral CI database.
do $roles$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$roles$;

create schema if not exists auth;
create schema if not exists private;

create or replace function auth.uid()
returns uuid
language sql
stable
as $function$
  select nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::uuid;
$function$;

create table public.workspace_members (
  workspace_id uuid not null,
  user_id uuid not null,
  primary key (workspace_id, user_id)
);

create table public.workspace_permissions (
  workspace_id uuid not null,
  user_id uuid not null,
  permission text not null,
  primary key (workspace_id, user_id, permission)
);

create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.workspace_members as member_row
    where member_row.workspace_id = target_workspace
      and member_row.user_id = auth.uid()
  );
$function$;

create or replace function private.has_workspace_permission(
  target_workspace uuid,
  requested_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.workspace_permissions as permission_row
    where permission_row.workspace_id = target_workspace
      and permission_row.user_id = auth.uid()
      and permission_row.permission = requested_permission
  );
$function$;

create or replace function public.required_workspace_permission(
  target_entity text,
  operation text,
  target_record text
)
returns text
language sql
immutable
set search_path = ''
as $function$
  select lower(target_entity) || '.' || lower(operation);
$function$;

create table public.cloud_records (
  workspace_id uuid not null,
  entity_type text not null,
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  device_id text,
  updated_by uuid,
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  deleted_at timestamptz,
  last_operation_id text,
  primary key (workspace_id, entity_type, record_id)
);

create unique index cloud_records_workspace_operation_uidx
  on public.cloud_records (workspace_id, last_operation_id)
  where last_operation_id is not null;

alter table public.cloud_records enable row level security;

create policy "Members can read cloud records"
  on public.cloud_records
  for select
  to authenticated
  using (
    private.is_workspace_member(workspace_id)
    and private.has_workspace_permission(
      workspace_id,
      public.required_workspace_permission(entity_type, 'read', record_id)
    )
  );

create policy "Members can insert cloud records"
  on public.cloud_records
  for insert
  to authenticated
  with check (
    private.is_workspace_member(workspace_id)
    and updated_by = (select auth.uid())
    and private.has_workspace_permission(
      workspace_id,
      public.required_workspace_permission(entity_type, 'insert', record_id)
    )
  );

create policy "Members can update cloud records"
  on public.cloud_records
  for update
  to authenticated
  using (
    private.is_workspace_member(workspace_id)
    and private.has_workspace_permission(
      workspace_id,
      public.required_workspace_permission(entity_type, 'update', record_id)
    )
  )
  with check (
    private.is_workspace_member(workspace_id)
    and updated_by = (select auth.uid())
    and private.has_workspace_permission(
      workspace_id,
      public.required_workspace_permission(entity_type, 'update', record_id)
    )
  );

grant usage on schema public, auth, private to authenticated;
grant select, insert, update on public.cloud_records to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.has_workspace_permission(uuid, text) to authenticated;
grant execute on function public.required_workspace_permission(text, text, text) to authenticated;

insert into public.workspace_members (workspace_id, user_id)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002');

insert into public.workspace_permissions (workspace_id, user_id, permission)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'products.read'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'products.insert'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'products.update'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'products.read');

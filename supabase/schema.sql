-- VELTRO-PRO cloud foundation
-- Apply this entire script in the intended Supabase project's SQL Editor.
-- All application data is workspace-scoped. Never expose a service_role key to the browser.

begin;

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'manager', 'cashier', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.cloud_records (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (length(entity_type) between 1 and 80),
  record_id text not null check (length(record_id) between 1 and 200),
  payload jsonb not null default '{}'::jsonb,
  device_id text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (workspace_id, entity_type, record_id)
);

create index if not exists cloud_records_workspace_updated_idx
  on public.cloud_records (workspace_id, updated_at desc);
create index if not exists cloud_records_live_entity_idx
  on public.cloud_records (workspace_id, entity_type) where deleted_at is null;

-- A workspace creator is always its owner. This runs inside PostgreSQL, not in
-- the browser, so a new account cannot accidentally create an unowned workspace.
create or replace function public.add_workspace_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists workspaces_add_creator_owner on public.workspaces;
create trigger workspaces_add_creator_owner
after insert on public.workspaces
for each row execute function public.add_workspace_creator_as_owner();

-- Repair workspaces created before this trigger was installed.
insert into public.workspace_members (workspace_id, user_id, role)
select w.id, w.created_by, 'owner'
from public.workspaces w
on conflict (workspace_id, user_id) do nothing;

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
revoke all on function public.add_workspace_creator_as_owner() from public;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.cloud_records enable row level security;

drop policy if exists "Members can read their workspaces" on public.workspaces;
create policy "Members can read their workspaces"
  on public.workspaces for select to authenticated
  using (created_by = (select auth.uid()) or public.is_workspace_member(id));

drop policy if exists "Owners can create a workspace" on public.workspaces;
create policy "Owners can create a workspace"
  on public.workspaces for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "Members can read workspace membership" on public.workspace_members;
create policy "Members can read workspace membership"
  on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- Membership changes are intentionally not client-writable. The database
-- trigger creates the owner's membership. Add a separate server-verified
-- invitation flow before implementing team invitations.
drop policy if exists "Workspace owners can add members" on public.workspace_members;
drop policy if exists "Owners can add themselves to their workspace" on public.workspace_members;

drop policy if exists "Workspace members can read records" on public.cloud_records;
create policy "Workspace members can read records"
  on public.cloud_records for select to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can insert records" on public.cloud_records;
create policy "Workspace members can insert records"
  on public.cloud_records for insert to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and updated_by = (select auth.uid())
  );

drop policy if exists "Workspace members can update records" on public.cloud_records;
create policy "Workspace members can update records"
  on public.cloud_records for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (
    public.is_workspace_member(workspace_id)
    and updated_by = (select auth.uid())
  );

-- Remove old broad grants before re-applying the minimum required permissions.
revoke all on public.workspaces, public.workspace_members, public.cloud_records from anon, authenticated;
grant select, insert on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select, insert, update on public.cloud_records to authenticated;

-- Optional: enable realtime delivery for cloud record changes.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'cloud_records'
     ) then
    alter publication supabase_realtime add table public.cloud_records;
  end if;
end $$;

commit;

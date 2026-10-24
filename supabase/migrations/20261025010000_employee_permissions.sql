-- VELTRO-PRO employee and permissions foundation.
-- Additive migration: existing workspace and cloud records are preserved.
create table if not exists public.workspace_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  is_system boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name),
  check (jsonb_typeof(permissions) = 'object')
);

alter table public.workspace_members
  add column if not exists custom_role_id uuid references public.workspace_roles(id) on delete set null;

create table if not exists public.employee_profiles (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  status text not null default 'active' check (status in ('active','suspended','invited')),
  employee_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  unique (workspace_id, employee_code)
);

create table if not exists public.workspace_branches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  code text,
  address text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, name),
  unique (workspace_id, code)
);

create table if not exists public.workspace_member_branches (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  branch_id uuid not null references public.workspace_branches(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id, branch_id)
);

create table if not exists public.workspace_audit_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_approval_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  approved_by uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  reason text not null default '',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text,
  device_label text not null default '',
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workspace_roles_workspace_idx on public.workspace_roles(workspace_id);
create index if not exists employee_profiles_workspace_status_idx on public.employee_profiles(workspace_id, status);
create index if not exists workspace_audit_logs_workspace_created_idx on public.workspace_audit_logs(workspace_id, created_at desc);
create index if not exists workspace_approval_requests_workspace_status_idx on public.workspace_approval_requests(workspace_id, status, created_at desc);
create index if not exists workspace_sessions_user_active_idx on public.workspace_sessions(user_id, revoked_at, last_seen_at desc);

create or replace function public.is_workspace_owner(target_workspace uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.role = 'owner'
  );
$$;

create table if not exists public.role_permission_templates (
  role text not null check (role in ('admin','manager','cashier','member','viewer')),
  permission_key text not null,
  primary key (role, permission_key)
);
alter table public.role_permission_templates enable row level security;
drop policy if exists "Authenticated users can read role permission templates" on public.role_permission_templates;
create policy "Authenticated users can read role permission templates" on public.role_permission_templates
  for select to authenticated using (true);

insert into public.role_permission_templates(role, permission_key) values
('admin','dashboard.view'),('admin','sales.view'),('admin','sales.create'),('admin','sales.edit'),('admin','sales.discount'),('admin','sales.return'),('admin','cash.view'),('admin','cash.open_close'),('admin','cash.expense.create'),('admin','products.view'),('admin','products.create'),('admin','products.edit'),('admin','products.cost.view'),('admin','products.price.edit'),('admin','inventory.adjust'),('admin','inventory.count'),('admin','purchases.view'),('admin','purchases.create'),('admin','purchases.confirm'),('admin','suppliers.manage'),('admin','customers.view'),('admin','customers.manage'),('admin','customers.debts.view'),('admin','reports.sales.view'),('admin','reports.profit.view'),('admin','reports.export'),('admin','reports.staff.view'),('admin','employees.view'),('admin','employees.manage'),('admin','approvals.review'),('admin','audit.view'),
('manager','dashboard.view'),('manager','sales.view'),('manager','sales.create'),('manager','sales.edit'),('manager','sales.discount'),('manager','sales.return'),('manager','cash.view'),('manager','cash.open_close'),('manager','cash.expense.create'),('manager','products.view'),('manager','products.create'),('manager','products.edit'),('manager','products.cost.view'),('manager','products.price.edit'),('manager','inventory.adjust'),('manager','inventory.count'),('manager','purchases.view'),('manager','purchases.create'),('manager','purchases.confirm'),('manager','suppliers.manage'),('manager','customers.view'),('manager','customers.manage'),('manager','customers.debts.view'),('manager','reports.sales.view'),('manager','reports.staff.view'),('manager','employees.view'),('manager','approvals.review'),
('cashier','dashboard.view'),('cashier','sales.view'),('cashier','sales.create'),('cashier','sales.edit'),('cashier','cash.view'),('cashier','cash.open_close'),('cashier','products.view'),('cashier','customers.view'),
('member','dashboard.view'),('member','sales.view'),('member','products.view'),
('viewer','dashboard.view'),('viewer','sales.view'),('viewer','products.view'),('viewer','purchases.view'),('viewer','customers.view'),('viewer','reports.sales.view')
on conflict do nothing;

create or replace function public.has_workspace_permission(target_workspace uuid, permission_key text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    left join public.workspace_roles wr
      on wr.id = wm.custom_role_id and wr.workspace_id = wm.workspace_id
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and (
        wm.role = 'owner'
        or coalesce((wr.permissions ->> permission_key)::boolean, false)
        or exists (
          select 1 from public.role_permission_templates rpt
          where rpt.role = wm.role and rpt.permission_key = has_workspace_permission.permission_key
        )
      )
  );
$$;

alter table public.workspace_roles enable row level security;
alter table public.employee_profiles enable row level security;
alter table public.workspace_branches enable row level security;
alter table public.workspace_member_branches enable row level security;
alter table public.workspace_audit_logs enable row level security;
alter table public.workspace_approval_requests enable row level security;
alter table public.workspace_sessions enable row level security;

drop policy if exists "Workspace members can read custom roles" on public.workspace_roles;
create policy "Workspace members can read custom roles" on public.workspace_roles
  for select to authenticated using (public.is_workspace_member(workspace_id));

drop policy if exists "Owners manage custom roles" on public.workspace_roles;
create policy "Owners manage custom roles" on public.workspace_roles
  for all to authenticated using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists "Authorized users can read employee profiles" on public.employee_profiles;
create policy "Authorized users can read employee profiles" on public.employee_profiles
  for select to authenticated using (
    user_id = (select auth.uid())
    or public.has_workspace_permission(workspace_id, 'employees.view')
    or public.is_workspace_owner(workspace_id)
  );

drop policy if exists "Owners manage employee profiles" on public.employee_profiles;
create policy "Owners manage employee profiles" on public.employee_profiles
  for all to authenticated using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists "Workspace members can read branches" on public.workspace_branches;
create policy "Workspace members can read branches" on public.workspace_branches
  for select to authenticated using (public.is_workspace_member(workspace_id));

drop policy if exists "Owners manage branches" on public.workspace_branches;
create policy "Owners manage branches" on public.workspace_branches
  for all to authenticated using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists "Users can read their branch assignments" on public.workspace_member_branches;
create policy "Users can read their branch assignments" on public.workspace_member_branches
  for select to authenticated using (
    user_id = (select auth.uid()) or public.is_workspace_owner(workspace_id)
  );

drop policy if exists "Owners manage branch assignments" on public.workspace_member_branches;
create policy "Owners manage branch assignments" on public.workspace_member_branches
  for all to authenticated using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists "Owners and authorized managers can read audit logs" on public.workspace_audit_logs;
create policy "Owners and authorized managers can read audit logs" on public.workspace_audit_logs
  for select to authenticated using (
    public.is_workspace_owner(workspace_id)
    or public.has_workspace_permission(workspace_id, 'audit.view')
  );

drop policy if exists "Authenticated users can append own audit logs" on public.workspace_audit_logs;
create policy "Authenticated users can append own audit logs" on public.workspace_audit_logs
  for insert to authenticated with check (
    actor_user_id = (select auth.uid())
    and public.is_workspace_member(workspace_id)
  );

drop policy if exists "Users can read approval requests they are involved in" on public.workspace_approval_requests;
create policy "Users can read approval requests they are involved in" on public.workspace_approval_requests
  for select to authenticated using (
    requested_by = (select auth.uid())
    or public.is_workspace_owner(workspace_id)
    or public.has_workspace_permission(workspace_id, 'approvals.review')
  );

drop policy if exists "Members can request approvals" on public.workspace_approval_requests;
create policy "Members can request approvals" on public.workspace_approval_requests
  for insert to authenticated with check (
    requested_by = (select auth.uid())
    and public.is_workspace_member(workspace_id)
  );

drop policy if exists "Authorized users can decide approvals" on public.workspace_approval_requests;
create policy "Authorized users can decide approvals" on public.workspace_approval_requests
  for update to authenticated using (
    public.is_workspace_owner(workspace_id)
    or public.has_workspace_permission(workspace_id, 'approvals.review')
  ) with check (
    public.is_workspace_owner(workspace_id)
    or public.has_workspace_permission(workspace_id, 'approvals.review')
  );

drop policy if exists "Users can read own sessions" on public.workspace_sessions;
create policy "Users can read own sessions" on public.workspace_sessions
  for select to authenticated using (
    user_id = (select auth.uid()) or public.is_workspace_owner(workspace_id)
  );

drop policy if exists "Owners manage sessions" on public.workspace_sessions;
create policy "Owners manage sessions" on public.workspace_sessions
  for all to authenticated using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists "Owners can add non-owner workspace members" on public.workspace_members;
create policy "Owners can add non-owner workspace members" on public.workspace_members
  for insert to authenticated with check (
    public.is_workspace_owner(workspace_id)
    and role <> 'owner'
    and (custom_role_id is null or exists (
      select 1 from public.workspace_roles wr
      where wr.id = custom_role_id and wr.workspace_id = workspace_id
    ))
  );

drop policy if exists "Owners can update non-owner workspace members" on public.workspace_members;
create policy "Owners can update non-owner workspace members" on public.workspace_members
  for update to authenticated using (
    public.is_workspace_owner(workspace_id) and role <> 'owner'
  ) with check (
    public.is_workspace_owner(workspace_id)
    and role <> 'owner'
    and (custom_role_id is null or exists (
      select 1 from public.workspace_roles wr
      where wr.id = custom_role_id and wr.workspace_id = workspace_id
    ))
  );

drop policy if exists "Owners can remove non-owner workspace members" on public.workspace_members;
create policy "Owners can remove non-owner workspace members" on public.workspace_members
  for delete to authenticated using (
    public.is_workspace_owner(workspace_id) and role <> 'owner'
  );

comment on table public.workspace_roles is 'Workspace-scoped custom roles. Only the workspace owner may manage role definitions and permission grants.';
comment on table public.workspace_audit_logs is 'Append-oriented audit log for sensitive workspace actions.';
comment on table public.workspace_approval_requests is 'Approval queue for sensitive operations such as voids, returns, and manual stock changes.';

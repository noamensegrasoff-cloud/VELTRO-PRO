-- Harden workspace permissions, restore required API grants, and align
-- cloud-record permissions with the entity types written by the application.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_workspace_member(target_workspace uuid)
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

create or replace function private.is_workspace_owner(target_workspace uuid)
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
      and wm.role = 'owner'
  );
$$;

-- A custom role is an explicit permission set and must replace, not silently
-- inherit, the member's built-in role template.
create or replace function private.has_workspace_permission(
  target_workspace uuid,
  requested_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    left join public.workspace_roles wr
      on wr.id = wm.custom_role_id
     and wr.workspace_id = wm.workspace_id
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and (
        wm.role = 'owner'
        or case
          when wm.custom_role_id is not null then
            wr.id is not null
            and coalesce(wr.permissions -> requested_permission, 'false'::jsonb) = 'true'::jsonb
          else exists (
            select 1
            from public.role_permission_templates rpt
            where rpt.role = wm.role
              and rpt.permission_key = requested_permission
          )
        end
      )
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon;
revoke all on function private.is_workspace_owner(uuid) from public, anon;
revoke all on function private.has_workspace_permission(uuid, text) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.is_workspace_owner(uuid) to authenticated;
grant execute on function private.has_workspace_permission(uuid, text) to authenticated;

-- Cloud records use record_id to distinguish individual legacy localStorage
-- keys. This lets RLS apply the correct permission instead of granting all
-- legacy records the owner-only workspace.records.manage permission.
create function public.required_workspace_permission(
  target_entity text,
  operation text,
  target_record text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when lower(target_entity) in ('sales','sale','sales_history','sales-history','invoice','invoices','receipt','receipts','pos_sales','pos-sales','sales_invoices','sales-invoice','sales-invoices')
      then case operation when 'read' then 'sales.view' when 'insert' then 'sales.create' else 'sales.edit' end
    when lower(target_entity) in ('products','product','product_catalog','product-catalog','categories','category')
      then case operation when 'read' then 'products.view' when 'insert' then 'products.create' else 'products.edit' end
    when lower(target_entity) in ('inventory','stock','stock_movement','stock-movement','inventory_count','inventory-count','product_movements','product-movements')
      then case operation when 'read' then 'products.view' else 'inventory.adjust' end
    when lower(target_entity) in ('purchases','purchase','purchase_history','purchase-history','orders','order','purchase_receipts','purchase-receipts','purchase_invoices','purchase-invoices')
      then case operation when 'read' then 'purchases.view' when 'insert' then 'purchases.create' else 'purchases.confirm' end
    when lower(target_entity) in ('customers','customer','customer_accounts','customer-accounts')
      then case operation when 'read' then 'customers.view' else 'customers.manage' end
    when lower(target_entity) in ('suppliers','supplier','supplier_accounts','supplier-accounts')
      then 'suppliers.manage'
    when lower(target_entity) in ('cash','cash_register','cash-register','cash_transactions','cash-transactions','cash_movements','cash-movements')
      then case operation when 'read' then 'cash.view' else 'cash.open_close' end
    when lower(target_entity) in ('reports','report','statistics','analytics')
      then case operation when 'read' then 'reports.sales.view' else 'reports.export' end
    when lower(target_entity) in ('employees','employee_profiles','workspace_members')
      then case operation when 'read' then 'employees.view' else 'employees.manage' end
    when lower(target_entity) in ('roles','permissions','workspace_roles')
      then 'roles.manage'
    when lower(target_entity) = 'local_storage' then
      case
        when lower(coalesce(target_record, '')) ~ '(customer[._-]?transactions|customer-transactions)' then
          case operation when 'read' then 'customers.debts.view' when 'insert' then 'sales.create' else 'sales.edit' end
        when lower(coalesce(target_record, '')) ~ '(sales|sale|pos|held)' then
          case operation when 'read' then 'sales.view' when 'insert' then 'sales.create' else 'sales.edit' end
        when lower(coalesce(target_record, '')) ~ '(purchase|purchases|order)' then
          case operation when 'read' then 'purchases.view' when 'insert' then 'purchases.create' else 'purchases.confirm' end
        when lower(coalesce(target_record, '')) ~ '(supplier|suppliers)' then 'suppliers.manage'
        when lower(coalesce(target_record, '')) ~ '(stock|movement|inventory)' then
          case operation when 'read' then 'products.view' else 'inventory.adjust' end
        when lower(coalesce(target_record, '')) ~ '(product|products|catalog|barcode|category)' then
          case operation when 'read' then 'products.view' when 'insert' then 'products.create' else 'products.edit' end
        when lower(coalesce(target_record, '')) ~ '(customer|customers)' then
          case operation when 'read' then 'customers.view' else 'customers.manage' end
        when lower(coalesce(target_record, '')) ~ '(expense|income)' then case operation when 'read' then 'cash.view' else 'cash.expense.create' end
        when lower(coalesce(target_record, '')) ~ '(cash|payment)' then
          case operation when 'read' then 'cash.view' else 'cash.open_close' end
        when lower(coalesce(target_record, '')) ~ '(report|reports|statistics|analytics)' then
          case operation when 'read' then 'reports.sales.view' else 'reports.export' end
        when lower(coalesce(target_record, '')) ~ '(dashboard)' then 'dashboard.view'
        else 'workspace.records.manage'
      end
    else 'workspace.records.manage'
  end;
$$;

-- Rebuild policies against private SECURITY DEFINER helpers.
drop policy if exists "Members can read their workspaces" on public.workspaces;
create policy "Members can read their workspaces"
on public.workspaces for select to authenticated
using ((created_by = (select auth.uid())) or private.is_workspace_member(id));

drop policy if exists "Members can read workspace membership" on public.workspace_members;
create policy "Members can read workspace membership"
on public.workspace_members for select to authenticated
using (private.is_workspace_member(workspace_id));

drop policy if exists "Owners can add non-owner workspace members" on public.workspace_members;
create policy "Owners can add non-owner workspace members"
on public.workspace_members for insert to authenticated
with check (
  private.is_workspace_owner(workspace_id)
  and role <> 'owner'
  and (
    custom_role_id is null
    or exists (
      select 1 from public.workspace_roles wr
      where wr.id = workspace_members.custom_role_id
        and wr.workspace_id = workspace_members.workspace_id
    )
  )
);

drop policy if exists "Owners can update non-owner workspace members" on public.workspace_members;
create policy "Owners can update non-owner workspace members"
on public.workspace_members for update to authenticated
using (private.is_workspace_owner(workspace_id) and role <> 'owner')
with check (
  private.is_workspace_owner(workspace_id)
  and role <> 'owner'
  and (
    custom_role_id is null
    or exists (
      select 1 from public.workspace_roles wr
      where wr.id = workspace_members.custom_role_id
        and wr.workspace_id = workspace_members.workspace_id
    )
  )
);

drop policy if exists "Owners can remove non-owner workspace members" on public.workspace_members;
create policy "Owners can remove non-owner workspace members"
on public.workspace_members for delete to authenticated
using (private.is_workspace_owner(workspace_id) and role <> 'owner');

drop policy if exists "Members can insert permitted records" on public.cloud_records;
drop policy if exists "Members can update permitted records" on public.cloud_records;
drop policy if exists "Workspace members can read permitted records" on public.cloud_records;
create policy "Workspace members can read permitted records"
on public.cloud_records for select to authenticated
using (private.has_workspace_permission(workspace_id, public.required_workspace_permission(entity_type, 'read', record_id)));
create policy "Members can insert permitted records"
on public.cloud_records for insert to authenticated
with check (
  private.is_workspace_member(workspace_id)
  and updated_by = (select auth.uid())
  and private.has_workspace_permission(workspace_id, public.required_workspace_permission(entity_type, 'insert', record_id))
);
create policy "Members can update permitted records"
on public.cloud_records for update to authenticated
using (private.has_workspace_permission(workspace_id, public.required_workspace_permission(entity_type, 'update', record_id)))
with check (
  private.is_workspace_member(workspace_id)
  and updated_by = (select auth.uid())
  and private.has_workspace_permission(workspace_id, public.required_workspace_permission(entity_type, 'update', record_id))
);

drop policy if exists "Authorized users can read employee profiles" on public.employee_profiles;
create policy "Authorized users can read employee profiles"
on public.employee_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or private.has_workspace_permission(workspace_id, 'employees.view')
  or private.is_workspace_owner(workspace_id)
);
drop policy if exists "Owners manage employee profiles" on public.employee_profiles;
create policy "Authorized users create employee profiles"
on public.employee_profiles for insert to authenticated
with check (private.has_workspace_permission(workspace_id, 'employees.manage'));
create policy "Authorized users update employee profiles"
on public.employee_profiles for update to authenticated
using (private.has_workspace_permission(workspace_id, 'employees.manage'))
with check (private.has_workspace_permission(workspace_id, 'employees.manage'));
create policy "Authorized users delete employee profiles"
on public.employee_profiles for delete to authenticated
using (private.has_workspace_permission(workspace_id, 'employees.manage'));

drop policy if exists "Owners manage custom roles" on public.workspace_roles;
drop policy if exists "Workspace members can read custom roles" on public.workspace_roles;
create policy "Workspace members can read custom roles"
on public.workspace_roles for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy "Owners create custom roles"
on public.workspace_roles for insert to authenticated
with check (private.is_workspace_owner(workspace_id));
create policy "Owners update custom roles"
on public.workspace_roles for update to authenticated
using (private.is_workspace_owner(workspace_id))
with check (private.is_workspace_owner(workspace_id));
create policy "Owners delete custom roles"
on public.workspace_roles for delete to authenticated
using (private.is_workspace_owner(workspace_id));

drop policy if exists "Owners manage branches" on public.workspace_branches;
drop policy if exists "Workspace members can read branches" on public.workspace_branches;
create policy "Workspace members can read branches"
on public.workspace_branches for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy "Owners create branches"
on public.workspace_branches for insert to authenticated
with check (private.is_workspace_owner(workspace_id));
create policy "Owners update branches"
on public.workspace_branches for update to authenticated
using (private.is_workspace_owner(workspace_id))
with check (private.is_workspace_owner(workspace_id));
create policy "Owners delete branches"
on public.workspace_branches for delete to authenticated
using (private.is_workspace_owner(workspace_id));

drop policy if exists "Owners manage branch assignments" on public.workspace_member_branches;
drop policy if exists "Users can read their branch assignments" on public.workspace_member_branches;
create policy "Users can read their branch assignments"
on public.workspace_member_branches for select to authenticated
using (user_id = (select auth.uid()) or private.is_workspace_owner(workspace_id));
create policy "Owners create branch assignments"
on public.workspace_member_branches for insert to authenticated
with check (private.is_workspace_owner(workspace_id));
create policy "Owners update branch assignments"
on public.workspace_member_branches for update to authenticated
using (private.is_workspace_owner(workspace_id))
with check (private.is_workspace_owner(workspace_id));
create policy "Owners delete branch assignments"
on public.workspace_member_branches for delete to authenticated
using (private.is_workspace_owner(workspace_id));

drop policy if exists "Owners manage sessions" on public.workspace_sessions;
drop policy if exists "Users can read own sessions" on public.workspace_sessions;
create policy "Users can read own sessions"
on public.workspace_sessions for select to authenticated
using (user_id = (select auth.uid()) or private.is_workspace_owner(workspace_id));
create policy "Owners create sessions"
on public.workspace_sessions for insert to authenticated
with check (private.is_workspace_owner(workspace_id));
create policy "Owners update sessions"
on public.workspace_sessions for update to authenticated
using (private.is_workspace_owner(workspace_id))
with check (private.is_workspace_owner(workspace_id));
create policy "Owners delete sessions"
on public.workspace_sessions for delete to authenticated
using (private.is_workspace_owner(workspace_id));

drop policy if exists "Authorized users can decide approvals" on public.workspace_approval_requests;
create policy "Authorized users can decide approvals"
on public.workspace_approval_requests for update to authenticated
using (private.is_workspace_owner(workspace_id) or private.has_workspace_permission(workspace_id, 'approvals.review'))
with check (private.is_workspace_owner(workspace_id) or private.has_workspace_permission(workspace_id, 'approvals.review'));

drop policy if exists "Members can request approvals" on public.workspace_approval_requests;
create policy "Members can request approvals"
on public.workspace_approval_requests for insert to authenticated
with check (requested_by = (select auth.uid()) and private.is_workspace_member(workspace_id));

drop policy if exists "Users can read approval requests they are involved in" on public.workspace_approval_requests;
create policy "Users can read approval requests they are involved in"
on public.workspace_approval_requests for select to authenticated
using (
  requested_by = (select auth.uid())
  or private.is_workspace_owner(workspace_id)
  or private.has_workspace_permission(workspace_id, 'approvals.review')
);

drop policy if exists "Authenticated users can append own audit logs" on public.workspace_audit_logs;
create policy "Authenticated users can append own audit logs"
on public.workspace_audit_logs for insert to authenticated
with check (actor_user_id = (select auth.uid()) and private.is_workspace_member(workspace_id));

drop policy if exists "Owners and authorized managers can read audit logs" on public.workspace_audit_logs;
create policy "Owners and authorized managers can read audit logs"
on public.workspace_audit_logs for select to authenticated
using (private.is_workspace_owner(workspace_id) or private.has_workspace_permission(workspace_id, 'audit.view'));

-- Grant only the table operations that have matching RLS policies.
revoke truncate, references, trigger on table
  public.employee_profiles,
  public.role_permission_templates,
  public.workspace_approval_requests,
  public.workspace_audit_logs,
  public.workspace_branches,
  public.workspace_member_branches,
  public.workspace_members,
  public.workspace_roles,
  public.workspace_sessions
from public, anon, authenticated;

grant select, insert, update, delete on public.employee_profiles to authenticated;
grant select on public.role_permission_templates to authenticated;
grant select, insert, update on public.workspace_approval_requests to authenticated;
grant select, insert on public.workspace_audit_logs to authenticated;
grant select, insert, update, delete on public.workspace_branches to authenticated;
grant select, insert, update, delete on public.workspace_member_branches to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.workspace_roles to authenticated;
grant select, insert, update, delete on public.workspace_sessions to authenticated;

-- workspace_audit_logs.id is already an identity column in the live database.

-- Add indexes for foreign keys not covered by an existing leading index.
create index if not exists cloud_records_updated_by_idx on public.cloud_records(updated_by);
create index if not exists employee_profiles_user_id_idx on public.employee_profiles(user_id);
create index if not exists workspace_approval_requests_approved_by_idx on public.workspace_approval_requests(approved_by);
create index if not exists workspace_approval_requests_requested_by_idx on public.workspace_approval_requests(requested_by);
create index if not exists workspace_audit_logs_actor_user_id_idx on public.workspace_audit_logs(actor_user_id);
create index if not exists workspace_member_branches_branch_id_idx on public.workspace_member_branches(branch_id);
create index if not exists workspace_member_branches_user_id_idx on public.workspace_member_branches(user_id);
create index if not exists workspace_members_custom_role_id_idx on public.workspace_members(custom_role_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists workspace_roles_created_by_idx on public.workspace_roles(created_by);
create index if not exists workspace_sessions_workspace_id_idx on public.workspace_sessions(workspace_id);
create index if not exists workspaces_created_by_idx on public.workspaces(created_by);

-- Prevent branch assignments from pairing a workspace with another workspace's
-- branch or with a user who is not a member of that workspace.
create unique index if not exists workspace_branches_workspace_id_id_uidx
  on public.workspace_branches(workspace_id, id);
alter table public.workspace_member_branches
  drop constraint if exists workspace_member_branches_branch_id_fkey;
alter table public.workspace_member_branches
  drop constraint if exists workspace_member_branches_user_id_fkey;
alter table public.workspace_member_branches
  add constraint workspace_member_branches_branch_workspace_fkey
  foreign key (workspace_id, branch_id)
  references public.workspace_branches(workspace_id, id)
  on delete cascade;
alter table public.workspace_member_branches
  add constraint workspace_member_branches_member_workspace_fkey
  foreign key (workspace_id, user_id)
  references public.workspace_members(workspace_id, user_id)
  on delete cascade;

-- Remove callable SECURITY DEFINER helpers from the API-exposed public schema.
revoke all on function public.is_workspace_member(uuid) from public, anon, authenticated;
revoke all on function public.is_workspace_owner(uuid) from public, anon, authenticated;
revoke all on function public.has_workspace_permission(uuid, text) from public, anon, authenticated;
drop function public.is_workspace_member(uuid);
drop function public.is_workspace_owner(uuid);
drop function public.has_workspace_permission(uuid, text);
revoke all on function public.required_workspace_permission(text, text) from public, anon, authenticated;
drop function public.required_workspace_permission(text, text);
revoke all on function public.required_workspace_permission(text, text, text) from public, anon;
grant execute on function public.required_workspace_permission(text, text, text) to authenticated;

commit;

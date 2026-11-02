-- Read-only verification for workspace isolation and employee permissions.
-- Run after applying every migration in supabase/migrations/.
-- The live project must also pass the two-account runtime test in SECURITY.md.

-- All workspace-owned tables must have RLS enabled.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'workspaces','workspace_members','cloud_records','employee_profiles',
    'role_permission_templates','workspace_approval_requests','workspace_audit_logs',
    'workspace_branches','workspace_member_branches','workspace_roles','workspace_sessions'
  )
order by c.relname;

-- Inspect the effective policies for every workspace/permission table.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'workspaces','workspace_members','cloud_records','employee_profiles',
    'role_permission_templates','workspace_approval_requests','workspace_audit_logs',
    'workspace_branches','workspace_member_branches','workspace_roles','workspace_sessions'
  )
order by tablename, policyname;

-- Check that anonymous users cannot read/write/truncate protected tables and
-- authenticated users have only the privileges needed by the RLS policies.
select table_name,
  has_table_privilege('anon', 'public.' || quote_ident(table_name), 'SELECT') as anon_select,
  has_table_privilege('anon', 'public.' || quote_ident(table_name), 'INSERT') as anon_insert,
  has_table_privilege('anon', 'public.' || quote_ident(table_name), 'UPDATE') as anon_update,
  has_table_privilege('anon', 'public.' || quote_ident(table_name), 'DELETE') as anon_delete,
  has_table_privilege('anon', 'public.' || quote_ident(table_name), 'TRUNCATE') as anon_truncate,
  has_table_privilege('authenticated', 'public.' || quote_ident(table_name), 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', 'public.' || quote_ident(table_name), 'INSERT') as authenticated_insert,
  has_table_privilege('authenticated', 'public.' || quote_ident(table_name), 'UPDATE') as authenticated_update,
  has_table_privilege('authenticated', 'public.' || quote_ident(table_name), 'DELETE') as authenticated_delete
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name in (
    'workspaces','workspace_members','cloud_records','employee_profiles',
    'role_permission_templates','workspace_approval_requests','workspace_audit_logs',
    'workspace_branches','workspace_member_branches','workspace_roles','workspace_sessions'
  )
order by table_name;

-- There must be exactly one creator-to-owner trigger on workspaces.
select tgname as trigger_name, tgenabled as enabled, pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'public.workspaces'::regclass
  and not tgisinternal;

-- No member may reference a custom role from another workspace.
select wm.workspace_id, wm.user_id, wm.custom_role_id, wr.workspace_id as role_workspace_id
from public.workspace_members wm
join public.workspace_roles wr on wr.id = wm.custom_role_id
where wr.workspace_id <> wm.workspace_id;

-- No branch assignment may mix a workspace, branch, or member from another workspace.
select wmb.workspace_id, wmb.user_id, wmb.branch_id,
       wb.workspace_id as branch_workspace_id,
       wm.workspace_id as member_workspace_id
from public.workspace_member_branches wmb
left join public.workspace_branches wb on wb.id = wmb.branch_id
left join public.workspace_members wm on wm.user_id = wmb.user_id
where wb.workspace_id is distinct from wmb.workspace_id
   or not exists (
     select 1 from public.workspace_members m
     where m.workspace_id = wmb.workspace_id and m.user_id = wmb.user_id
   );

-- SECURITY DEFINER helpers must live outside the API-exposed public schema.
select n.nspname as schema_name, p.proname, p.prosecdef as security_definer, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'private' and p.proname in ('has_workspace_permission','is_workspace_member','is_workspace_owner'))
   or (n.nspname = 'public' and p.proname in ('has_workspace_permission','is_workspace_member','is_workspace_owner'))
order by schema_name, p.proname;

-- The record permission mapper must match the real entity types and legacy keys.
select entity_type, record_id,
       public.required_workspace_permission(entity_type, operation, record_id) as required_permission
from (
  values
    ('products','product-1','insert'),
    ('sales_invoices','invoice-1','insert'),
    ('purchase_receipts','receipt-1','insert'),
    ('product_movements','movement-1','insert'),
    ('local_storage','veltro_sales_invoices','insert'),
    ('local_storage','veltro.purchases.v1','insert'),
    ('local_storage','veltro-product-movements-v1','insert'),
    ('local_storage','veltro.customer.transactions.v1','insert'),
    ('local_storage','veltro.customer.transactions.v1','read'),
    ('cash','drawer-1','update'),
    ('local_storage','veltro.expenses.v1','insert')
) as t(entity_type, record_id, operation);

-- No duplicate permissive SELECT policies should remain on the same table.
select tablename, count(*) as select_policy_count, array_agg(policyname order by policyname) as policies
from pg_policies
where schemaname = 'public' and cmd = 'SELECT' and permissive = 'PERMISSIVE'
group by tablename
having count(*) > 1
order by tablename;

-- Audit logs must generate IDs automatically.
select column_name, is_identity, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'workspace_audit_logs'
  and column_name = 'id';

-- Foreign-key indexes should be present for common workspace joins.
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'cloud_records_updated_by_idx','employee_profiles_user_id_idx',
    'workspace_approval_requests_approved_by_idx','workspace_approval_requests_requested_by_idx',
    'workspace_audit_logs_actor_user_id_idx','workspace_member_branches_branch_id_idx',
    'workspace_member_branches_user_id_idx','workspace_members_custom_role_id_idx',
    'workspace_members_user_id_idx','workspace_roles_created_by_idx',
    'workspace_sessions_workspace_id_idx','workspaces_created_by_idx',
    'workspace_member_branches_workspace_branch_idx'
  )
order by tablename, indexname;

-- Read-only verification checks for VELTRO-PRO workspace isolation.
-- Run after applying the ordered migrations in supabase/migrations/.
-- SQL inspection does not replace the two-account runtime test in SECURITY.md.

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('workspaces', 'workspace_members', 'cloud_records')
order by c.relname;

select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('workspaces', 'workspace_members', 'cloud_records')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('workspaces', 'workspace_members', 'cloud_records')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

select tgname as trigger_name, tgenabled as enabled
from pg_trigger
where tgrelid = 'public.workspaces'::regclass
  and not tgisinternal;

-- Confirm that no member row points to a custom role from another workspace.
select wm.workspace_id, wm.user_id, wm.custom_role_id, wr.workspace_id as role_workspace_id
from public.workspace_members wm
join public.workspace_roles wr on wr.id = wm.custom_role_id
where wr.workspace_id <> wm.workspace_id;

-- Confirm that the two owner-only membership policies contain the workspace-scoped role check.
select policyname, cmd, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'workspace_members'
  and policyname in (
    'Owners can add non-owner workspace members',
    'Owners can update non-owner workspace members'
  )
order by policyname;

-- Confirm that workspace permission helpers use a fixed search_path.
select p.proname, p.prosecdef as security_definer, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('has_workspace_permission', 'is_workspace_member', 'is_workspace_owner')
order by p.proname;

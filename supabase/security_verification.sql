-- Read-only verification checks for VELTRO-PRO workspace isolation.
-- Run after supabase/schema.sql in the Supabase SQL Editor.
-- These checks inspect configuration; the two-account test in SECURITY.md
-- is still required to prove the real deployed behavior.

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

-- Add indexes for foreign-key columns identified by Supabase performance advisors.
-- These indexes support joins and parent-row updates/deletes on workspace-scoped tables.
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

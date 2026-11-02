-- Cover the composite workspace/branch foreign key on branch assignments.
create index if not exists workspace_member_branches_workspace_branch_idx
  on public.workspace_member_branches(workspace_id, branch_id);

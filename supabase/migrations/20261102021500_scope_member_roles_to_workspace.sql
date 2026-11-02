-- Keep custom roles scoped to the same workspace as their member.
-- Prevents assigning a role definition from another workspace.
drop policy if exists "Owners can add non-owner workspace members" on public.workspace_members;
create policy "Owners can add non-owner workspace members"
on public.workspace_members
for insert
to authenticated
with check (
  public.is_workspace_owner(workspace_id)
  and role <> 'owner'
  and (
    custom_role_id is null
    or exists (
      select 1
      from public.workspace_roles wr
      where wr.id = workspace_members.custom_role_id
        and wr.workspace_id = workspace_members.workspace_id
    )
  )
);

drop policy if exists "Owners can update non-owner workspace members" on public.workspace_members;
create policy "Owners can update non-owner workspace members"
on public.workspace_members
for update
to authenticated
using (
  public.is_workspace_owner(workspace_id)
  and role <> 'owner'
)
with check (
  public.is_workspace_owner(workspace_id)
  and role <> 'owner'
  and (
    custom_role_id is null
    or exists (
      select 1
      from public.workspace_roles wr
      where wr.id = workspace_members.custom_role_id
        and wr.workspace_id = workspace_members.workspace_id
    )
  )
);

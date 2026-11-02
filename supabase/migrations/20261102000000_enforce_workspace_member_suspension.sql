-- Enforce workspace-scoped employee suspension in database authorization.
-- This intentionally blocks only status='suspended'; invited members retain the
-- existing invitation/onboarding behavior and owners are not suspended by the UI.

create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and not exists (
        select 1
        from public.employee_profiles ep
        where ep.workspace_id = wm.workspace_id
          and ep.user_id = wm.user_id
          and ep.status = 'suspended'
      )
  );
$function$;

create or replace function private.is_workspace_owner(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.role = 'owner'
      and not exists (
        select 1
        from public.employee_profiles ep
        where ep.workspace_id = wm.workspace_id
          and ep.user_id = wm.user_id
          and ep.status = 'suspended'
      )
  );
$function$;

create or replace function private.has_workspace_permission(target_workspace uuid, requested_permission text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.workspace_members wm
    left join public.workspace_roles wr
      on wr.id = wm.custom_role_id
     and wr.workspace_id = wm.workspace_id
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and not exists (
        select 1
        from public.employee_profiles ep
        where ep.workspace_id = wm.workspace_id
          and ep.user_id = wm.user_id
          and ep.status = 'suspended'
      )
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
$function$;

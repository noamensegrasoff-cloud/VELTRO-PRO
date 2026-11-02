# VELTRO-PRO workspace isolation

## Database setup and migration history

`supabase/schema.sql` is the original foundation script for the three core tables (`workspaces`, `workspace_members`, and `cloud_records`). It is not a complete export of the current production schema. The connected Supabase project also contains later migrations for employee permissions, role helpers, cloud-record permissions, and workspace-scoped custom roles.

Do not treat `schema.sql` alone as a fresh-project restore or rerun it as a replacement for the later migrations. Apply the ordered SQL migrations in `supabase/migrations/` to a fresh project and compare the result with the live project before production use. The repository still needs the earlier migration SQL sources to become a fully reproducible fresh-project bootstrap.

Never put a Supabase `service_role` key or secret key in frontend environment variables. The browser must use only a publishable/anon key and rely on database RLS for authorization.

## Current access model

- RLS is enabled on all inspected public tables.
- Workspace membership and permission checks are scoped to the active workspace.
- `authenticated` currently has SELECT-only access to `workspace_members`; it does not have INSERT or UPDATE table grants. Team membership changes are therefore not available through the browser API yet.
- Owner-only INSERT/UPDATE policies are defined as a future guarded path, and require both the correct owner check and a custom role from the same workspace. They do not take effect until table grants are deliberately enabled.
- A member cannot promote another member to the `owner` role.
- Cloud records require workspace membership and the permission corresponding to the record type and operation.
- The workspace creator is added as owner by a database trigger.

Run `supabase/security_verification.sql` and inspect the results:
- RLS must remain enabled on the core tables.
- `anon` must have no table privileges on the core tables.
- `authenticated` must have only the expected table privileges.
- The workspace creator trigger must be enabled.
- The member INSERT/UPDATE policies must require owner status, disallow assigning the owner role, and require any custom role to belong to the same workspace.

## Required two-account isolation test

Use two different Google accounts in separate browser profiles or incognito sessions. Do not use a service-role key.

1. Sign in as Account A and let the app create its workspace. Add a harmless test record and note A's workspace UUID from the app's workspace row.
2. Sign in as Account B in a separate profile and let it create its workspace. Confirm B has a different workspace UUID.
3. As B, attempt to select a row from `cloud_records` filtered to A's workspace UUID. It must return zero rows, not A's data.
4. As B, attempt to insert a record into A's workspace UUID. PostgreSQL must reject it with an RLS policy error.
5. As B, attempt to insert or update a `workspace_members` row in A's workspace. PostgreSQL must reject it because the client role has no INSERT/UPDATE table grant.
6. Verify that the owner-only policies still include a same-workspace custom-role check before any future membership write grants are enabled.
7. Repeat the read check as A against B's workspace; it must return zero rows.

SQL inspection alone does not replace this runtime test. GitHub Pages build success does not prove that OAuth redirect settings are correct or that two real accounts are isolated in the deployed app.

## Known follow-up checks

- Supabase currently reports leaked-password protection as disabled. Enable it in the Auth security settings before production onboarding.
- Supabase reports the workspace permission helper functions as callable SECURITY DEFINER functions. Their current definitions use an empty search path and check `auth.uid()` plus workspace membership; retain these safeguards and review the functions before changing grants.
- Performance advisors report unindexed foreign keys and overlapping permissive SELECT policies. Review these before increasing workspace or employee counts; do not remove policies or indexes solely because the current low-volume project has not used them yet.

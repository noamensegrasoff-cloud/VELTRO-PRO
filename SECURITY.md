# VELTRO-PRO workspace isolation

## Database setup and migration history

`supabase/schema.sql` is only the original foundation script for `workspaces`, `workspace_members`, and `cloud_records`. It is not a complete export of the live database.

The connected Supabase project reports these six applied migrations:

- `20261023235105_remove_duplicate_workspace_owner_trigger`
- `20261023235125_restrict_rls_auto_enable_function`
- `20261024235401_employee_permissions_system`
- `20261024235417_restrict_employee_permission_helpers`
- `20261024235638_enforce_cloud_record_permissions`
- `20261102021329_scope_member_roles_to_workspace`

Only the last of those six source files is currently present in `supabase/migrations/`. The earlier five migration sources are missing from GitHub. Therefore, a fresh project cannot currently be rebuilt reliably from this repository. Do not treat `schema.sql` plus the remaining migration as a complete bootstrap. The missing migration sources must be recovered or a verified full schema snapshot must be committed before creating another production project.

A further repair migration, `20261102023000_harden_workspace_permissions.sql`, has been added on the maintenance branch. **It has not been applied to the connected Supabase project.** Review it and apply it deliberately after confirming the migration history.

Never put a Supabase `service_role` key or secret key in frontend environment variables. The browser must use only a publishable/anon key and rely on database RLS for authorization.

## Findings in the connected Supabase project

- RLS is enabled on the inspected public tables.
- Core workspace tables have the expected RLS policies.
- `authenticated` has SELECT-only access to `workspace_members`; its INSERT/UPDATE/DELETE policies are therefore not usable through the browser API.
- The employee, custom-role, branch, session, approval, and audit tables also lack the authenticated table grants required by their policies. `role_permission_templates` has a SELECT policy but no authenticated SELECT grant.
- The additional employee-related tables have unnecessary `TRUNCATE` privileges for `anon` (and some for `authenticated`). The pending repair migration revokes these privileges and grants only operations covered by RLS policies.
- The current `required_workspace_permission(entity_type, operation)` mapper does not recognize the application's actual `sales_invoices`, `purchase_receipts`, `product_movements`, or `local_storage` record types. Non-owner employees can therefore be blocked from syncing those records. The pending migration maps those types and legacy storage keys to their corresponding permissions.
- The current permission helper combines a member's built-in role template with custom-role permissions. A custom role therefore cannot restrict permissions inherited from the built-in role. The pending migration makes an assigned custom role an explicit replacement permission set.
- Security-definer permission helpers currently live in the API-exposed `public` schema. The pending migration moves them to a non-exposed `private` schema and updates RLS policies to use them.
- The audit log ID has no default, so inserts fail unless a client supplies an ID. The pending migration adds an identity default.
- Branch assignments currently lack composite foreign keys ensuring that the assigned branch and member belong to the same workspace. The pending migration adds those constraints.
- The pending migration also adds indexes for unindexed foreign keys and splits overlapping owner/SELECT policies.

Run `supabase/security_verification.sql` after applying the full migration chain and the pending repair migration. The verification file is read-only; its results must be reviewed rather than treated as automatic proof of security.

## Required two-account isolation test

Use two different Google accounts in separate browser profiles or incognito sessions. Do not use a service-role key.

1. Sign in as Account A and let the app create its workspace. Add a harmless test record and note A's workspace UUID.
2. Sign in as Account B in a separate profile and let it create its workspace. Confirm B has a different workspace UUID.
3. As B, attempt to select a row from `cloud_records` filtered to A's workspace UUID. It must return zero rows, not A's data.
4. As B, attempt to insert a record into A's workspace UUID. PostgreSQL must reject it with an RLS policy error.
5. After the permission repair migration is applied, verify B can access only the employee and workspace records permitted by B's role; verify B cannot manage members or roles unless explicitly authorized.
6. Repeat the read check as A against B's workspace; it must return zero rows.

SQL inspection alone does not replace this runtime test. GitHub Pages build success does not prove that OAuth redirects or two real accounts are isolated in the deployed app.

## Manual production setting

Supabase currently reports leaked-password protection as disabled. Enable it in the Auth security settings before public onboarding.

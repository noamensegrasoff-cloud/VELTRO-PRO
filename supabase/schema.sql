# VELTRO-PRO workspace isolation and security status

## Database bootstrap and migration history

`supabase/schema.sql` is only the original foundation script for `workspaces`, `workspace_members`, and `cloud_records`. It is not a full export of the live schema.

The connected Supabase project currently reports nine applied migrations:

- `20261023235105_remove_duplicate_workspace_owner_trigger`
- `20261023235125_restrict_rls_auto_enable_function`
- `20261024235401_employee_permissions_system`
- `20261024235417_restrict_employee_permission_helpers`
- `20261024235638_enforce_cloud_record_permissions`
- `20261102021329_scope_member_roles_to_workspace`
- `20261102022438_index_uncovered_workspace_foreign_keys`
- `20261102022741_harden_workspace_permissions`
- `20261102022816_index_workspace_branch_assignments`

The repository contains the last four migration sources in `supabase/migrations/`. The first five source files are still missing from GitHub, so a fresh Supabase project cannot yet be reconstructed reliably from this repository. Recover those five sources or commit a verified full schema snapshot before creating another production project. Do not treat `schema.sql` alone as a production restore.

Never put a Supabase `service_role` key or secret key in frontend environment variables. The browser must use only the publishable/anon key and rely on database RLS for authorization.

## Verified live database state

- RLS is enabled on all 11 inspected public tables.
- `anon` has no TRUNCATE privilege on the inspected public tables; `authenticated` has no TRUNCATE privilege either.
- Workspace permission helpers now live in the non-exposed `private` schema, use an empty search path, and check `auth.uid()` and workspace membership.
- The public `required_workspace_permission(entity_type, operation, record_id)` mapper now recognizes the record types written by the application, including `sales_invoices`, `purchase_receipts`, `product_movements`, and legacy `local_storage` keys.
- An assigned custom role is now an explicit permission set; it no longer silently inherits permissions from the built-in role template.
- Workspace member insert/update/delete policies are owner-only, disallow owner-role promotion, and require custom roles to belong to the same workspace. The corresponding authenticated table grants are now present and remain constrained by RLS.
- Branch assignments now use composite foreign keys so a branch and member must belong to the same workspace. Pre-migration checks found no existing invalid branch or custom-role workspace links.
- Foreign-key support indexes are present, including the composite branch-assignment index.
- Owner write policies were split from read policies to remove the previous overlapping permissive-policy warnings.
- `workspace_audit_logs.id` was already an identity column; no identity alteration was needed.

## Remaining security and data-integrity follow-ups

- Supabase still reports leaked-password protection as disabled. Enable it in Auth security settings before public onboarding.
- The performance advisor may report unused indexes because this workspace currently has low query volume. Do not remove the new foreign-key indexes without reviewing query plans.
- Run the two-account isolation test below after any RLS, grant, or permission-mapping change.
- Legacy business data still includes whole-key localStorage snapshots. If two devices modify the same legacy array/object between syncs, the current sync path is last-writer-wins. Move remaining customer, supplier, and payment records to per-record cloud entities or an atomic server-side merge before relying on simultaneous multi-device edits.
- Employee UI pages and permission-aware navigation are not yet implemented. In particular, cashier POS stock updates need a dedicated stock-only server operation: the cashier role should be able to decrement stock as part of a sale without gaining unrestricted product-edit or manual inventory-adjust permissions.
- The repository still has no committed `package-lock.json` and no unit-test script. The CI workflow currently verifies dependency installation and the Vite production build only.

## Required two-account isolation test

Use two different Google accounts in separate browser profiles or incognito sessions. Do not use a service-role key.

1. Sign in as Account A and let the app create its workspace. Add a harmless test record and note A's workspace UUID.
2. Sign in as Account B in a separate profile and let it create its workspace. Confirm B has a different workspace UUID.
3. As B, attempt to select a row from `cloud_records` filtered to A's workspace UUID. It must return zero rows, not A's data.
4. As B, attempt to insert a record into A's workspace UUID. PostgreSQL must reject it with an RLS policy error.
5. As B, attempt to add, update, or delete a member or role in A's workspace. PostgreSQL must reject it.
6. As A, confirm that assigning a custom role from B's workspace is rejected.
7. Repeat the read check as A against B's workspace; it must return zero rows.

SQL inspection and CI build success do not replace this runtime test. GitHub Pages deployment and Android deep-link/OAuth flows also require separate end-to-end checks.

## Branch and deployment status

The code changes are on `maintenance/full-audit-cleanup`. They have not been merged into `main`, so the public GitHub Pages deployment has not been updated by this audit.

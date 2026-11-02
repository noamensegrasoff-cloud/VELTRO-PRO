# VELTRO-PRO workspace isolation

## Database setup and migration history

`supabase/schema.sql` is only the original foundation script for `workspaces`, `workspace_members`, and `cloud_records`. It is not a complete export of the live database.

The connected Supabase project reports ten applied migrations:

- `20261023235105_remove_duplicate_workspace_owner_trigger`
- `20261023235125_restrict_rls_auto_enable_function`
- `20261024235401_employee_permissions_system`
- `20261024235417_restrict_employee_permission_helpers`
- `20261024235638_enforce_cloud_record_permissions`
- `20261102021329_scope_member_roles_to_workspace`
- `20261102022438_index_uncovered_workspace_foreign_keys`
- `20261102022741_harden_workspace_permissions`
- `20261102022816_index_workspace_branch_assignments`
- `20261102113103_reconcile_permission_rules`

The repository contains source files for the last four migrations. The first five historical migration sources are missing from GitHub. A fresh project therefore cannot currently be rebuilt reliably from this repository. Do not treat `schema.sql` plus the committed migrations as a complete bootstrap. Recover the missing migration sources or commit a verified full schema snapshot before creating another production project.

The reconciliation migration `20261102113103_reconcile_permission_rules.sql` has been applied to the connected Supabase project and is recorded in migration history. It reconciles the live permission mapper and employee-profile policies with the finalized source. The live verification confirms customer transaction reads map to `customers.debts.view`, expense writes map to `cash.expense.create`, and employee-profile writes use `employees.manage`.

Never put a Supabase `service_role` key or secret key in frontend environment variables. The browser must use only a publishable/anon key and rely on database RLS for authorization.

## Current connected Supabase findings

- RLS is enabled on the inspected workspace tables.
- `authenticated` has the table privileges required by the current RLS policies. `anon` has no protected-table TRUNCATE privilege.
- The three SECURITY DEFINER permission helpers are in the non-exposed `private` schema, use an empty search path, and are executable by authenticated users only for policy evaluation.
- Custom role permissions replace the built-in role template rather than silently inheriting it.
- Cloud-record permission mapping correctly recognizes `sales_invoices`, `purchase_receipts`, `product_movements`, and the legacy `local_storage` record type.
- The live database has composite foreign keys preventing branch assignments from crossing workspace/member boundaries.
- The audit-log ID is an identity column.
- The reconciliation migration has removed the previously observed permission-mapping drift: customer transaction reads map to `customers.debts.view`, expense writes map to `cash.expense.create`, and employee-profile writes use `employees.manage`.
- The database has employee, custom-role, branch, session, and approval tables, but the frontend has no implemented employee/role/permission screens or role-based navigation/feature gating. The `users-roles`, `permissions`, `devices-branches`, and most other unfinished navigation items currently fall through to a generic “not linked” module page.
- Business onboarding is stored in each authenticated user's `user_metadata.business_profile`, not on the workspace. An employee account without that metadata is still sent through store onboarding, so the multi-user workspace flow is not ready for production employees.
- The reconciliation migration makes customer transaction history require `customers.debts.view`. The POS currently displays the old-customer-debt card without frontend permission gating. Before applying this migration, decide whether cashiers should receive `customers.debts.view` or whether that debt card should be hidden for roles without it; otherwise their debt total may be incomplete.
- Supabase's current security advisor reports one remaining warning: leaked-password protection is disabled. Enable it in Auth security settings before public onboarding.
- The performance advisor now reports unused indexes, not missing foreign-key indexes. These indexes were recently added to support workspace joins; do not remove them based only on the current low-volume usage statistics.

Run `supabase/security_verification.sql` against the connected project to independently verify the current migration chain and policies. The verification file is read-only; review its output rather than treating it as automatic proof of security.

## Client-side isolation and sync fixes on the maintenance branch

The maintenance branch now also:

- Resolves a user's existing `workspace_members` membership before creating a workspace. This prevents employee accounts from silently receiving a separate empty workspace.
- Keys local business-data snapshots by both authenticated user ID and workspace ID. Product catalogs and conflict archives are included in those snapshots even though they are excluded from generic legacy-storage sync.
- Blocks the authenticated UI until the correct account/workspace snapshot has been restored. If the device is offline during an account switch, the app does not reveal the previous account's cached data.
- Filters the IndexedDB outbox by its original workspace so pending changes cannot be uploaded into another workspace.
- Continues syncing permitted records when an employee is denied access to an unrelated legacy-storage key.
- Downloads all permitted entity types in paginated batches instead of issuing one request per entity type.
- Refreshes open product, stock movement, POS, and purchase screens when cloud sync updates local data.
- Matches customer/supplier ledgers by ID before falling back to names, and deduplicates legacy invoice copies before calculating balances.

These client-side changes are in GitHub on `maintenance/full-audit-cleanup`; they have not been merged into `main`.

## Required two-account isolation test

Use two different Google accounts in separate browser profiles or incognito sessions. Do not use a service-role key.

1. Sign in as Account A and let the app create its workspace. Add a harmless test record and note A's workspace UUID.
2. Sign in as Account B in a separate profile and let it create its workspace. Confirm B has a different workspace UUID.
3. As B, attempt to select a row from `cloud_records` filtered to A's workspace UUID. It must return zero rows, not A's data.
4. As B, attempt to insert a record into A's workspace UUID. PostgreSQL must reject it with an RLS policy error.
5. After the reconciliation migration is applied, verify B can access only the employee and workspace records permitted by B's role; verify B cannot manage members or roles unless explicitly authorized.
6. Repeat the read check as A against B's workspace; it must return zero rows.

SQL inspection alone does not replace this runtime test. GitHub Pages build success does not prove that OAuth redirects or two real accounts are isolated in the deployed app.

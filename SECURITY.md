# VELTRO-PRO workspace isolation

## Database migration

Run the complete `supabase/schema.sql` script in the SQL Editor of the Supabase project used by the deployed app. The script enables row-level security (RLS), restricts cloud records to authenticated workspace members, prevents browser clients from writing membership rows, and adds the creator as owner through a database trigger. Never put a Supabase `service_role` key in frontend environment variables.

Then run `supabase/security_verification.sql` and inspect the results:
- RLS must be enabled for `workspaces`, `workspace_members`, and `cloud_records`.
- `anon` must have no table privileges for these tables.
- `authenticated` must have SELECT/INSERT on workspaces, SELECT on memberships, and SELECT/INSERT/UPDATE on cloud records.
- The `workspaces_add_creator_owner` trigger must be enabled.
- There must be no client INSERT policy for `workspace_members`.

## Required two-account isolation test

Use two different Google accounts in separate browser profiles or incognito sessions. Do not use a service-role key.

1. Sign in as Account A and let the app create its workspace. Add a harmless test record and note A's workspace UUID from the app's workspace row.
2. Sign in as Account B in a separate profile and let it create its workspace. Confirm B has a different workspace UUID.
3. As B, attempt to select a row from `cloud_records` filtered to A's workspace UUID. It must return zero rows, not A's data.
4. As B, attempt to insert a record into A's workspace UUID. PostgreSQL must reject it with an RLS policy error.
5. As B, attempt to insert a `workspace_members` row naming B as a member of A's workspace. PostgreSQL must reject it (no client INSERT grant/policy).
6. Repeat the read check as A against B's workspace; it must return zero rows.

The SQL inspection query alone does not replace this runtime test. GitHub Pages build success does not prove that the production Supabase project has run the migration or that OAuth redirect settings are correct.

## Scope

This schema currently supports isolated workspaces and their owner. Client-side team invitations are intentionally not granted by this migration; implement invitations through a separately authorized server-side flow before allowing additional members. App sections still marked as design/sample data are not made production-ready by this security migration.

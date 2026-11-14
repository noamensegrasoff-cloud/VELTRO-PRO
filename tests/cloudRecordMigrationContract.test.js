import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261113082500_require_cloud_record_sync_operation_id.sql', import.meta.url),
  'utf8',
);
const normalized = migration.replace(/\s+/g, ' ');

test('cloud CAS migration rejects blank operation IDs before taking locks or mutating records', () => {
  const validation = normalized.indexOf("nullif(pg_catalog.btrim(p_operation_id), '') is null");
  const lock = normalized.indexOf('pg_catalog.pg_advisory_xact_lock');
  const mutation = normalized.indexOf('update public.cloud_records');

  assert.notEqual(validation, -1, 'the RPC must reject null, empty, and whitespace-only operation IDs');
  assert.notEqual(lock, -1, 'the RPC must serialize reuse of an operation ID within a workspace');
  assert.notEqual(mutation, -1, 'the migration must retain the CAS update path');
  assert.ok(validation < lock, 'validation must happen before acquiring the operation lock');
  assert.ok(lock < mutation, 'the operation lock must be acquired before any mutation');
});

test('cloud CAS migration returns a replay only for the same workspace operation and record', () => {
  assert.match(normalized, /current_row\.workspace_id = p_workspace_id and current_row\.last_operation_id = v_operation_id/);
  assert.match(normalized, /v_row\.entity_type is distinct from p_entity_type or v_row\.record_id is distinct from p_record_id/);
  assert.match(normalized, /using errcode = '23505'/);
});

test('cloud CAS migration preserves invoker security and authenticated-only execution', () => {
  assert.match(normalized, /security invoker/);
  assert.match(normalized, /revoke all on function public\.sync_cloud_record_cas\([^;]+ from public, anon/);
  assert.match(normalized, /grant execute on function public\.sync_cloud_record_cas\([^;]+ to authenticated/);
});

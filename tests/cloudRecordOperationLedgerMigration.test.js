import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261114095000_add_cloud_record_sync_operation_ledger.sql', import.meta.url),
  'utf8',
);
const normalized = migration.replace(/\s+/g, ' ');

test('cloud operation ledger is append-only, workspace-scoped, and protected by RLS', () => {
  assert.match(normalized, /create table if not exists public\.cloud_record_sync_operations/);
  assert.match(normalized, /primary key \(workspace_id, operation_id\)/);
  assert.match(normalized, /alter table public\.cloud_record_sync_operations enable row level security/);
  assert.match(normalized, /grant select, insert on table public\.cloud_record_sync_operations to authenticated/);
  assert.match(normalized, /private\.is_workspace_member\(workspace_id\)/);
  assert.match(normalized, /private\.has_workspace_permission\(/);
  assert.match(normalized, /required_workspace_permission\(entity_type, 'insert', record_id\)/);
  assert.match(normalized, /required_workspace_permission\(entity_type, 'update', record_id\)/);
  assert.match(normalized, /synced_record\.last_operation_id = cloud_record_sync_operations\.operation_id/);
  assert.match(normalized, /pg_catalog\.to_jsonb\(synced_record\) = cloud_record_sync_operations\.record_data/);
  assert.doesNotMatch(normalized, /grant [^;]*(update|delete)[^;]*cloud_record_sync_operations/i);
});

test('cloud CAS checks the durable operation receipt before inspecting or mutating the current row', () => {
  const ledgerLookup = normalized.indexOf('from public.cloud_record_sync_operations as prior_operation');
  const cloudLookup = normalized.indexOf('from public.cloud_records as current_row');
  const cloudMutation = normalized.indexOf('update public.cloud_records as current_row');
  const ledgerInsert = normalized.indexOf('insert into public.cloud_record_sync_operations (');

  assert.notEqual(ledgerLookup, -1);
  assert.notEqual(cloudLookup, -1);
  assert.notEqual(cloudMutation, -1);
  assert.notEqual(ledgerInsert, -1);
  assert.ok(ledgerLookup < cloudLookup, 'replays must be resolved before a new CAS attempt');
  assert.ok(cloudMutation < ledgerInsert, 'the receipt is recorded only after the cloud mutation succeeds');
});

test('cloud CAS rejects cross-record key reuse and request changes under one operation ID', () => {
  assert.match(normalized, /v_operation\.entity_type is distinct from p_entity_type/);
  assert.match(normalized, /v_operation\.record_id is distinct from p_record_id/);
  assert.match(normalized, /v_operation\.request_signature is distinct from v_request_signature/);
  assert.match(normalized, /using errcode = '23505'/);
  assert.match(normalized, /using errcode = '22023'/);
});

test('cloud CAS stores the original acknowledged row for delayed retries after later writes', () => {
  assert.match(normalized, /record_data jsonb not null/);
  assert.match(normalized, /return query select 'synced'::text, v_operation\.record_data/);
  assert.match(normalized, /pg_catalog\.to_jsonb\(v_row\)/);
  assert.match(normalized, /pg_catalog\.pg_advisory_xact_lock/);
});

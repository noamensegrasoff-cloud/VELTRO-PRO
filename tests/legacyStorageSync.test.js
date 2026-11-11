import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_STORAGE_OPERATION_IDS_KEY,
  classifyLegacyStorageChange,
  clearLegacyStorageOperationId,
  getStableLegacyStorageOperationId,
} from '../src/services/legacyStorageSync.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test('legacy sync operation IDs remain stable for the same key and value', () => {
  const storage = createStorage();
  const first = getStableLegacyStorageOperationId('settings', '{"tax":5}', storage);
  const retry = getStableLegacyStorageOperationId('settings', '{"tax":5}', storage);
  assert.equal(retry, first);
});

test('legacy sync allocates a new operation ID when the local value changes', () => {
  const storage = createStorage();
  const first = getStableLegacyStorageOperationId('settings', '{"tax":5}', storage);
  const next = getStableLegacyStorageOperationId('settings', '{"tax":7}', storage);
  assert.notEqual(next, first);
});

test('legacy deletion has its own stable operation identity', () => {
  const storage = createStorage();
  const first = getStableLegacyStorageOperationId('settings', null, storage);
  const retry = getStableLegacyStorageOperationId('settings', null, storage);
  const restored = getStableLegacyStorageOperationId('settings', 'value', storage);
  assert.equal(retry, first);
  assert.notEqual(restored, first);
});

test('clearing an acknowledged legacy operation allows a fresh operation ID', () => {
  const storage = createStorage();
  const first = getStableLegacyStorageOperationId('settings', 'value', storage);
  clearLegacyStorageOperationId('settings', storage);
  assert.equal(storage.getItem(LEGACY_STORAGE_OPERATION_IDS_KEY), null);
  const next = getStableLegacyStorageOperationId('settings', 'value', storage);
  assert.notEqual(next, first);
});

test('legacy sync refuses to send a write when idempotency state cannot be persisted', () => {
  const storage = {
    getItem() { return null; },
    setItem() { throw new Error('quota exceeded'); },
    removeItem() {},
  };
  assert.throws(
    () => getStableLegacyStorageOperationId('settings', 'value', storage),
    /quota exceeded/,
  );
});

test('legacy sync refuses to silently replace corrupt idempotency state', () => {
  const storage = createStorage();
  storage.setItem(LEGACY_STORAGE_OPERATION_IDS_KEY, '{broken');
  assert.throws(
    () => getStableLegacyStorageOperationId('settings', 'value', storage),
    /corrupt/,
  );
});

test('new devices adopt existing cloud values instead of uploading local defaults', () => {
  assert.equal(classifyLegacyStorageChange({
    localValue: 'default',
    baselineValue: undefined,
    remoteValue: 'cloud',
    baselineExists: false,
    rowExists: true,
  }), 'adopt_remote');
});

test('legacy local-only edits are queued for upload', () => {
  assert.equal(classifyLegacyStorageChange({
    localValue: 'local-new',
    baselineValue: 'same',
    remoteValue: 'same',
    baselineExists: true,
    rowExists: true,
  }), 'push_local');
});

test('legacy remote-only edits are pulled locally', () => {
  assert.equal(classifyLegacyStorageChange({
    localValue: 'same',
    baselineValue: 'same',
    remoteValue: 'remote-new',
    baselineExists: true,
    rowExists: true,
  }), 'pull_remote');
});

test('concurrent legacy local and cloud edits surface a conflict', () => {
  assert.equal(classifyLegacyStorageChange({
    localValue: 'local-new',
    baselineValue: 'same',
    remoteValue: 'remote-new',
    baselineExists: true,
    rowExists: true,
  }), 'conflict');
});

test('converged legacy edits update the baseline without another write', () => {
  assert.equal(classifyLegacyStorageChange({
    localValue: 'same-new',
    baselineValue: 'same',
    remoteValue: 'same-new',
    baselineExists: true,
    rowExists: true,
  }), 'converged');
});

test('legacy tombstones are pulled when the local copy has not changed', () => {
  assert.equal(classifyLegacyStorageChange({
    localValue: 'same',
    baselineValue: 'same',
    remoteValue: null,
    baselineExists: true,
    rowExists: true,
  }), 'pull_remote');
});

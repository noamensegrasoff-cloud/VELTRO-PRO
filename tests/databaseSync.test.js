import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSyncCompletionResult, processPendingSyncOperations, syncLegacyLocalStorage } from '../src/services/databaseSync.js';

test('reports synced only when the workspace outbox is empty', () => {
  assert.deepEqual(
    buildSyncCompletionResult([], { pushed: 2, pulled: 3, workspaceId: 'workspace-a' }),
    { status: 'synced', pushed: 2, pulled: 3, workspaceId: 'workspace-a', pending: 0 },
  );
});

test('keeps sync pending when a local edit was queued during an earlier upload', () => {
  assert.deepEqual(
    buildSyncCompletionResult([{ operationId: 'newer-edit' }], {
      pushed: 1,
      pulled: 0,
      workspaceId: 'workspace-a',
    }),
    { status: 'pending', pushed: 1, pulled: 0, workspaceId: 'workspace-a', pending: 1 },
  );
});

test('reports the number of unacknowledged operations instead of a false success', () => {
  assert.deepEqual(
    buildSyncCompletionResult([
      { operationId: 'operation-a' },
      { operationId: 'operation-b' },
    ], { workspaceId: 'workspace-b' }),
    { status: 'pending', pushed: 0, pulled: 0, workspaceId: 'workspace-b', pending: 2 },
  );
});

test('keeps a legacy or record conflict visible without hiding the remaining outbox count', () => {
  assert.deepEqual(
    buildSyncCompletionResult([{ operationId: 'conflicted-operation' }], {
      pushed: 1,
      pulled: 2,
      workspaceId: 'workspace-a',
      conflicts: [{ entityType: 'products', recordId: 'product-a', operation: 'upsert' }],
    }),
    {
      status: 'conflict',
      pushed: 1,
      pulled: 2,
      workspaceId: 'workspace-a',
      pending: 1,
      conflicts: [{ entityType: 'products', recordId: 'product-a', operation: 'upsert' }],
      conflict: { entityType: 'products', recordId: 'product-a', operation: 'upsert' },
    },
  );
});

test('continues uploading unrelated outbox records after one CAS conflict', async () => {
  const uploaded = [];
  const acknowledged = [];
  const result = await processPendingSyncOperations([
    {
      id: 'a',
      recordKey: 'workspace-a::products::a',
      entityType: 'products',
      recordId: 'a',
      operation: 'upsert',
      operationId: 'operation-a',
    },
    {
      id: 'b',
      recordKey: 'workspace-a::products::b',
      entityType: 'products',
      recordId: 'b',
      operation: 'upsert',
      operationId: 'operation-b',
    },
  ], {
    workspaceId: 'workspace-a',
    uploadOperation: async operation => {
      uploaded.push(operation.recordId);
      if (operation.recordId === 'a') {
        const error = new Error('CAS conflict');
        error.code = 'SYNC_CONFLICT';
        throw error;
      }
      return { updated_at: '2026-11-20T08:00:00.000Z' };
    },
    acknowledgeOperation: async operation => {
      acknowledged.push(operation.recordId);
    },
  });

  assert.deepEqual(uploaded, ['a', 'b']);
  assert.deepEqual(acknowledged, ['b']);
  assert.equal(result.status, 'complete');
  assert.deepEqual([...result.pendingKeys], ['workspace-a::products::a']);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].operationId, 'operation-a');
});

test('stops the outbox pass on a transport error and leaves all unacknowledged keys pending', async () => {
  const uploaded = [];
  const result = await processPendingSyncOperations([
    { recordKey: 'workspace-a::products::a', entityType: 'products', recordId: 'a', operation: 'upsert' },
    { recordKey: 'workspace-a::products::b', entityType: 'products', recordId: 'b', operation: 'upsert' },
  ], {
    workspaceId: 'workspace-a',
    uploadOperation: async operation => {
      uploaded.push(operation.recordId);
      throw new Error('network unavailable');
    },
    acknowledgeOperation: async () => {},
  });

  assert.equal(result.status, 'partial');
  assert.deepEqual(uploaded, ['a']);
  assert.deepEqual([...result.pendingKeys], [
    'workspace-a::products::a',
    'workspace-a::products::b',
  ]);
});


function createLegacyStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test('legacy sync continues independent keys after both detected and upload-time conflicts', async () => {
  const baselineKey = 'veltro.cloud-sync.local-storage-baseline.v1';
  const baseline = {
    'veltro.conflict': 'old-conflict',
    'veltro.race': 'old-race',
    'veltro.push': 'old-push',
    'veltro.pull': 'old-pull',
  };
  const storage = createLegacyStorage({
    [baselineKey]: JSON.stringify(baseline),
    'veltro.conflict': 'local-conflict',
    'veltro.race': 'local-race',
    'veltro.push': 'local-push',
    'veltro.pull': 'old-pull',
  });
  const cloudRows = [
    { record_id: 'veltro.conflict', payload: { value: 'remote-conflict' }, updated_at: '2026-11-23T08:00:00.000Z' },
    { record_id: 'veltro.race', payload: { value: 'old-race' }, updated_at: '2026-11-23T08:00:01.000Z' },
    { record_id: 'veltro.push', payload: { value: 'old-push' }, updated_at: '2026-11-23T08:00:02.000Z' },
    { record_id: 'veltro.pull', payload: { value: 'remote-pull' }, updated_at: '2026-11-23T08:00:03.000Z' },
  ];
  const attemptedWrites = [];

  const result = await syncLegacyLocalStorage('workspace-legacy-test', {
    storage,
    getCloudRecords: async () => cloudRows,
    saveCloudRecord: async input => {
      attemptedWrites.push(input.recordId);
      if (input.recordId === 'veltro.race') {
        const error = new Error('Cloud record changed during upload.');
        error.code = 'SYNC_CONFLICT';
        throw error;
      }
      return { updated_at: '2026-11-23T08:01:00.000Z' };
    },
    deleteCloudRecord: async () => ({ updated_at: '2026-11-23T08:01:00.000Z' }),
    getStableLegacyStorageOperationId: key => `operation-${key}`,
    clearLegacyStorageOperationId: () => {},
  });

  assert.deepEqual(attemptedWrites, ['veltro.race', 'veltro.push']);
  assert.equal(result.pushed, 1);
  assert.equal(result.pulled, 1);
  assert.deepEqual(result.conflicts.map(item => [item.recordId, item.reason]), [
    ['veltro.conflict', 'both_sides_changed'],
    ['veltro.race', 'cloud_changed_during_upload'],
  ]);
  assert.equal(storage.getItem('veltro.conflict'), 'local-conflict');
  assert.equal(storage.getItem('veltro.race'), 'local-race');
  assert.equal(storage.getItem('veltro.pull'), 'remote-pull');
  assert.deepEqual(JSON.parse(storage.getItem(baselineKey)), {
    ...baseline,
    'veltro.push': 'local-push',
    'veltro.pull': 'remote-pull',
  });
});

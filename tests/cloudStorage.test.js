import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteCloudRecord, saveCloudRecord } from '../src/services/cloudStorage.js';

test('cloud upserts reject a missing idempotency key before network access', async () => {
  await assert.rejects(
    saveCloudRecord({
      workspaceId: 'workspace-test',
      entityType: 'products',
      recordId: 'product-test',
      payload: { stock: 3 },
    }),
    error => error?.code === 'SYNC_IDEMPOTENCY_REQUIRED',
  );
});

test('cloud deletes reject a missing idempotency key before network access', async () => {
  await assert.rejects(
    deleteCloudRecord({
      workspaceId: 'workspace-test',
      entityType: 'products',
      recordId: 'product-test',
    }),
    error => error?.code === 'SYNC_IDEMPOTENCY_REQUIRED',
  );
});

test('cloud writes reject whitespace-only idempotency keys', async () => {
  await assert.rejects(
    saveCloudRecord({
      workspaceId: 'workspace-test',
      entityType: 'products',
      recordId: 'product-test',
      payload: { stock: 3 },
      operationId: '   ',
    }),
    error => error?.code === 'SYNC_IDEMPOTENCY_REQUIRED',
  );
});

import { getCloudRecordsByIds } from '../src/services/cloudStorage.js';

test('conflict snapshot lookup validates its workspace and entity scope', async () => {
  await assert.rejects(
    getCloudRecordsByIds({ entityType: 'products', recordIds: ['product-a'] }),
    /workspaceId and entityType are required/,
  );
});

test('conflict snapshot lookup does not issue a cloud request for an empty ID set', async () => {
  assert.deepEqual(
    await getCloudRecordsByIds({ workspaceId: 'workspace-test', entityType: 'products', recordIds: [] }),
    [],
  );
});

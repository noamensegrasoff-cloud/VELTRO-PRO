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

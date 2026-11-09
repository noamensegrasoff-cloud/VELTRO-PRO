import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLocalRecord,
  listPendingSyncOperations,
  markLocalRecordSynced,
  removePendingSyncOperation,
  saveLocalRecordsAtomically,
} from '../src/services/localDatabase.js';

test('purchase receipt, product, and source movement share one durable outbox batch', async () => {
  const workspaceId = 'workspace-atomic-test';
  const movementId = 'purchase:receipt-atomic:line:line-atomic';

  await saveLocalRecordsAtomically({
    workspaceId,
    upserts: [
      { entityType: 'purchases', recordId: 'receipt-atomic', payload: { id: 'receipt-atomic' } },
      { entityType: 'products', recordId: 'product-atomic', payload: { id: 'product-atomic', stock: 7 } },
      { entityType: 'stock_movements', recordId: movementId, payload: { id: movementId, quantity: 7 } },
    ],
  });

  const records = await Promise.all([
    getLocalRecord({ workspaceId, entityType: 'purchases', recordId: 'receipt-atomic' }),
    getLocalRecord({ workspaceId, entityType: 'products', recordId: 'product-atomic' }),
    getLocalRecord({ workspaceId, entityType: 'stock_movements', recordId: movementId }),
  ]);
  assert.ok(records.every(record => record?.syncState === 'pending'));

  const firstRead = await listPendingSyncOperations();
  const retryRead = await listPendingSyncOperations();
  const relevant = firstRead.filter(operation => operation.workspaceId === workspaceId);
  const retried = retryRead.filter(operation => operation.workspaceId === workspaceId);
  assert.equal(relevant.length, 3);
  assert.equal(new Set(relevant.map(operation => operation.operationId)).size, 3);
  assert.deepEqual(
    retried.map(operation => [operation.recordKey, operation.operationId]).sort(),
    relevant.map(operation => [operation.recordKey, operation.operationId]).sort(),
  );
});

test('receipt and movement tombstones replace queued upserts without duplicate outbox rows', async () => {
  const workspaceId = 'workspace-atomic-delete-test';
  const movementId = 'purchase:receipt-delete:line:line-delete';

  await saveLocalRecordsAtomically({
    workspaceId,
    upserts: [
      { entityType: 'purchases', recordId: 'receipt-delete', payload: { id: 'receipt-delete' } },
      { entityType: 'stock_movements', recordId: movementId, payload: { id: movementId, quantity: 3 } },
    ],
  });
  await saveLocalRecordsAtomically({
    workspaceId,
    deletes: [
      { entityType: 'purchases', recordId: 'receipt-delete' },
      { entityType: 'stock_movements', recordId: movementId },
    ],
  });

  const pending = (await listPendingSyncOperations()).filter(operation => operation.workspaceId === workspaceId);
  assert.equal(pending.length, 2);
  assert.ok(pending.every(operation => operation.operation === 'delete'));
  assert.equal(new Set(pending.map(operation => operation.recordKey)).size, 2);

  const receipt = await getLocalRecord({ workspaceId, entityType: 'purchases', recordId: 'receipt-delete' });
  const movement = await getLocalRecord({ workspaceId, entityType: 'stock_movements', recordId: movementId });
  assert.ok(receipt.deletedAt);
  assert.ok(movement.deletedAt);
  assert.equal(receipt.syncState, 'pending');
  assert.equal(movement.syncState, 'pending');
});


test('late cloud acknowledgement cannot clear a newer outbox operation with the same timestamp', async () => {
  const workspaceId = 'workspace-ack-race-test';
  const recordId = 'product-ack-race';
  const sameTimestamp = '2026-11-09T09:00:00.000Z';

  await saveLocalRecordsAtomically({
    workspaceId,
    upserts: [{
      entityType: 'products',
      recordId,
      payload: { id: recordId, stock: 5 },
      updatedAt: sameTimestamp,
    }],
  });
  const firstOperation = (await listPendingSyncOperations())
    .find(operation => operation.workspaceId === workspaceId);

  await saveLocalRecordsAtomically({
    workspaceId,
    upserts: [{
      entityType: 'products',
      recordId,
      payload: { id: recordId, stock: 9 },
      updatedAt: sameTimestamp,
    }],
  });
  const secondOperation = (await listPendingSyncOperations())
    .find(operation => operation.workspaceId === workspaceId);

  assert.ok(firstOperation);
  assert.ok(secondOperation);
  assert.equal(firstOperation.updatedAt, secondOperation.updatedAt);
  assert.notEqual(firstOperation.operationId, secondOperation.operationId);

  const firstCloudVersion = '2026-11-09T09:01:00.000Z';
  await markLocalRecordSynced(
    firstOperation.recordKey,
    firstOperation.updatedAt,
    firstCloudVersion,
    firstOperation.operationId,
  );
  await removePendingSyncOperation(
    firstOperation.id,
    firstOperation.updatedAt,
    firstOperation.operationId,
  );

  const afterLateAcknowledgement = (await listPendingSyncOperations())
    .filter(operation => operation.workspaceId === workspaceId);
  assert.equal(afterLateAcknowledgement.length, 1);
  assert.equal(afterLateAcknowledgement[0].operationId, secondOperation.operationId);
  assert.equal(afterLateAcknowledgement[0].expectedCloudUpdatedAt, firstCloudVersion);

  const localAfterLateAcknowledgement = await getLocalRecord({
    workspaceId,
    entityType: 'products',
    recordId,
  });
  assert.equal(localAfterLateAcknowledgement.payload.stock, 9);
  assert.equal(localAfterLateAcknowledgement.syncState, 'pending');
  assert.equal(localAfterLateAcknowledgement.cloudUpdatedAt, firstCloudVersion);

  const secondCloudVersion = '2026-11-09T09:02:00.000Z';
  await markLocalRecordSynced(
    secondOperation.recordKey,
    secondOperation.updatedAt,
    secondCloudVersion,
    secondOperation.operationId,
  );
  await removePendingSyncOperation(
    secondOperation.id,
    secondOperation.updatedAt,
    secondOperation.operationId,
  );

  const finalRecord = await getLocalRecord({ workspaceId, entityType: 'products', recordId });
  assert.equal(finalRecord.syncState, 'synced');
  assert.equal(finalRecord.cloudUpdatedAt, secondCloudVersion);
  assert.equal(
    (await listPendingSyncOperations()).filter(operation => operation.workspaceId === workspaceId).length,
    0,
  );
});

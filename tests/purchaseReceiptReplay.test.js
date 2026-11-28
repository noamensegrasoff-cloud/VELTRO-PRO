import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLocalRecord,
  listPendingSyncOperations,
  setActiveWorkspaceId,
} from '../src/services/localDatabase.js';
import { savePurchaseReceipt } from '../src/services/purchaseReceiptSync.js';
import { makePurchaseMovementRecordId } from '../src/services/purchaseMovement.js';

test('re-saving one purchase receipt coalesces its source movement instead of queueing duplicates', async () => {
  const workspaceId = 'workspace-purchase-replay-test';
  const receiptId = 'receipt-replay-1';
  const lineId = 'line-replay-1';
  const movementId = makePurchaseMovementRecordId(receiptId, lineId);

  await setActiveWorkspaceId(workspaceId);

  const receipt = {
    id: receiptId,
    number: 'PUR-REPLAY-1',
    createdAt: '2026-11-17T08:00:00.000Z',
    updatedAt: '2026-11-17T08:00:00.000Z',
    items: [{
      id: lineId,
      stockMovementId: movementId,
      productId: 'product-replay-1',
      stockAppliedQty: 5,
      price: 7,
    }],
  };
  const product = { id: 'product-replay-1', stock: 5 };

  await savePurchaseReceipt(receipt, { products: [product] });
  const firstQueue = (await listPendingSyncOperations())
    .filter(operation => operation.workspaceId === workspaceId);
  const firstMovementOperation = firstQueue.find(operation => operation.entityType === 'stock_movements');

  await savePurchaseReceipt({
    ...receipt,
    updatedAt: '2026-11-17T08:01:00.000Z',
  }, { products: [product] });

  const secondQueue = (await listPendingSyncOperations())
    .filter(operation => operation.workspaceId === workspaceId);
  const movement = await getLocalRecord({
    workspaceId,
    entityType: 'stock_movements',
    recordId: movementId,
  });

  assert.equal(firstQueue.length, 3);
  assert.equal(secondQueue.length, 3);
  assert.equal(new Set(secondQueue.map(operation => operation.recordKey)).size, 3);
  assert.equal(secondQueue.filter(operation => operation.entityType === 'stock_movements').length, 1);
  assert.equal(secondQueue.find(operation => operation.entityType === 'stock_movements').recordId, movementId);
  assert.notEqual(
    secondQueue.find(operation => operation.entityType === 'stock_movements').operationId,
    firstMovementOperation.operationId,
  );
  assert.equal(movement.payload.sourceReceiptId, receiptId);
  assert.equal(movement.payload.sourceLineId, lineId);
  assert.equal(movement.payload.quantity, 5);

  const retryQueue = (await listPendingSyncOperations())
    .filter(operation => operation.workspaceId === workspaceId);
  assert.equal(
    retryQueue.find(operation => operation.entityType === 'stock_movements').operationId,
    secondQueue.find(operation => operation.entityType === 'stock_movements').operationId,
  );
});

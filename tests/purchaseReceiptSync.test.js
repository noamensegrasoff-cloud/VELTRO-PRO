import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLocalRecord,
  listPendingSyncOperations,
  setActiveWorkspaceId,
} from '../src/services/localDatabase.js';
import {
  deletePurchaseReceipt,
  savePurchaseReceipt,
} from '../src/services/purchaseReceiptSync.js';
import {
  getPurchaseMovementRecordIds,
  makePurchaseMovementRecordId,
} from '../src/services/purchaseMovement.js';

test('purchase receipt save and delete queue product and source movement without claiming cloud completion', async () => {
  const workspaceId = 'workspace-purchase-flow-test';
  await setActiveWorkspaceId(workspaceId);

  const receiptId = 'receipt-flow-1';
  const lineId = 'line-flow-1';
  const movementId = makePurchaseMovementRecordId(receiptId, lineId);
  const receipt = {
    id: receiptId,
    number: 'PUR-FLOW-1',
    updatedAt: '2026-11-08T08:00:00.000Z',
    items: [{
      id: lineId,
      stockMovementId: movementId,
      productId: 'product-flow-1',
      stockAppliedQty: 8,
      price: 12.5,
    }],
  };
  const product = { id: 'product-flow-1', stock: 8 };

  await savePurchaseReceipt(receipt, { products: [product] });

  const savedReceipt = await getLocalRecord({ workspaceId, entityType: 'purchases', recordId: receiptId });
  const savedProduct = await getLocalRecord({ workspaceId, entityType: 'products', recordId: product.id });
  const savedMovement = await getLocalRecord({ workspaceId, entityType: 'stock_movements', recordId: movementId });
  assert.equal(savedReceipt.syncState, 'pending');
  assert.equal(savedProduct.syncState, 'pending');
  assert.equal(savedMovement.syncState, 'pending');
  assert.equal(savedMovement.payload.sourceReceiptId, receiptId);
  assert.equal(savedMovement.payload.sourceLineId, lineId);
  assert.equal(savedMovement.payload.quantity, 8);

  const queued = (await listPendingSyncOperations()).filter(operation => operation.workspaceId === workspaceId);
  assert.equal(queued.length, 3);
  assert.ok(queued.every(operation => operation.operationId));

  await deletePurchaseReceipt(receiptId, {
    products: [{ ...product, stock: 0 }],
    movementIds: getPurchaseMovementRecordIds(receipt),
  });

  const afterDelete = (await listPendingSyncOperations()).filter(operation => operation.workspaceId === workspaceId);
  assert.equal(afterDelete.length, 3);
  assert.equal(afterDelete.filter(operation => operation.operation === 'delete').length, 2);
  assert.equal(afterDelete.filter(operation => operation.operation === 'upsert').length, 1);

  const deletedReceipt = await getLocalRecord({ workspaceId, entityType: 'purchases', recordId: receiptId });
  const deletedMovement = await getLocalRecord({ workspaceId, entityType: 'stock_movements', recordId: movementId });
  const reversedProduct = await getLocalRecord({ workspaceId, entityType: 'products', recordId: product.id });
  assert.ok(deletedReceipt.deletedAt);
  assert.ok(deletedMovement.deletedAt);
  assert.equal(reversedProduct.payload.stock, 0);
  assert.equal(deletedReceipt.syncState, 'pending');
  assert.equal(deletedMovement.syncState, 'pending');
  assert.equal(reversedProduct.syncState, 'pending');
});

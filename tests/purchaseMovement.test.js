import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPurchaseMovementRecord,
  getPurchaseMovementRecordIds,
  makePurchaseMovementRecordId,
} from '../src/services/purchaseMovement.js';

test('purchase movement record ID is stable for the same receipt line', () => {
  const first = makePurchaseMovementRecordId('receipt-1', 'line-1');
  const retry = makePurchaseMovementRecordId('receipt-1', 'line-1');
  assert.equal(first, retry);
});

test('different receipt lines have different source IDs', () => {
  assert.notEqual(
    makePurchaseMovementRecordId('receipt-1', 'line-1'),
    makePurchaseMovementRecordId('receipt-1', 'line-2'),
  );
  assert.notEqual(
    makePurchaseMovementRecordId('receipt-1', 'line-1'),
    makePurchaseMovementRecordId('receipt-2', 'line-1'),
  );
});

test('movement snapshot keeps the purchase receipt and line as its source', () => {
  const receipt = { id: 'receipt-1', number: 'PUR-0001', updatedAt: '2026-11-08T08:00:00.000Z' };
  const item = {
    id: 'line-1',
    stockMovementId: makePurchaseMovementRecordId(receipt.id, 'line-1'),
    productId: 'product-1',
    stockAppliedQty: 12,
    price: 4.5,
  };
  const movement = buildPurchaseMovementRecord(receipt, item);
  assert.equal(movement.entityType, 'stock_movements');
  assert.equal(movement.recordId, item.stockMovementId);
  assert.equal(movement.payload.sourceReceiptId, receipt.id);
  assert.equal(movement.payload.sourceLineId, item.id);
  assert.equal(movement.payload.productId, item.productId);
  assert.equal(movement.payload.quantity, 12);
  assert.equal(movement.payload.direction, 'in');
});

test('unapplied or imported receipt lines do not create stock movements', () => {
  const receipt = { id: 'receipt-1' };
  assert.equal(buildPurchaseMovementRecord(receipt, { id: 'line-1', stockAppliedQty: 5 }), null);
  assert.equal(buildPurchaseMovementRecord(receipt, {
    id: 'line-1',
    stockMovementId: makePurchaseMovementRecordId(receipt.id, 'line-1'),
    stockAppliedQty: 0,
  }), null);
});

test('movement source ID must match the receipt and line identity', () => {
  const receipt = { id: 'receipt-1' };
  assert.throws(() => buildPurchaseMovementRecord(receipt, {
    id: 'line-1',
    stockMovementId: 'random-id',
    stockAppliedQty: 1,
  }), /does not match its receipt source/);
});

test('receipt movement IDs include only tracked purchase lines', () => {
  const receipt = {
    id: 'receipt-1',
    items: [
      { id: 'line-1', stockMovementId: makePurchaseMovementRecordId('receipt-1', 'line-1') },
      { id: 'line-2' },
    ],
  };
  assert.deepEqual(getPurchaseMovementRecordIds(receipt), [
    makePurchaseMovementRecordId('receipt-1', 'line-1'),
  ]);
});

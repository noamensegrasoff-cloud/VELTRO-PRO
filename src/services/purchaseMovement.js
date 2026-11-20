export const PURCHASE_MOVEMENT_ENTITY = 'stock_movements';

export function makePurchaseMovementRecordId(receiptId, lineId) {
  if (receiptId == null || String(receiptId) === '' || lineId == null || String(lineId) === '') {
    throw new Error('Receipt ID and receipt line ID are required for a purchase movement.');
  }
  return 'purchase:' + encodeURIComponent(String(receiptId)) + ':line:' + encodeURIComponent(String(lineId));
}

export function buildPurchaseMovementRecord(receipt, item) {
  if (!receipt?.id || !item?.id || !item.stockMovementId) return null;
  const recordId = makePurchaseMovementRecordId(receipt.id, item.id);
  if (String(item.stockMovementId) !== recordId) {
    throw new Error('Purchase movement ID does not match its receipt source.');
  }
  const quantity = Number(item.stockAppliedQty);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return {
    entityType: PURCHASE_MOVEMENT_ENTITY,
    recordId,
    payload: {
      id: recordId,
      movementId: recordId,
      sourceType: 'purchase_receipt',
      sourceReceiptId: String(receipt.id),
      sourceReceiptNumber: String(receipt.number || ''),
      sourceLineId: String(item.id),
      productId: String(item.productId || ''),
      direction: 'in',
      quantity,
      unitCost: Number.isFinite(Number(item.price)) ? Number(item.price) : 0,
      occurredAt: receipt.updatedAt || receipt.createdAt || null,
    },
  };
}

export function getPurchaseMovementRecordIds(receipt) {
  return (Array.isArray(receipt?.items) ? receipt.items : [])
    .filter(item => item?.stockMovementId)
    .map(item => makePurchaseMovementRecordId(receipt.id, item.id));
}

import { listRecords, saveRecord } from './dataRepository.js';
import { getActiveWorkspaceId, getLocalRecord, saveLocalRecordsAtomically } from './localDatabase.js';
import { buildPurchaseMovementRecord, getPurchaseMovementRecordIds, PURCHASE_MOVEMENT_ENTITY } from './purchaseMovement.js';
import { syncWorkspace } from './databaseSync.js';
import { getCloudRecords } from './cloudStorage.js';

const LEGACY_KEY = 'veltro.purchases.v1';
const ENTITY_TYPE = 'purchases';

function readLegacyReceipts() {
  try {
    const value = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    return Array.isArray(value) ? value.filter(row => row && row.id) : [];
  } catch {
    return [];
  }
}

function writeLegacyReceipts(rows) {
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(rows));
  } catch (error) {
    throw new Error('Could not persist purchase receipts in local storage.', { cause: error });
  }
}

function timeOf(row) {
  const value = Date.parse(row?.updatedAt || row?.updated_at || row?.createdAt || 0);
  return Number.isFinite(value) ? value : 0;
}

function mergeById(rows) {
  const merged = new Map();
  for (const row of rows) {
    if (!row?.id) continue;
    const id = String(row.id);
    const previous = merged.get(id);
    if (!previous || timeOf(row) >= timeOf(previous)) {
      merged.set(id, { ...row, items: Array.isArray(row.items) ? row.items : [] });
    }
  }
  return [...merged.values()];
}

export async function loadPurchaseReceipts() {
  let legacyRows = readLegacyReceipts();

  // Sync errors must never prevent already-saved local receipts from loading.
  try { await syncWorkspace({ entityTypes: [ENTITY_TYPE] }); } catch {}

  const workspaceId = await getActiveWorkspaceId().catch(() => 'local-device');

  // Recover records saved by the previous localStorage-only implementation.
  try {
    const legacyCloud = await getCloudRecords({
      workspaceId, entityType: 'local_storage', includeDeleted: true,
    });
    const oldRow = legacyCloud.find(row => row.record_id === LEGACY_KEY && !row.deleted_at);
    if (typeof oldRow?.payload?.value === 'string') {
      const parsed = JSON.parse(oldRow.payload.value);
      if (Array.isArray(parsed)) legacyRows = mergeById([...parsed, ...legacyRows]);
    }
  } catch {}

  let stored = [];
  try {
    stored = await listRecords({ entityType: ENTITY_TYPE, workspaceId, includeDeleted: true });
  } catch {}

  const tombstones = new Map(
    stored.filter(row => row.deletedAt).map(row => [String(row.recordId), row])
  );
  const merged = new Map(
    stored.filter(row => !row.deletedAt && row.payload)
      .map(row => [String(row.recordId), row.payload])
  );

  for (const legacy of legacyRows) {
    const id = String(legacy.id);
    const tombstone = tombstones.get(id);
    if (tombstone && timeOf(tombstone) >= timeOf(legacy)) continue;
    const current = merged.get(id);
    if (!current || timeOf(legacy) > timeOf(current)) merged.set(id, legacy);
  }

  const result = [...merged.values()].sort((a, b) => timeOf(b) - timeOf(a));

  // Repair the local record store from the merged, authoritative result.
  for (const receipt of result) {
    const id = String(receipt.id);
    const storedRow = stored.find(row => String(row.recordId) === id && !row.deletedAt);
    if (!storedRow || timeOf(receipt) > timeOf(storedRow.payload)) {
      await saveRecord({ entityType: ENTITY_TYPE, recordId: id, payload: receipt, workspaceId }).catch(() => {});
    }
  }

  writeLegacyReceipts(result);
  return result;
}

export async function savePurchaseReceipt(receipt, { products = [], deleteMovementIds = [] } = {}) {
  if (!receipt?.id) throw new Error('A stable purchase receipt ID is required.');
  const rows = readLegacyReceipts();
  const next = mergeById([
    ...rows.filter(row => String(row.id) !== String(receipt.id)),
    { ...receipt, items: Array.isArray(receipt.items) ? receipt.items : [] },
  ]);
  const workspaceId = await getActiveWorkspaceId();
  const previous = await getLocalRecord({
    entityType: ENTITY_TYPE, recordId: String(receipt.id), workspaceId,
  }).catch(() => null);
  const previousReceipt = previous?.payload || rows.find(row => String(row.id) === String(receipt.id));
  const movementRecords = (receipt.items || [])
    .map(item => buildPurchaseMovementRecord(receipt, item))
    .filter(Boolean);
  const nextMovementIds = new Set(movementRecords.map(item => item.recordId));
  const removedMovementIds = getPurchaseMovementRecordIds(previousReceipt)
    .filter(id => !nextMovementIds.has(id));
  const deletes = [...new Set([...removedMovementIds, ...deleteMovementIds])]
    .map(recordId => ({ entityType: PURCHASE_MOVEMENT_ENTITY, recordId, workspaceId }));
  const upserts = [
    { entityType: ENTITY_TYPE, recordId: String(receipt.id), payload: receipt, workspaceId },
    ...products.map(product => {
      if (!product?.id) throw new Error('Every purchase product update requires a stable product ID.');
      return { entityType: 'products', recordId: String(product.id), payload: product, workspaceId };
    }),
    ...movementRecords.map(record => ({ ...record, workspaceId })),
  ];

  await saveLocalRecordsAtomically({ upserts, deletes, workspaceId });
  try { writeLegacyReceipts(next); } catch {}
  void syncWorkspace().catch(() => {});
  return receipt;
}

export async function deletePurchaseReceipt(receiptId, { products = [], movementIds = [] } = {}) {
  if (receiptId == null || String(receiptId) === '') {
    throw new Error('A purchase receipt ID is required.');
  }
  const id = String(receiptId);
  const workspaceId = await getActiveWorkspaceId();
  const rows = readLegacyReceipts();
  const previous = await getLocalRecord({
    entityType: ENTITY_TYPE, recordId: id, workspaceId,
  }).catch(() => null);
  const receipt = previous?.payload || rows.find(row => String(row.id) === id);
  const sourceMovementIds = [...new Set([
    ...getPurchaseMovementRecordIds(receipt),
    ...movementIds,
  ])];
  const upserts = products.map(product => {
    if (!product?.id) throw new Error('Every purchase product update requires a stable product ID.');
    return { entityType: 'products', recordId: String(product.id), payload: product, workspaceId };
  });
  const deletes = [
    { entityType: ENTITY_TYPE, recordId: id, workspaceId },
    ...sourceMovementIds.map(recordId => ({
      entityType: PURCHASE_MOVEMENT_ENTITY, recordId, workspaceId,
    })),
  ];

  await saveLocalRecordsAtomically({ upserts, deletes, workspaceId });
  try { writeLegacyReceipts(rows.filter(row => String(row.id) !== id)); } catch {}
  void syncWorkspace().catch(() => {});
  return { deleted: true, locallyPersisted: true };
}

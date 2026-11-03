import { deleteRecord, listRecords, saveRecord } from './dataRepository.js';
import { getActiveWorkspaceId } from './localDatabase.js';
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

function timeOf(row) {
  const value = Date.parse(row?.updatedAt || row?.createdAt || 0);
  return Number.isFinite(value) ? value : 0;
}

export async function loadPurchaseReceipts() {
  let legacyRows = readLegacyReceipts();
  try { await syncWorkspace({ entityTypes: [ENTITY_TYPE] }); } catch {}
  const workspaceId = await getActiveWorkspaceId().catch(() => 'local-device');
  // Migrate the old single-JSON cloud record as well, so a clean/new device
  // can recover receipts that were synced before the per-receipt outbox existed.
  try {
    const legacyCloud = await getCloudRecords({ workspaceId, entityType: 'local_storage', includeDeleted: true });
    const oldRow = legacyCloud.find(row => row.record_id === LEGACY_KEY && !row.deleted_at);
    if (typeof oldRow?.payload?.value === 'string') {
      const parsed = JSON.parse(oldRow.payload.value);
      if (Array.isArray(parsed)) {
        const migrated = new Map();
        for (const row of [...parsed, ...legacyRows]) {
          if (!row?.id) continue;
          const id = String(row.id);
          const previous = migrated.get(id);
          if (!previous || timeOf(row) >= timeOf(previous)) migrated.set(id, row);
        }
        legacyRows = [...migrated.values()];
      }
    }
  } catch {}
  let stored = [];
  try { stored = await listRecords({ entityType: ENTITY_TYPE, workspaceId, includeDeleted: true }); } catch {}
  const storedById = new Map(stored.map(row => [String(row.recordId), row]));
  const tombstones = new Map(stored.filter(row => row.deletedAt).map(row => [String(row.recordId), row]));
  const merged = new Map(stored.filter(row => !row.deletedAt && row.payload).map(row => [String(row.recordId), row.payload]));
  for (const legacy of legacyRows) {
    const id = String(legacy.id);
    const tombstone = tombstones.get(id);
    if (tombstone && timeOf(tombstone) >= timeOf(legacy)) continue;
    const current = merged.get(id);
    if (!current || timeOf(legacy) > timeOf(current)) merged.set(id, legacy);
  }
  for (const [id, receipt] of merged) {
    const cloudRow = storedById.get(id);
    const activeCloudRow = cloudRow && !cloudRow.deletedAt ? cloudRow : null;
    if (!activeCloudRow || timeOf(receipt) > timeOf(activeCloudRow.payload)) {
      await saveRecord({ entityType: ENTITY_TYPE, recordId: id, payload: receipt, workspaceId }).catch(() => {});
    }
  }
  try { await syncWorkspace({ entityTypes: [ENTITY_TYPE] }); } catch {}
  const result = [...merged.values()].sort((a,b) => timeOf(b) - timeOf(a));
  try { localStorage.setItem(LEGACY_KEY, JSON.stringify(result)); } catch {}
  return result;
}

export async function savePurchaseReceipt(receipt) {
  if (!receipt?.id) throw new Error('A stable purchase receipt ID is required.');
  const workspaceId = await getActiveWorkspaceId();
  return saveRecord({ entityType: ENTITY_TYPE, recordId: String(receipt.id), payload: receipt, workspaceId });
}

export async function deletePurchaseReceipt(receiptId) {
  if (receiptId == null || String(receiptId) === '') throw new Error('A purchase receipt ID is required.');
  const workspaceId = await getActiveWorkspaceId();
  return deleteRecord({ entityType: ENTITY_TYPE, recordId: String(receiptId), workspaceId });
}

import { deleteRecord, listRecords, saveRecord } from './dataRepository.js';
import { getActiveWorkspaceId } from './localDatabase.js';
import { syncWorkspace } from './databaseSync.js';

const CATALOG_KEY = 'veltro-products-catalog-v1';
const CONFLICTS_KEY = 'veltro-products-conflicts-v1';
const ENTITY_TYPE = 'products';

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

function productTime(product) {
  const value = Date.parse(product?.updatedAt || product?.createdAt || 0);
  return Number.isFinite(value) ? value : 0;
}

function sameProduct(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

function archiveConflict(productId, localProduct, cloudProduct, winner) {
  if (sameProduct(localProduct, cloudProduct)) return;
  const conflicts = readJson(CONFLICTS_KEY, []);
  conflicts.push({
    id: globalThis.crypto?.randomUUID?.() || `conflict-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    productId,
    detectedAt: new Date().toISOString(),
    winner,
    localVersion: localProduct,
    cloudVersion: cloudProduct,
    resolution: 'newest_updatedAt_kept; other version archived locally',
  });
  try { localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts.slice(-200))); } catch {}
}

/**
 * Pull the cloud catalog first, then merge it with the browser catalog by stable product ID.
 * A differing version is archived locally before the newest timestamp is selected.
 * The selected records are saved through the shared IndexedDB/outbox repository.
 */
export async function loadAndMergeProductCatalog() {
  const localProducts = readJson(CATALOG_KEY, []);
  const localMap = new Map((Array.isArray(localProducts) ? localProducts : [])
    .filter(p => p && p.id != null)
    .map(p => [String(p.id), p]));

  // A cloud failure must not make the locally saved catalog unavailable.
  try { await syncWorkspace({ entityTypes: [ENTITY_TYPE] }); } catch {}

  let records = [];
  try { records = await listRecords({ entityType: ENTITY_TYPE }); } catch {}
  const cloudMap = new Map(records
    .filter(row => row && !row.deletedAt && row.payload && row.recordId != null)
    .map(row => [String(row.recordId), { ...row.payload, id: String(row.recordId) }]));

  const merged = new Map(cloudMap);
  for (const [id, localProduct] of localMap) {
    const cloudProduct = cloudMap.get(id);
    if (!cloudProduct) {
      merged.set(id, localProduct);
      continue;
    }
    if (sameProduct(localProduct, cloudProduct)) continue;
    const localWins = productTime(localProduct) > productTime(cloudProduct);
    archiveConflict(id, localProduct, cloudProduct, localWins ? 'local' : 'cloud');
    merged.set(id, localWins ? localProduct : cloudProduct);
  }

  const result = [...merged.values()].sort((a, b) => productTime(b) - productTime(a));
  try { localStorage.setItem(CATALOG_KEY, JSON.stringify(result)); } catch {}

  // Adopt local-only products into the shared record repository. Stable IDs make retries idempotent.
  const workspaceId = await getActiveWorkspaceId().catch(() => 'local-device');
  for (const product of result) {
    const record = records.find(row => String(row.recordId) === String(product.id) && !row.deletedAt);
    const chosenWasCloud = record && sameProduct(record.payload, product);
    if (!chosenWasCloud) {
      await saveRecord({ entityType: ENTITY_TYPE, recordId: String(product.id), payload: product, workspaceId }).catch(() => {});
    }
  }
  try { await syncWorkspace({ entityTypes: [ENTITY_TYPE] }); } catch {}
  return result;
}

export async function persistProduct(product) {
  if (!product?.id) throw new Error('A stable product ID is required.');
  const workspaceId = await getActiveWorkspaceId();
  return saveRecord({
    entityType: ENTITY_TYPE,
    recordId: String(product.id),
    payload: product,
    workspaceId,
  });
}

export async function removeProductFromCatalog(productId) {
  if (productId == null || String(productId) === '') throw new Error('A product ID is required.');
  const workspaceId = await getActiveWorkspaceId();
  return deleteRecord({
    entityType: ENTITY_TYPE,
    recordId: String(productId),
    workspaceId,
  });
}

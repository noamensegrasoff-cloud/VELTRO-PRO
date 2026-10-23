import { getDeviceId, getCloudRecords, saveCloudRecord, deleteCloudRecord } from './cloudStorage.js';

const DB_NAME = 'veltro-pro-local';
const DB_VERSION = 1;
const RECORDS = 'records';
const OUTBOX = 'outbox';
const META = 'meta';
const LOCAL_WORKSPACE = 'local-device';

function openDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable in this environment.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDS)) {
        const store = db.createObjectStore(RECORDS, { keyPath: 'key' });
        store.createIndex('by_workspace_entity', ['workspaceId', 'entityType']);
        store.createIndex('by_updated_at', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(OUTBOX)) {
        const store = db.createObjectStore(OUTBOX, { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_record_key', 'recordKey');
      }
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local database.'));
    request.onblocked = () => reject(new Error('Local database upgrade is blocked by another open tab.'));
  });
}

async function withStore(storeName, mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try { result = operation(store, tx); } catch (error) { reject(error); db.close(); return; }
    tx.oncomplete = () => { db.close(); resolve(result?.result ?? result); };
    tx.onerror = () => { const error = tx.error || new Error('Local database transaction failed.'); db.close(); reject(error); };
    tx.onabort = () => { const error = tx.error || new Error('Local database transaction was aborted.'); db.close(); reject(error); };
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Local database request failed.'));
  });
}

export function makeRecordKey(workspaceId, entityType, recordId) {
  return [workspaceId || LOCAL_WORKSPACE, entityType, String(recordId)].join('::');
}

export async function getActiveWorkspaceId() {
  const meta = await withStore(META, 'readonly', store => store.get('activeWorkspaceId'));
  return meta?.value || LOCAL_WORKSPACE;
}

export async function setActiveWorkspaceId(workspaceId) {
  if (!workspaceId) throw new Error('workspaceId is required.');
  return withStore(META, 'readwrite', store => store.put({ key: 'activeWorkspaceId', value: workspaceId }));
}

export async function saveLocalRecord({ entityType, recordId, payload, workspaceId, queueForSync = true }) {
  if (!entityType || !recordId) throw new Error('entityType and recordId are required.');
  if (payload === undefined) throw new Error('payload is required.');
  const activeWorkspace = workspaceId || await getActiveWorkspaceId();
  const key = makeRecordKey(activeWorkspace, entityType, recordId);
  const now = new Date().toISOString();
  const record = {
    key, workspaceId: activeWorkspace, entityType, recordId: String(recordId),
    payload, updatedAt: now, deletedAt: null, deviceId: getDeviceId(),
    syncState: queueForSync && activeWorkspace !== LOCAL_WORKSPACE ? 'pending' : 'local',
  };
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([RECORDS, OUTBOX], 'readwrite');
    tx.objectStore(RECORDS).put(record);
    if (queueForSync && activeWorkspace !== LOCAL_WORKSPACE) {
      tx.objectStore(OUTBOX).add({ recordKey: key, workspaceId: activeWorkspace, entityType, recordId: String(recordId), operation: 'upsert', payload, createdAt: now });
    }
    tx.oncomplete = () => { db.close(); resolve(record); };
    tx.onerror = () => { const error = tx.error || new Error('Could not save record locally.'); db.close(); reject(error); };
    tx.onabort = () => { const error = tx.error || new Error('Local save was aborted.'); db.close(); reject(error); };
  });
}

export async function getLocalRecord({ entityType, recordId, workspaceId }) {
  const activeWorkspace = workspaceId || await getActiveWorkspaceId();
  const key = makeRecordKey(activeWorkspace, entityType, recordId);
  return withStore(RECORDS, 'readonly', store => store.get(key));
}

export async function listLocalRecords({ entityType, workspaceId, includeDeleted = false }) {
  const activeWorkspace = workspaceId || await getActiveWorkspaceId();
  const db = await openDatabase();
  const rows = await new Promise((resolve, reject) => {
    const tx = db.transaction(RECORDS, 'readonly');
    const request = tx.objectStore(RECORDS).index('by_workspace_entity').getAll([activeWorkspace, entityType]);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Could not read local records.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
  return rows.filter(row => includeDeleted || !row.deletedAt);
}

export async function deleteLocalRecord({ entityType, recordId, workspaceId, queueForSync = true }) {
  if (!entityType || !recordId) throw new Error('entityType and recordId are required.');
  const activeWorkspace = workspaceId || await getActiveWorkspaceId();
  const key = makeRecordKey(activeWorkspace, entityType, recordId);
  const now = new Date().toISOString();
  const record = {
    key, workspaceId: activeWorkspace, entityType, recordId: String(recordId),
    payload: {}, updatedAt: now, deletedAt: now, deviceId: getDeviceId(),
    syncState: queueForSync && activeWorkspace !== LOCAL_WORKSPACE ? 'pending' : 'local',
  };
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([RECORDS, OUTBOX], 'readwrite');
    tx.objectStore(RECORDS).put(record);
    if (queueForSync && activeWorkspace !== LOCAL_WORKSPACE) {
      tx.objectStore(OUTBOX).add({ recordKey: key, workspaceId: activeWorkspace, entityType, recordId: String(recordId), operation: 'delete', createdAt: now });
    }
    tx.oncomplete = () => { db.close(); resolve(record); };
    tx.onerror = () => { const error = tx.error || new Error('Could not delete record locally.'); db.close(); reject(error); };
    tx.onabort = () => { const error = tx.error || new Error('Local delete was aborted.'); db.close(); reject(error); };
  });
}

export async function listPendingSyncOperations() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX, 'readonly');
    const request = tx.objectStore(OUTBOX).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error('Could not read pending sync operations.'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function removePendingSyncOperation(id) {
  return withStore(OUTBOX, 'readwrite', store => store.delete(id));
}

export async function markLocalRecordSynced(key, cloudUpdatedAt) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECORDS, 'readwrite');
    const store = tx.objectStore(RECORDS);
    const request = store.get(key);
    request.onsuccess = () => {
      if (request.result) store.put({ ...request.result, syncState: 'synced', cloudUpdatedAt: cloudUpdatedAt || new Date().toISOString() });
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { const error = tx.error || new Error('Could not update sync state.'); db.close(); reject(error); };
  });
}

export async function mergeCloudRecord(row, workspaceId) {
  const key = makeRecordKey(workspaceId, row.entity_type, row.record_id);
  const pending = (await listPendingSyncOperations()).some(item => item.recordKey === key);
  if (pending) return { skipped: true, reason: 'pending_local_change' };
  const existing = await withStore(RECORDS, 'readonly', store => store.get(key));
  const remoteTime = Date.parse(row.updated_at || 0);
  const localTime = Date.parse(existing?.updatedAt || 0);
  if (existing && localTime > remoteTime) return { skipped: true, reason: 'local_is_newer' };
  const record = {
    key, workspaceId, entityType: row.entity_type, recordId: String(row.record_id),
    payload: row.payload || {}, updatedAt: row.updated_at || new Date().toISOString(),
    deletedAt: row.deleted_at, deviceId: row.device_id || null, syncState: 'synced',
  };
  await withStore(RECORDS, 'readwrite', store => store.put(record));
  return { skipped: false };
}

export async function adoptLocalRecordsIntoWorkspace(workspaceId) {
  if (!workspaceId) throw new Error('workspaceId is required.');
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([RECORDS, OUTBOX, META], 'readwrite');
    const recordsStore = tx.objectStore(RECORDS);
    const outboxStore = tx.objectStore(OUTBOX);
    const request = recordsStore.index('by_workspace_entity').getAll();
    request.onsuccess = () => {
      const localRows = (request.result || []).filter(row => row.workspaceId === LOCAL_WORKSPACE);
      for (const row of localRows) {
        const nextKey = makeRecordKey(workspaceId, row.entityType, row.recordId);
        const adopted = { ...row, key: nextKey, workspaceId, syncState: 'pending' };
        recordsStore.put(adopted);
        if (!row.deletedAt) outboxStore.add({ recordKey: nextKey, workspaceId, entityType: row.entityType, recordId: row.recordId, operation: 'upsert', payload: row.payload, createdAt: row.updatedAt });
        else outboxStore.add({ recordKey: nextKey, workspaceId, entityType: row.entityType, recordId: row.recordId, operation: 'delete', createdAt: row.updatedAt });
        recordsStore.delete(row.key);
      }
      tx.objectStore(META).put({ key: 'activeWorkspaceId', value: workspaceId });
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { const error = tx.error || new Error('Could not attach local records to the workspace.'); db.close(); reject(error); };
  });
}

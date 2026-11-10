import { getDeviceId, getCloudRecords, saveCloudRecord, deleteCloudRecord } from './cloudStorage.js';
import { resolveSnapshotConflict } from './syncConflict.js';

const DB_NAME = 'veltro-pro-local';
const DB_VERSION = 1;
const RECORDS = 'records';
const OUTBOX = 'outbox';
const META = 'meta';
const LOCAL_WORKSPACE = 'local-device';

function createSyncOperationId() {
  return globalThis.crypto?.randomUUID?.()
    || `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

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
    const records = tx.objectStore(RECORDS);
    const previousRequest = records.get(key);
    previousRequest.onsuccess = () => {
      const previous = previousRequest.result;
      const nextRecord = { ...record, cloudUpdatedAt: previous?.cloudUpdatedAt || null };
      records.put(nextRecord);
      if (queueForSync && activeWorkspace !== LOCAL_WORKSPACE) {
        // Keep the last server version observed before this edit for atomic CAS on upload.
        const outbox = tx.objectStore(OUTBOX);
        const queued = outbox.index('by_record_key').getAll(key);
        queued.onsuccess = () => {
          for (const item of queued.result || []) outbox.delete(item.id);
          outbox.put({
            id: key, recordKey: key, workspaceId: activeWorkspace, entityType,
            recordId: String(recordId), operation: 'upsert', operationId: createSyncOperationId(), payload,
            expectedCloudUpdatedAt: previous?.cloudUpdatedAt || null,
            updatedAt: now, createdAt: now,
          });
        };
      }
    };
    tx.oncomplete = () => { db.close(); resolve(record); };
    tx.onerror = () => { const error = tx.error || new Error('Could not save record locally.'); db.close(); reject(error); };
    tx.onabort = () => { const error = tx.error || new Error('Local save was aborted.'); db.close(); reject(error); };
  });
}


export async function saveLocalRecordsAtomically({ upserts = [], deletes = [], workspaceId } = {}) {
  if (!Array.isArray(upserts) || !Array.isArray(deletes)) {
    throw new Error('upserts and deletes must be arrays.');
  }
  const defaultWorkspace = workspaceId || await getActiveWorkspaceId();
  const now = new Date().toISOString();
  const operations = new Map();

  for (const item of upserts) {
    if (!item?.entityType || item.recordId == null || item.payload === undefined) {
      throw new Error('Every upsert requires entityType, recordId, and payload.');
    }
    const targetWorkspace = item.workspaceId || defaultWorkspace;
    const recordId = String(item.recordId);
    const key = makeRecordKey(targetWorkspace, item.entityType, recordId);
    operations.set(key, {
      key, workspaceId: targetWorkspace, entityType: item.entityType, recordId,
      payload: item.payload, operation: 'upsert',
      updatedAt: item.updatedAt || now, queueForSync: item.queueForSync !== false,
    });
  }

  for (const item of deletes) {
    if (!item?.entityType || item.recordId == null) {
      throw new Error('Every delete requires entityType and recordId.');
    }
    const targetWorkspace = item.workspaceId || defaultWorkspace;
    const recordId = String(item.recordId);
    const key = makeRecordKey(targetWorkspace, item.entityType, recordId);
    operations.set(key, {
      key, workspaceId: targetWorkspace, entityType: item.entityType, recordId,
      payload: {}, operation: 'delete', updatedAt: item.updatedAt || now,
      deletedAt: item.deletedAt || now, queueForSync: item.queueForSync !== false,
    });
  }

  const pendingWrites = [...operations.values()];
  if (!pendingWrites.length) return [];

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([RECORDS, OUTBOX], 'readwrite');
    const recordsStore = tx.objectStore(RECORDS);
    const outboxStore = tx.objectStore(OUTBOX);
    const saved = [];

    for (const operation of pendingWrites) {
      const previousRequest = recordsStore.get(operation.key);
      previousRequest.onsuccess = () => {
        const previous = previousRequest.result;
        const queued = operation.queueForSync && operation.workspaceId !== LOCAL_WORKSPACE;
        const record = {
          key: operation.key,
          workspaceId: operation.workspaceId,
          entityType: operation.entityType,
          recordId: operation.recordId,
          payload: operation.payload,
          updatedAt: operation.updatedAt,
          deletedAt: operation.deletedAt || null,
          deviceId: getDeviceId(),
          syncState: queued ? 'pending' : 'local',
          cloudUpdatedAt: previous?.cloudUpdatedAt || null,
        };
        recordsStore.put(record);
        saved.push(record);

        const queuedRequest = outboxStore.index('by_record_key').getAll(operation.key);
        queuedRequest.onsuccess = () => {
          for (const oldOperation of queuedRequest.result || []) {
            outboxStore.delete(oldOperation.id);
          }
          if (queued) {
            outboxStore.put({
              id: operation.key,
              recordKey: operation.key,
              workspaceId: operation.workspaceId,
              entityType: operation.entityType,
              recordId: operation.recordId,
              operation: operation.operation,
              operationId: createSyncOperationId(),
              payload: operation.payload,
              expectedCloudUpdatedAt: previous?.cloudUpdatedAt || null,
              updatedAt: operation.updatedAt,
              createdAt: operation.updatedAt,
            });
          }
        };
      };
    }

    tx.oncomplete = () => { db.close(); resolve(saved); };
    tx.onerror = () => {
      const error = tx.error || new Error('Atomic local record transaction failed.');
      db.close();
      reject(error);
    };
    tx.onabort = () => {
      const error = tx.error || new Error('Atomic local record transaction was aborted.');
      db.close();
      reject(error);
    };
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
    const records = tx.objectStore(RECORDS);
    const previousRequest = records.get(key);
    previousRequest.onsuccess = () => {
      const previous = previousRequest.result;
      records.put({ ...record, cloudUpdatedAt: previous?.cloudUpdatedAt || null });
      if (queueForSync && activeWorkspace !== LOCAL_WORKSPACE) {
        // A delete supersedes queued writes but retains the last known cloud version.
        const outbox = tx.objectStore(OUTBOX);
        const queued = outbox.index('by_record_key').getAll(key);
        queued.onsuccess = () => {
          for (const item of queued.result || []) outbox.delete(item.id);
          outbox.put({
            id: key, recordKey: key, workspaceId: activeWorkspace, entityType,
            recordId: String(recordId), operation: 'delete', operationId: createSyncOperationId(),
            expectedCloudUpdatedAt: previous?.cloudUpdatedAt || null,
            updatedAt: now, createdAt: now,
          });
        };
      }
    };
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

function compareOutboxOperations(a, b) {
  const aTime = Date.parse(a.updatedAt || a.createdAt || '') || 0;
  const bTime = Date.parse(b.updatedAt || b.createdAt || '') || 0;
  if (aTime !== bTime) return aTime - bTime;
  const aId = typeof a.id === 'number' ? a.id : 0;
  const bId = typeof b.id === 'number' ? b.id : 0;
  if (aId !== bId) return aId - bId;
  return String(a.id || '').localeCompare(String(b.id || ''));
}

// Backfill IDs for outbox rows created by older app versions and coalesce any
// legacy duplicate rows before they are uploaded. The chosen snapshot is the
// latest one for each workspace/entity/record key.
export async function normalizePendingSyncOperations() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX, 'readwrite');
    const store = tx.objectStore(OUTBOX);
    const request = store.getAll();
    let normalized = 0;

    request.onsuccess = () => {
      const groups = new Map();
      for (const item of request.result || []) {
        const recordKey = item.recordKey || (
          item.workspaceId && item.entityType && item.recordId != null
            ? makeRecordKey(item.workspaceId, item.entityType, item.recordId)
            : null
        );
        if (!recordKey) continue;
        const group = groups.get(recordKey) || [];
        group.push(item);
        groups.set(recordKey, group);
      }

      for (const [recordKey, items] of groups) {
        items.sort(compareOutboxOperations);
        const latest = items[items.length - 1];
        for (const obsolete of items.slice(0, -1)) {
          store.delete(obsolete.id);
          normalized += 1;
        }

        const next = { ...latest, recordKey };
        if (!next.operationId) {
          next.operationId = createSyncOperationId();
          normalized += 1;
        }
        if (latest.recordKey !== recordKey || !latest.operationId) {
          store.put(next);
        }
      }
    };

    tx.oncomplete = () => { db.close(); resolve(normalized); };
    tx.onerror = () => {
      const error = tx.error || new Error('Could not normalize pending sync operations.');
      db.close();
      reject(error);
    };
    tx.onabort = () => {
      const error = tx.error || new Error('Outbox normalization was aborted.');
      db.close();
      reject(error);
    };
  });
}

export async function removePendingSyncOperation(id, expectedUpdatedAt, expectedOperationId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX, 'readwrite');
    const store = tx.objectStore(OUTBOX);
    const request = store.get(id);
    request.onsuccess = () => {
      const current = request.result;
      // Operation identity is authoritative: timestamps can collide when two edits happen quickly.
      const matchesExpectedOperation = expectedOperationId
        ? current?.operationId === expectedOperationId
        : (!expectedUpdatedAt || (current?.updatedAt || current?.createdAt) === expectedUpdatedAt);
      if (current && matchesExpectedOperation) store.delete(id);
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { const error = tx.error || new Error('Could not acknowledge sync operation.'); db.close(); reject(error); };
    tx.onabort = () => { const error = tx.error || new Error('Sync acknowledgement was aborted.'); db.close(); reject(error); };
  });
}

export async function markLocalRecordSynced(key, expectedUpdatedAt, cloudUpdatedAt, expectedOperationId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([RECORDS, OUTBOX], 'readwrite');
    const records = tx.objectStore(RECORDS);
    const outbox = tx.objectStore(OUTBOX);
    const request = records.get(key);
    request.onsuccess = () => {
      const current = request.result;
      if (!current) return;

      const queuedRequest = outbox.index('by_record_key').getAll(key);
      queuedRequest.onsuccess = () => {
        const queuedRows = (queuedRequest.result || []).sort(compareOutboxOperations);
        const queued = queuedRows[queuedRows.length - 1] || null;
        const sameQueuedOperation = expectedOperationId
          ? (!queued || queued.operationId === expectedOperationId)
          : (!queued || !expectedUpdatedAt || (queued.updatedAt || queued.createdAt) === expectedUpdatedAt);
        const sameSnapshot = !expectedUpdatedAt || current.updatedAt === expectedUpdatedAt;
        const isAcknowledgedSnapshot = sameQueuedOperation && sameSnapshot;
        const version = cloudUpdatedAt || current.cloudUpdatedAt || new Date().toISOString();

        // A late acknowledgement may belong to an older operation even when its timestamp
        // matches a newer edit. Keep that edit pending and advance its CAS baseline only.
        records.put({
          ...current,
          syncState: isAcknowledgedSnapshot ? 'synced' : 'pending',
          cloudUpdatedAt: version,
        });
        if (!isAcknowledgedSnapshot && queued && cloudUpdatedAt) {
          outbox.put({ ...queued, expectedCloudUpdatedAt: cloudUpdatedAt });
        }
      };
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { const error = tx.error || new Error('Could not update sync state.'); db.close(); reject(error); };
    tx.onabort = () => { const error = tx.error || new Error('Sync acknowledgement was aborted.'); db.close(); reject(error); };
  });
}

export async function mergeCloudRecord(row, workspaceId) {
  const key = makeRecordKey(workspaceId, row.entity_type, row.record_id);
  const db = await openDatabase();

  // Read the outbox and local snapshot in the same read/write transaction.
  // Local saves use these same stores, so a concurrent edit is either observed
  // as pending here or runs after this merge and becomes the final local value.
  return new Promise((resolve, reject) => {
    const tx = db.transaction([RECORDS, OUTBOX], 'readwrite');
    const records = tx.objectStore(RECORDS);
    const outbox = tx.objectStore(OUTBOX);
    const pendingRequest = outbox.index('by_record_key').getAll(key);
    const existingRequest = records.get(key);
    let pendingReady = false;
    let existingReady = false;
    let pendingRows = [];
    let existing = null;
    let outcome = { skipped: false };
    let decided = false;

    const applyMerge = () => {
      if (!pendingReady || !existingReady || decided) return;
      decided = true;

      if (pendingRows.length) {
        outcome = { skipped: true, reason: 'pending_local_change' };
        return;
      }

      if (existing?.syncState === 'synced' && existing.cloudUpdatedAt && row.updated_at) {
        // Compare cloud version identity, not timestamp ordering: client clocks can skew.
        if (existing.cloudUpdatedAt === row.updated_at) {
          outcome = { skipped: true, reason: 'cloud_version_unchanged' };
          return;
        }
        // A changed authoritative cloud version is adopted regardless of wall-clock order.
      } else if (existing && resolveSnapshotConflict(existing, row) === 'local') {
        outcome = { skipped: true, reason: 'local_wins_conflict_policy' };
        return;
      }

      records.put({
        key,
        workspaceId,
        entityType: row.entity_type,
        recordId: String(row.record_id),
        payload: row.payload || {},
        updatedAt: row.updated_at || new Date().toISOString(),
        cloudUpdatedAt: row.updated_at || null,
        deletedAt: row.deleted_at,
        deviceId: row.device_id || null,
        syncState: 'synced',
      });
    };

    pendingRequest.onsuccess = () => {
      pendingRows = pendingRequest.result || [];
      pendingReady = true;
      applyMerge();
    };
    existingRequest.onsuccess = () => {
      existing = existingRequest.result || null;
      existingReady = true;
      applyMerge();
    };

    tx.oncomplete = () => { db.close(); resolve(outcome); };
    tx.onerror = () => {
      const error = tx.error || new Error('Could not merge the cloud record locally.');
      db.close();
      reject(error);
    };
    tx.onabort = () => {
      const error = tx.error || new Error('Cloud record merge was aborted.');
      db.close();
      reject(error);
    };
  });
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
        if (!row.deletedAt) outboxStore.put({ id: nextKey, recordKey: nextKey, workspaceId, entityType: row.entityType, recordId: row.recordId, operation: 'upsert', operationId: createSyncOperationId(), payload: row.payload, expectedCloudUpdatedAt: row.cloudUpdatedAt || null, updatedAt: row.updatedAt, createdAt: row.updatedAt });
        else outboxStore.put({ id: nextKey, recordKey: nextKey, workspaceId, entityType: row.entityType, recordId: row.recordId, operation: 'delete', operationId: createSyncOperationId(), expectedCloudUpdatedAt: row.cloudUpdatedAt || null, updatedAt: row.updatedAt, createdAt: row.updatedAt });
        recordsStore.delete(row.key);
      }
      tx.objectStore(META).put({ key: 'activeWorkspaceId', value: workspaceId });
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { const error = tx.error || new Error('Could not attach local records to the workspace.'); db.close(); reject(error); };
  });
}

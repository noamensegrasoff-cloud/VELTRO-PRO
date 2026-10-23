import {
  deleteLocalRecord,
  getLocalRecord,
  listLocalRecords,
  saveLocalRecord,
} from './localDatabase.js';
import { syncWorkspace } from './databaseSync.js';

function syncInBackground() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  void syncWorkspace().catch(() => {
    // Local persistence has already succeeded. The sync engine keeps failed
    // operations queued for a later retry and never rolls back local data.
  });
}

export async function saveRecord({ entityType, recordId, payload, workspaceId }) {
  const record = await saveLocalRecord({ entityType, recordId, payload, workspaceId });
  syncInBackground();
  return record;
}

export function getRecord(options) {
  return getLocalRecord(options);
}

export function listRecords(options) {
  return listLocalRecords(options);
}

export async function deleteRecord({ entityType, recordId, workspaceId }) {
  const record = await deleteLocalRecord({ entityType, recordId, workspaceId });
  syncInBackground();
  return record;
}

export async function saveRecords(records, { workspaceId } = {}) {
  if (!Array.isArray(records)) throw new Error('records must be an array.');
  const saved = [];
  for (const record of records) {
    saved.push(await saveLocalRecord({ ...record, workspaceId: record.workspaceId || workspaceId }));
  }
  syncInBackground();
  return saved;
}

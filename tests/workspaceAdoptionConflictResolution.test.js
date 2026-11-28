import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adoptLocalRecordsIntoWorkspace,
  getLocalRecord,
  listPendingSyncOperations,
  listWorkspaceAdoptionConflicts,
  resolveWorkspaceAdoptionConflict,
  saveLocalRecordsAtomically,
} from '../src/services/localDatabase.js';

function cloudRow(workspaceId, recordId, overrides = {}) {
  return {
    workspace_id: workspaceId,
    entity_type: 'products',
    record_id: recordId,
    payload: { id: recordId, name: 'Cloud product', stock: 20 },
    updated_at: '2026-11-25T08:00:00.000Z',
    deleted_at: null,
    device_id: 'device-cloud',
    ...overrides,
  };
}

async function createAdoptionConflict({ workspaceId, recordId, workspaceQueueForSync = false }) {
  await saveLocalRecordsAtomically({
    workspaceId: 'local-device',
    upserts: [{
      entityType: 'products',
      recordId,
      payload: { id: recordId, name: 'Device-local product', stock: 11 },
      queueForSync: false,
    }],
  });
  await saveLocalRecordsAtomically({
    workspaceId,
    upserts: [{
      entityType: 'products',
      recordId,
      payload: { id: recordId, name: 'Workspace product', stock: 27 },
      queueForSync: workspaceQueueForSync,
    }],
  });
  const adopted = await adoptLocalRecordsIntoWorkspace(workspaceId);
  assert.deepEqual(adopted, { adopted: 0, conflicts: 1 });
}

async function removeLocalDeviceRow(recordId) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('veltro-pro-local', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    tx.objectStore('records').delete(['local-device', 'products', String(recordId)].join('::'));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { const error = tx.error || new Error('Could not clean device-local test row.'); db.close(); reject(error); };
    tx.onabort = () => { const error = tx.error || new Error('Device-local test cleanup was aborted.'); db.close(); reject(error); };
  });
}

test('keeping the device-local version archives both snapshots and creates one stable workspace outbox operation', async () => {
  const workspaceId = 'workspace-adoption-keep-local';
  const recordId = 'product-keep-local';
  const remote = cloudRow(workspaceId, recordId);
  await createAdoptionConflict({ workspaceId, recordId });

  const result = await resolveWorkspaceAdoptionConflict({
    workspaceId,
    entityType: 'products',
    recordId,
    resolution: 'local',
    remoteRow: remote,
  });
  const localDevice = await getLocalRecord({ workspaceId: 'local-device', entityType: 'products', recordId });
  const workspace = await getLocalRecord({ workspaceId, entityType: 'products', recordId });
  const pending = (await listPendingSyncOperations()).filter(item => item.workspaceId === workspaceId && item.recordId === recordId);
  const retryRead = (await listPendingSyncOperations()).find(item => item.workspaceId === workspaceId && item.recordId === recordId);

  assert.equal(result.pending, true);
  assert.ok(result.archiveKey);
  assert.equal(localDevice, undefined);
  assert.equal(workspace.payload.name, 'Device-local product');
  assert.equal(workspace.payload.stock, 11);
  assert.equal(workspace.syncState, 'pending');
  assert.equal(workspace.cloudUpdatedAt, remote.updated_at);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].expectedCloudUpdatedAt, remote.updated_at);
  assert.ok(pending[0].operationId);
  assert.equal(retryRead.operationId, pending[0].operationId);
  assert.equal((await listWorkspaceAdoptionConflicts(workspaceId)).length, 0);
});

test('keeping the cloud version adopts the refreshed cloud snapshot and archives the device-local copy', async () => {
  const workspaceId = 'workspace-adoption-keep-cloud';
  const recordId = 'product-keep-cloud';
  const remote = cloudRow(workspaceId, recordId, {
    payload: { id: recordId, name: 'Authoritative cloud product', stock: 42 },
  });
  await createAdoptionConflict({ workspaceId, recordId });

  const result = await resolveWorkspaceAdoptionConflict({
    workspaceId,
    entityType: 'products',
    recordId,
    resolution: 'remote',
    remoteRow: remote,
  });
  const localDevice = await getLocalRecord({ workspaceId: 'local-device', entityType: 'products', recordId });
  const workspace = await getLocalRecord({ workspaceId, entityType: 'products', recordId });
  const pending = (await listPendingSyncOperations()).filter(item => item.workspaceId === workspaceId && item.recordId === recordId);

  assert.equal(result.pending, false);
  assert.ok(result.archiveKey);
  assert.equal(localDevice, undefined);
  assert.deepEqual(workspace.payload, remote.payload);
  assert.equal(workspace.syncState, 'synced');
  assert.equal(workspace.cloudUpdatedAt, remote.updated_at);
  assert.equal(pending.length, 0);
  assert.equal((await listWorkspaceAdoptionConflicts(workspaceId)).length, 0);
});

test('does not replace either snapshot while a workspace outbox operation is pending', async () => {
  const workspaceId = 'workspace-adoption-pending';
  const recordId = 'product-pending';
  await createAdoptionConflict({ workspaceId, recordId, workspaceQueueForSync: true });
  const before = (await listPendingSyncOperations()).find(item => item.workspaceId === workspaceId && item.recordId === recordId);

  await assert.rejects(
    resolveWorkspaceAdoptionConflict({
      workspaceId,
      entityType: 'products',
      recordId,
      resolution: 'local',
      remoteRow: cloudRow(workspaceId, recordId),
    }),
    /pending operation/,
  );

  const localDevice = await getLocalRecord({ workspaceId: 'local-device', entityType: 'products', recordId });
  const workspace = await getLocalRecord({ workspaceId, entityType: 'products', recordId });
  const after = (await listPendingSyncOperations()).find(item => item.workspaceId === workspaceId && item.recordId === recordId);
  assert.equal(localDevice.payload.name, 'Device-local product');
  assert.equal(workspace.payload.name, 'Workspace product');
  assert.equal(after.operationId, before.operationId);
  assert.equal((await listWorkspaceAdoptionConflicts(workspaceId)).length, 1);
  await removeLocalDeviceRow(recordId);
});

test('rejects a refreshed cloud snapshot for another record without changing either local snapshot', async () => {
  const workspaceId = 'workspace-adoption-mismatch';
  const recordId = 'product-mismatch';
  await createAdoptionConflict({ workspaceId, recordId });

  await assert.rejects(
    resolveWorkspaceAdoptionConflict({
      workspaceId,
      entityType: 'products',
      recordId,
      resolution: 'local',
      remoteRow: cloudRow(workspaceId, 'another-product'),
    }),
    /does not match the workspace-adoption conflict/,
  );

  const localDevice = await getLocalRecord({ workspaceId: 'local-device', entityType: 'products', recordId });
  const workspace = await getLocalRecord({ workspaceId, entityType: 'products', recordId });
  assert.equal(localDevice.payload.name, 'Device-local product');
  assert.equal(workspace.payload.name, 'Workspace product');
  assert.equal((await listWorkspaceAdoptionConflicts(workspaceId)).length, 1);
  await removeLocalDeviceRow(recordId);
});

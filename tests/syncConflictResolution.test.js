import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLocalRecord,
  listPendingSyncOperations,
  resolvePendingRecordConflict,
  saveLocalRecord,
  setActiveWorkspaceId,
} from '../src/services/localDatabase.js';

function remoteRow(workspaceId, recordId, overrides = {}) {
  return {
    workspace_id: workspaceId,
    entity_type: 'products',
    record_id: recordId,
    payload: { name: 'cloud version', stock: 9 },
    updated_at: '2026-11-24T08:30:00.000Z',
    deleted_at: null,
    device_id: 'device-b',
    ...overrides,
  };
}

test('keeping local rebases the pending operation onto the refreshed cloud version with a new stable ID', async () => {
  const workspaceId = 'workspace-conflict-local-choice';
  const recordId = 'product-local-choice';
  await setActiveWorkspaceId(workspaceId);
  await saveLocalRecord({
    workspaceId,
    entityType: 'products',
    recordId,
    payload: { name: 'local version', stock: 4 },
  });

  const before = (await listPendingSyncOperations()).find(item => item.recordId === recordId);
  const result = await resolvePendingRecordConflict({
    workspaceId,
    entityType: 'products',
    recordId,
    resolution: 'local',
    remoteRow: remoteRow(workspaceId, recordId),
  });
  const afterRows = (await listPendingSyncOperations()).filter(item => item.recordId === recordId);
  const afterRecord = await getLocalRecord({ workspaceId, entityType: 'products', recordId });

  assert.equal(result.pending, true);
  assert.equal(afterRows.length, 1);
  assert.notEqual(afterRows[0].operationId, before.operationId);
  assert.equal(afterRows[0].expectedCloudUpdatedAt, '2026-11-24T08:30:00.000Z');
  assert.deepEqual(afterRows[0].payload, { name: 'local version', stock: 4 });
  assert.equal(afterRecord.syncState, 'pending');
  assert.equal(afterRecord.cloudUpdatedAt, '2026-11-24T08:30:00.000Z');

  const retryRead = (await listPendingSyncOperations()).find(item => item.recordId === recordId);
  assert.equal(retryRead.operationId, afterRows[0].operationId);
});

test('choosing cloud adopts its snapshot and removes the pending local operation', async () => {
  const workspaceId = 'workspace-conflict-cloud-choice';
  const recordId = 'product-cloud-choice';
  await setActiveWorkspaceId(workspaceId);
  await saveLocalRecord({
    workspaceId,
    entityType: 'products',
    recordId,
    payload: { name: 'local version', stock: 4 },
  });

  const result = await resolvePendingRecordConflict({
    workspaceId,
    entityType: 'products',
    recordId,
    resolution: 'remote',
    remoteRow: remoteRow(workspaceId, recordId),
  });
  const record = await getLocalRecord({ workspaceId, entityType: 'products', recordId });
  const pending = (await listPendingSyncOperations()).filter(item => item.recordId === recordId);

  assert.equal(result.pending, false);
  assert.deepEqual(record.payload, { name: 'cloud version', stock: 9 });
  assert.equal(record.syncState, 'synced');
  assert.equal(record.cloudUpdatedAt, '2026-11-24T08:30:00.000Z');
  assert.equal(pending.length, 0);
});

test('choosing cloud absence removes the pending record only after archiving the conflict decision', async () => {
  const workspaceId = 'workspace-conflict-remote-absence';
  const recordId = 'product-remote-absence';
  await setActiveWorkspaceId(workspaceId);
  await saveLocalRecord({
    workspaceId,
    entityType: 'products',
    recordId,
    payload: { name: 'local version', stock: 4 },
  });

  const result = await resolvePendingRecordConflict({
    workspaceId,
    entityType: 'products',
    recordId,
    resolution: 'remote',
    remoteRow: null,
  });
  const record = await getLocalRecord({ workspaceId, entityType: 'products', recordId });
  const pending = (await listPendingSyncOperations()).filter(item => item.recordId === recordId);

  assert.ok(result.archiveKey);
  assert.equal(record, undefined);
  assert.equal(pending.length, 0);
});

test('rejects a cloud snapshot for a different record without changing the local outbox', async () => {
  const workspaceId = 'workspace-conflict-mismatch';
  const recordId = 'product-mismatch';
  await setActiveWorkspaceId(workspaceId);
  await saveLocalRecord({
    workspaceId,
    entityType: 'products',
    recordId,
    payload: { name: 'local version', stock: 4 },
  });

  await assert.rejects(
    resolvePendingRecordConflict({
      workspaceId,
      entityType: 'products',
      recordId,
      resolution: 'local',
      remoteRow: remoteRow(workspaceId, 'another-product'),
    }),
    /does not match the conflicted record/,
  );
  const pending = (await listPendingSyncOperations()).filter(item => item.recordId === recordId);
  assert.equal(pending.length, 1);
});

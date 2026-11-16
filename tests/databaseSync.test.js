import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSyncCompletionResult } from '../src/services/databaseSync.js';

test('reports synced only when the workspace outbox is empty', () => {
  assert.deepEqual(
    buildSyncCompletionResult([], { pushed: 2, pulled: 3, workspaceId: 'workspace-a' }),
    { status: 'synced', pushed: 2, pulled: 3, workspaceId: 'workspace-a', pending: 0 },
  );
});

test('keeps sync pending when a local edit was queued during an earlier upload', () => {
  assert.deepEqual(
    buildSyncCompletionResult([{ operationId: 'newer-edit' }], {
      pushed: 1,
      pulled: 0,
      workspaceId: 'workspace-a',
    }),
    { status: 'pending', pushed: 1, pulled: 0, workspaceId: 'workspace-a', pending: 1 },
  );
});

test('reports the number of unacknowledged operations instead of a false success', () => {
  assert.deepEqual(
    buildSyncCompletionResult([
      { operationId: 'operation-a' },
      { operationId: 'operation-b' },
    ], { workspaceId: 'workspace-b' }),
    { status: 'pending', pushed: 0, pulled: 0, workspaceId: 'workspace-b', pending: 2 },
  );
});

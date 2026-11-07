import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSnapshotConflict } from '../src/services/syncConflict.js';

test('remote snapshot wins when no local record exists', () => {
  assert.equal(resolveSnapshotConflict(null, { updated_at: '2026-01-01T00:00:00Z' }), 'remote');
});

test('local snapshot wins when its timestamp is newer', () => {
  assert.equal(resolveSnapshotConflict(
    { updatedAt: '2026-01-02T00:00:00Z', deviceId: 'a' },
    { updated_at: '2026-01-01T00:00:00Z', device_id: 'z' },
  ), 'local');
});

test('remote snapshot wins when its timestamp is newer', () => {
  assert.equal(resolveSnapshotConflict(
    { updatedAt: '2026-01-01T00:00:00Z', deviceId: 'z' },
    { updated_at: '2026-01-02T00:00:00Z', device_id: 'a' },
  ), 'remote');
});

test('device id breaks equal-timestamp ties deterministically', () => {
  const local = { updatedAt: '2026-01-01T00:00:00Z', deviceId: 'device-b' };
  const remote = { updated_at: '2026-01-01T00:00:00Z', device_id: 'device-a' };
  assert.equal(resolveSnapshotConflict(local, remote), 'local');
  assert.equal(resolveSnapshotConflict(remote, local), 'remote');
});

test('invalid or absent timestamps fall back to the stable device id', () => {
  assert.equal(resolveSnapshotConflict(
    { updatedAt: 'not-a-date', deviceId: 'device-a' },
    { updated_at: null, device_id: 'device-z' },
  ), 'remote');
});

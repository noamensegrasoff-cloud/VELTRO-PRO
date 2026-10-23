import test from 'node:test';
import assert from 'node:assert/strict';
import { isSameLocalVersion, isFullCloudPage } from '../src/services/syncQueuePolicy.js';

test('an operation may mark only the exact local version it uploaded as synced', () => {
  const original = { updatedAt: '2026-10-23T10:00:00.000Z' };
  assert.equal(isSameLocalVersion(original, '2026-10-23T10:00:00.000Z'), true);
  assert.equal(isSameLocalVersion({ updatedAt: '2026-10-23T10:00:01.000Z' }, original.updatedAt), false);
  assert.equal(isSameLocalVersion(null, original.updatedAt), false);
});

test('cloud pagination continues only when a page is full', () => {
  assert.equal(isFullCloudPage(Array(1000).fill({}), 1000), true);
  assert.equal(isFullCloudPage(Array(999).fill({}), 1000), false);
  assert.equal(isFullCloudPage([], 1000), false);
});

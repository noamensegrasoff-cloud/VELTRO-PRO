import test from 'node:test';
import assert from 'node:assert/strict';
import { collectCloudRecordPages } from '../src/services/cloudStorage.js';

function makeRows(start, end) {
  return Array.from({ length: end - start }, (_, index) => ({
    record_id: `record-${String(start + index + 1).padStart(5, '0')}`,
  }));
}

test('cloud pagination continues past a server row cap smaller than the requested page size', async () => {
  const allRows = makeRows(0, 650);
  const requests = [];
  const rows = await collectCloudRecordPages(async request => {
    requests.push(request);
    const remaining = allRows.filter(row => request.afterRecordId === null || row.record_id > request.afterRecordId);
    // Simulate a Supabase project whose configured API cap is 250 rows.
    return {
      data: remaining.slice(0, 250),
      count: request.includeCount ? allRows.length : null,
      error: null,
    };
  }, { pageSize: 1000 });

  assert.equal(rows.length, 650);
  assert.equal(new Set(rows.map(row => row.record_id)).size, 650);
  assert.deepEqual(requests.map(request => request.afterRecordId), [
    null,
    'record-00250',
    'record-00500',
  ]);
  assert.deepEqual(requests.map(request => request.includeCount), [true, false, false]);
});

test('cloud pagination refuses to claim completion without an exact count', async () => {
  await assert.rejects(
    collectCloudRecordPages(async () => ({ data: [], count: null, error: null })),
    /exact row count/,
  );
});

test('cloud pagination reports an incomplete result when a later page is unexpectedly empty', async () => {
  let call = 0;
  await assert.rejects(
    collectCloudRecordPages(async () => {
      call += 1;
      return call === 1
        ? { data: makeRows(0, 2), count: 3, error: null }
        : { data: [], count: null, error: null };
    }, { pageSize: 2 }),
    /stopped after 2 of 3 rows/,
  );
});

test('cloud pagination rejects a page that does not advance its record-id cursor', async () => {
  let call = 0;
  await assert.rejects(
    collectCloudRecordPages(async () => {
      call += 1;
      return {
        data: call === 1 ? makeRows(0, 2) : [makeRows(0, 1)[0]],
        count: 3,
        error: null,
      };
    }, { pageSize: 2 }),
    /did not advance by record_id/,
  );
});

test('cloud pagination propagates transport errors without returning a partial list', async () => {
  const networkError = new Error('network unavailable');
  await assert.rejects(
    collectCloudRecordPages(async () => ({ data: [], count: 0, error: networkError })),
    error => error === networkError,
  );
});

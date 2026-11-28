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


test('cloud pagination refuses to return a collection when its row count changes during paging', async () => {
  const initialRows = makeRows(0, 4);
  let pageCalls = 0;
  await assert.rejects(
    collectCloudRecordPages(async request => {
      pageCalls += 1;
      const visibleRows = pageCalls === 1
        ? initialRows
        : [{ record_id: 'record-00000' }, ...initialRows];
      const remaining = visibleRows.filter(row => (
        request.afterRecordId === null || row.record_id > request.afterRecordId
      ));
      return {
        data: remaining.slice(0, 2),
        count: request.includeCount ? initialRows.length : null,
        error: null,
      };
    }, {
      pageSize: 2,
      // Simulate a concurrent insert whose ID sorts before the already-read cursor.
      verifyCount: async () => ({ count: 5, error: null }),
    }),
    /count changed during pagination/,
  );
  assert.equal(pageCalls, 2);
});

test('cloud pagination returns rows when the exact count is stable through the final verification', async () => {
  const allRows = makeRows(0, 3);
  const rows = await collectCloudRecordPages(async request => {
    const remaining = allRows.filter(row => (
      request.afterRecordId === null || row.record_id > request.afterRecordId
    ));
    return {
      data: remaining.slice(0, 2),
      count: request.includeCount ? allRows.length : null,
      error: null,
    };
  }, {
    pageSize: 2,
    verifyCount: async () => ({ count: allRows.length, error: null }),
  });
  assert.deepEqual(rows.map(row => row.record_id), allRows.map(row => row.record_id));
});

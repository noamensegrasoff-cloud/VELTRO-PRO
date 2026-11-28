import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const DEVICE_KEY = 'veltro-pro-device-id';

export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'ephemeral-device';
  }
}

export async function getCloudStatus() {
  if (!isSupabaseConfigured || !supabase) return 'not_configured';
  const { data, error } = await supabase.auth.getSession();
  if (error) return 'error';
  return data.session?.user ? 'connected' : 'configured';
}

function requireCloud() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Cloud storage is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

const CLOUD_RECORD_PAGE_SIZE = 1000;

/**
 * Collect every row from a keyset-paginated query.
 * The exact count is read once so a project-level PostgREST row cap below the
 * requested page size cannot make a truncated response look like completion.
 */
export async function collectCloudRecordPages(fetchPage, { pageSize = CLOUD_RECORD_PAGE_SIZE, verifyCount = null } = {}) {
  if (typeof fetchPage !== 'function') throw new Error('A cloud page loader is required.');
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new Error('pageSize must be a positive safe integer.');
  if (verifyCount !== null && typeof verifyCount !== 'function') throw new Error('verifyCount must be a function when provided.');

  const rows = [];
  let afterRecordId = null;
  let expectedCount = null;

  while (expectedCount === null || rows.length < expectedCount) {
    const response = await fetchPage({
      afterRecordId,
      pageSize,
      includeCount: expectedCount === null,
    });
    if (response?.error) throw response.error;

    const page = Array.isArray(response?.data) ? response.data : [];
    if (expectedCount === null) {
      if (!Number.isSafeInteger(response?.count) || response.count < 0) {
        throw new Error('The cloud query did not return an exact row count; refusing to treat a possibly truncated page as complete.');
      }
      expectedCount = response.count;
    }

    if (!page.length) {
      if (rows.length < expectedCount) {
        throw new Error(`Cloud pagination stopped after ${rows.length} of ${expectedCount} rows.`);
      }
      break;
    }

    for (const row of page) {
      if (row?.record_id == null || String(row.record_id) === '') {
        throw new Error('Cloud pagination returned a row without a record_id.');
      }
      const nextRecordId = String(row.record_id);
      if (afterRecordId !== null && nextRecordId <= afterRecordId) {
        throw new Error('Cloud pagination did not advance by record_id; refusing an incomplete sync.');
      }
      afterRecordId = nextRecordId;
      rows.push(row);
    }
  }

  if (verifyCount) {
    const verification = await verifyCount();
    if (verification?.error) throw verification.error;
    const finalCount = verification?.count;
    if (!Number.isSafeInteger(finalCount) || finalCount < 0) {
      throw new Error('The final cloud query did not return an exact row count; refusing to complete a potentially inconsistent pull.');
    }
    if (finalCount !== expectedCount) {
      throw new Error(`Cloud record count changed during pagination (expected ${expectedCount} rows at start, observed ${finalCount} at completion); refusing to return a potentially incomplete collection.`);
    }
  }

  return rows;
}

export async function getCloudRecords({ workspaceId, entityType, includeDeleted = false }) {
  if (!workspaceId || !entityType) throw new Error('workspaceId and entityType are required.');
  const client = requireCloud();
  const columns = 'workspace_id, entity_type, record_id, payload, updated_at, deleted_at, device_id';

  const applyScope = query => {
    let scoped = query
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType);
    if (!includeDeleted) scoped = scoped.is('deleted_at', null);
    return scoped;
  };

  return collectCloudRecordPages(({ afterRecordId, pageSize, includeCount }) => {
    let query = applyScope(client.from('cloud_records')
      .select(columns, includeCount ? { count: 'exact' } : undefined))
      .order('record_id', { ascending: true })
      .limit(pageSize);
    if (afterRecordId !== null) query = query.gt('record_id', afterRecordId);
    return query;
  }, {
    // A concurrent insert before the keyset cursor could otherwise be missed while
    // the first-page count still matches the number of rows collected. Re-check the
    // exact scoped count after paging and fail closed if the collection changed.
    verifyCount: async () => {
      const { count, error } = await applyScope(client.from('cloud_records')
        .select('record_id', { count: 'exact', head: true }));
      return { count, error };
    },
  });
}


/**
 * Fetch only the requested conflict snapshots. Avoid scanning/paginating an entire
 * entity collection (for example, a catalogue with tens of thousands of products).
 */
export async function getCloudRecordsByIds({ workspaceId, entityType, recordIds = [] } = {}) {
  if (!workspaceId || !entityType) throw new Error('workspaceId and entityType are required.');
  const ids = [...new Set((Array.isArray(recordIds) ? recordIds : [])
    .filter(recordId => recordId != null && String(recordId).length > 0)
    .map(String))];
  if (!ids.length) return [];

  const client = requireCloud();
  const batches = [];
  for (let index = 0; index < ids.length; index += 100) batches.push(ids.slice(index, index + 100));
  const results = await Promise.all(batches.map(async batch => {
    const { data, error } = await client.from('cloud_records')
      .select('workspace_id, entity_type, record_id, payload, updated_at, deleted_at, device_id')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType)
      .in('record_id', batch);
    if (error) throw error;
    return data || [];
  }));
  return results.flat();
}

export async function saveCloudRecord({ workspaceId, entityType, recordId, payload, expectedUpdatedAt = null, operationId = null }) {
  return syncCloudRecord({
    workspaceId, entityType, recordId, payload, expectedUpdatedAt, operationId, deleted: false,
  });
}

export async function deleteCloudRecord({ workspaceId, entityType, recordId, expectedUpdatedAt = null, operationId = null }) {
  return syncCloudRecord({
    workspaceId, entityType, recordId, payload: {}, expectedUpdatedAt, operationId, deleted: true,
  });
}

async function syncCloudRecord({ workspaceId, entityType, recordId, payload, expectedUpdatedAt, operationId, deleted }) {
  if (!workspaceId || !entityType || !recordId) {
    throw new Error('workspaceId, entityType and recordId are required.');
  }
  if (payload === undefined) throw new Error('payload is required.');

  // Never send an unkeyed cloud mutation. A stable operation ID is persisted in the
  // IndexedDB outbox (or legacy retry state) before this function is called.
  const stableOperationId = typeof operationId === 'string' ? operationId.trim() : '';
  if (!stableOperationId) {
    const error = new Error('A stable operationId is required for every cloud record write.');
    error.code = 'SYNC_IDEMPOTENCY_REQUIRED';
    throw error;
  }

  const client = requireCloud();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Sign in before synchronizing cloud records.');

  const { data, error } = await client.rpc('sync_cloud_record_cas', {
    p_workspace_id: workspaceId,
    p_entity_type: entityType,
    p_record_id: String(recordId),
    p_payload: payload,
    p_device_id: getDeviceId(),
    p_operation_id: stableOperationId,
    p_expected_updated_at: expectedUpdatedAt,
    p_deleted: deleted,
  });
  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || result.sync_status !== 'synced' || !result.record_data) {
    const conflict = new Error('SYNC_CONFLICT: The cloud record changed on another device. The pending local change was kept.');
    conflict.code = 'SYNC_CONFLICT';
    throw conflict;
  }
  return result.record_data;
}

import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import {
  adoptLocalRecordsIntoWorkspace,
  getActiveWorkspaceId,
  listPendingSyncOperations,
  filterPendingSyncOperationsForWorkspace,
  listWorkspaceAdoptionConflicts,
  normalizePendingSyncOperations,
  markLocalRecordSynced,
  mergeCloudRecord,
  removePendingSyncOperation,
} from './localDatabase.js';
import { deleteCloudRecord, getCloudRecords, saveCloudRecord } from './cloudStorage.js';
import {
  LEGACY_STORAGE_OPERATION_IDS_KEY,
  classifyLegacyStorageChange,
  getStableLegacyStorageOperationId,
  clearLegacyStorageOperationId,
} from './legacyStorageSync.js';

let syncInFlight = null;

// A sync pass is complete only when its workspace outbox is empty at the final
// acknowledgement check. Local edits can be queued while an earlier upload is in flight.
export function buildSyncCompletionResult(pendingOperations, {
  pushed = 0,
  pulled = 0,
  workspaceId = null,
  conflicts = [],
  error = null,
} = {}) {
  const pending = Array.isArray(pendingOperations) ? pendingOperations.length : 0;
  if (conflicts.length) {
    return {
      status: 'conflict',
      pushed,
      pulled,
      workspaceId,
      pending,
      conflicts,
      conflict: conflicts[0],
      ...(error ? { error } : {}),
    };
  }
  return {
    status: pending > 0 ? 'pending' : 'synced',
    pushed,
    pulled,
    workspaceId,
    pending,
  };
}

export async function processPendingSyncOperations(operations, {
  workspaceId,
  initialPushed = 0,
  uploadOperation,
  acknowledgeOperation,
  onProgress,
} = {}) {
  if (typeof uploadOperation !== 'function' || typeof acknowledgeOperation !== 'function') {
    throw new Error('Upload and acknowledgement handlers are required to process the sync outbox.');
  }

  const queue = Array.isArray(operations) ? operations : [];
  const pendingKeys = new Set(queue.map(operation => operation.recordKey).filter(Boolean));
  const conflicts = [];
  let pushed = initialPushed;
  let conflictError = null;

  for (const operation of queue) {
    try {
      const result = await uploadOperation(operation, workspaceId);
      await acknowledgeOperation(operation, result);
      pendingKeys.delete(operation.recordKey);
      pushed += 1;
      onProgress?.({ phase: 'upload', completed: pushed, total: queue.length });
    } catch (error) {
      if (error?.code === 'SYNC_CONFLICT') {
        conflictError ||= error;
        conflicts.push({
          entityType: operation.entityType,
          recordId: operation.recordId,
          operation: operation.operation,
          operationId: operation.operationId || null,
        });
        // A conflict belongs to one record. Keep that operation queued, but do not
        // let it block unrelated records in the same workspace outbox.
        continue;
      }
      return { status: 'partial', pushed, pendingKeys, conflicts, error };
    }
  }

  return {
    status: 'complete',
    pushed,
    pendingKeys,
    conflicts,
    error: conflictError,
  };
}

const LEGACY_STORAGE_ENTITY = 'local_storage';
const LEGACY_STORAGE_BASELINE_KEY = 'veltro.cloud-sync.local-storage-baseline.v1';
const LEGACY_STORAGE_EXCLUDED = /^(?:veltro\.purchases\.v1|veltro-pro-auth|veltro-pro-device-id|veltro\.theme(?:\.palette\.v2)?|veltro\.language|veltro\.cloud-sync\.local-storage-baseline\.v1|veltro-products-catalog-v1|veltro-products-conflicts-v1|sb-[^-]+-auth-token)$/i;

function readStorageBaseline() {
  const raw = localStorage.getItem(LEGACY_STORAGE_BASELINE_KEY);
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Legacy cloud-sync baseline is corrupt; refusing to overwrite local or cloud settings.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Legacy cloud-sync baseline is invalid; refusing to overwrite local or cloud settings.');
  }
  return parsed;
}

function writeStorageBaseline(baseline) {
  localStorage.setItem(LEGACY_STORAGE_BASELINE_KEY, JSON.stringify(baseline));
}

function isSyncableStorageKey(key) {
  if (!key || key === LEGACY_STORAGE_OPERATION_IDS_KEY || LEGACY_STORAGE_EXCLUDED.test(key)) return false;
  // Sync business records/settings only; do not replicate arbitrary browser or auth state.
  return /^(?:veltro[._-]|products$|categories$|sales$|purchases$|customers$|suppliers$|orders$|invoices$|expenses$|stock$)/i.test(key);
}

async function syncLegacyLocalStorage(workspaceId) {
  if (typeof localStorage === 'undefined') return { pushed: 0, pulled: 0 };
  const baseline = readStorageBaseline();
  const local = new Map();
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!isSyncableStorageKey(key)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) local.set(key, value);
  }

  const cloudRows = await getCloudRecords({
    workspaceId, entityType: LEGACY_STORAGE_ENTITY, includeDeleted: true,
  });
  const remote = new Map(cloudRows.map(row => [String(row.record_id), row]));
  const keys = new Set([...local.keys(), ...Object.keys(baseline), ...remote.keys()]);
  let pushed = 0;
  let pulled = 0;

  for (const key of keys) {
    if (!isSyncableStorageKey(key)) continue;
    const localValue = local.has(key) ? local.get(key) : null;
    const oldValue = Object.prototype.hasOwnProperty.call(baseline, key) ? baseline[key] : undefined;
    const row = remote.get(key);
    const remoteValue = row && !row.deleted_at && typeof row.payload?.value === 'string'
      ? row.payload.value : null;

    const decision = classifyLegacyStorageChange({
      localValue,
      baselineValue: oldValue,
      remoteValue,
      baselineExists: oldValue !== undefined,
      rowExists: Boolean(row),
    });

    if (decision === 'conflict') {
      const error = new Error('Both this device and the cloud changed the same legacy setting since the last acknowledged snapshot.');
      error.code = 'SYNC_CONFLICT';
      error.conflict = {
        entityType: LEGACY_STORAGE_ENTITY,
        recordId: key,
        operation: 'legacy_local_storage',
      };
      error.pushed = pushed;
      error.pulled = pulled;
      throw error;
    }

    if (decision === 'adopt_remote' || decision === 'pull_remote') {
      if (remoteValue === null) localStorage.removeItem(key);
      else localStorage.setItem(key, remoteValue);
      baseline[key] = remoteValue;
      writeStorageBaseline(baseline);
      try { clearLegacyStorageOperationId(key); } catch {}
      pulled += 1;
      continue;
    }

    if (decision === 'converged') {
      baseline[key] = localValue;
      writeStorageBaseline(baseline);
      try { clearLegacyStorageOperationId(key); } catch {}
      continue;
    }

    if (decision === 'push_local') {
      // Persist the idempotency key before sending. If the response is lost, the next
      // retry reuses this key; if the local value changes, a new key is allocated.
      const operationId = getStableLegacyStorageOperationId(key, localValue);
      if (localValue === null) {
        await deleteCloudRecord({
          workspaceId,
          entityType: LEGACY_STORAGE_ENTITY,
          recordId: key,
          expectedUpdatedAt: row?.updated_at || null,
          operationId,
        });
      } else {
        await saveCloudRecord({
          workspaceId,
          entityType: LEGACY_STORAGE_ENTITY,
          recordId: key,
          payload: { value: localValue },
          expectedUpdatedAt: row?.updated_at || null,
          operationId,
        });
      }
      baseline[key] = localValue;
      // Baseline must be durable before discarding the retry key.
      writeStorageBaseline(baseline);
      try { clearLegacyStorageOperationId(key); } catch {}
      pushed += 1;
      continue;
    }

    if (decision === 'unchanged') {
      try { clearLegacyStorageOperationId(key); } catch {}
    }
  }

  return { pushed, pulled };
}

export async function getOrCreateWorkspace() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error('Sign in to enable cloud synchronization.');

  // An invited employee is a member of the owner's workspace, not its creator.
  // Resolve memberships before considering workspace creation so employees never
  // accidentally create a separate, empty workspace after accepting an invitation.
  const { data: memberships, error: membershipsError } = await supabase
    .from('workspace_members')
    .select('workspace_id,role,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (membershipsError) throw membershipsError;

  let workspace = null;
  if (memberships?.length) {
    const workspaceIds = [...new Set(memberships.map(item => item.workspace_id).filter(Boolean))];
    const { data: memberWorkspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id,name,created_by,created_at')
      .in('id', workspaceIds);
    if (workspacesError) throw workspacesError;

    const byId = new Map((memberWorkspaces || []).map(item => [item.id, item]));
    const candidates = memberships
      .map(membership => ({ membership, workspace: byId.get(membership.workspace_id) }))
      .filter(item => item.workspace);
    candidates.sort((a, b) => {
      // Keep the creator on their own workspace; otherwise prefer owner membership,
      // then the oldest membership for a stable choice when an account has several.
      const aOwn = a.workspace.created_by === user.id ? 1 : 0;
      const bOwn = b.workspace.created_by === user.id ? 1 : 0;
      if (aOwn !== bOwn) return bOwn - aOwn;
      const aOwner = a.membership.role === 'owner' ? 1 : 0;
      const bOwner = b.membership.role === 'owner' ? 1 : 0;
      if (aOwner !== bOwner) return bOwner - aOwner;
      return String(a.membership.created_at || '').localeCompare(String(b.membership.created_at || ''));
    });
    workspace = candidates[0]?.workspace || null;
    if (!workspace) throw new Error('Your workspace membership exists, but its workspace could not be loaded.');
  }

  if (!workspace) {
    const { data: existing, error: lookupError } = await supabase
      .from('workspaces')
      .select('id,name')
      .eq('created_by', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (existing) {
      // Do not try to grant the caller owner access from the client. The database
      // creates the owner membership when a workspace is created; a missing row
      // here is an inconsistent state that must be repaired by an authorized owner.
      throw new Error('Your workspace exists but its owner membership is missing. Please contact support.');
    }

    const label = user.user_metadata?.store_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'VELTRO Workspace';
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name: label, created_by: user.id })
      .select('id,name')
      .single();
    if (error) throw error;
    workspace = data;
  }

  await adoptLocalRecordsIntoWorkspace(workspace.id);
  return workspace;
}

const DEFAULT_ENTITY_TYPES = [
  // Catalog and inventory
  'products', 'product_variants', 'categories', 'brands', 'units', 'barcodes',
  'stock', 'stock_levels', 'stock_movements', 'inventory_counts', 'inventory_adjustments',
  // Sales, invoices, returns and pending work
  'sales', 'sales_drafts', 'invoices', 'invoice_items', 'sales_returns',
  'sales_return_items', 'quotes', 'orders', 'pending_invoices', 'held_sales',
  // Purchases and supplier accounts
  'purchases', 'purchase_drafts', 'purchase_invoices', 'purchase_items',
  'purchase_returns', 'suppliers', 'supplier_accounts', 'supplier_payments',
  'supplier_ledger', 'supplier_debts',
  // Customers, balances and collections
  'customers', 'customer_accounts', 'customer_payments', 'customer_ledger',
  'customer_debts', 'receipts',
  // Cash, expenses and reporting source data
  'cash_registers', 'cash_sessions', 'cash_movements', 'expenses', 'income',
  'payments', 'refunds', 'stock_transfers', 'stock_alerts',
  // Store setup and operations
  'settings', 'business_profile', 'branches', 'employees', 'users', 'roles',
  'permissions', 'orders', 'notifications', 'audit_logs',
  // Legacy entity names already used by the app
  'sales', 'purchases', 'stock_movements', 'cash_movements',
];

export async function syncWorkspace({ entityTypes = DEFAULT_ENTITY_TYPES, onProgress } = {}) {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    if (!isSupabaseConfigured || !supabase) return { status: 'not_configured', pushed: 0, pulled: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { status: 'offline', pushed: 0, pulled: 0 };

    const workspace = await getOrCreateWorkspace();
    // Persist stable operation IDs for older outbox rows before any network retry.
    await normalizePendingSyncOperations();
    const allPending = await listPendingSyncOperations();
    // Do not send an operation from a different workspace using the current user's
    // active workspace ID. Keep those operations queued until that workspace is active.
    const pending = filterPendingSyncOperationsForWorkspace(allPending, workspace.id);
    let pushed = 0;
    let pulled = 0;
    const conflicts = [];
    let firstConflictError = null;
    // Bridge existing sections that still persist directly to localStorage into cloud_records.
    // This keeps legacy screens working while their CRUD flows migrate to the shared repository.
    try {
      const legacy = await syncLegacyLocalStorage(workspace.id);
      pushed += legacy.pushed;
      pulled += legacy.pulled;
    } catch (error) {
      pushed += Number(error?.pushed) || 0;
      pulled += Number(error?.pulled) || 0;
      if (error?.code === 'SYNC_CONFLICT') {
        conflicts.push(error.conflict || { operation: 'legacy_local_storage' });
        firstConflictError ||= error;
      } else {
        return { status: 'partial', pushed, pulled, error, workspaceId: workspace.id };
      }
    }

    const queueResult = await processPendingSyncOperations(pending, {
      workspaceId: workspace.id,
      initialPushed: pushed,
      uploadOperation: async operation => {
        if (operation.operation === 'delete') {
          return deleteCloudRecord({
            workspaceId: workspace.id,
            entityType: operation.entityType,
            recordId: operation.recordId,
            expectedUpdatedAt: operation.expectedCloudUpdatedAt || null,
            operationId: operation.operationId || null,
          });
        }
        return saveCloudRecord({
          workspaceId: workspace.id,
          entityType: operation.entityType,
          recordId: operation.recordId,
          payload: operation.payload,
          expectedUpdatedAt: operation.expectedCloudUpdatedAt || null,
          operationId: operation.operationId || null,
        });
      },
      acknowledgeOperation: async (operation, result) => {
        await markLocalRecordSynced(
          operation.recordKey,
          operation.updatedAt || operation.createdAt,
          result?.updated_at || result?.updatedAt,
          operation.operationId || null,
        );
        await removePendingSyncOperation(
          operation.id,
          operation.updatedAt || operation.createdAt,
          operation.operationId || null,
        );
      },
      onProgress,
    });
    pushed = queueResult.pushed;
    const pendingKeys = queueResult.pendingKeys;
    conflicts.push(...queueResult.conflicts);
    firstConflictError ||= queueResult.error?.code === 'SYNC_CONFLICT' ? queueResult.error : null;
    if (queueResult.status === 'partial') {
      return {
        status: 'partial',
        pushed,
        pulled,
        error: queueResult.error,
        workspaceId: workspace.id,
        conflicts,
      };
    }

    const types = [...new Set(entityTypes.filter(Boolean))];
    for (const entityType of types) {
      const rows = await getCloudRecords({ workspaceId: workspace.id, entityType, includeDeleted: true });
      for (const row of rows) {
        const key = [workspace.id, row.entity_type, String(row.record_id)].join('::');
        if (pendingKeys.has(key)) continue;
        await mergeCloudRecord(row, workspace.id);
        pulled += 1;
      }
      onProgress?.({ phase: 'download', entityType, completed: pulled });
    }

    const adoptionConflicts = await listWorkspaceAdoptionConflicts(workspace.id);
    conflicts.push(...adoptionConflicts.map(conflict => ({
      ...conflict,
      operation: 'workspace_adoption',
    })));

    // Re-read after downloads as well: an edit may have entered IndexedDB while
    // this pass was uploading an older snapshot. Never report "synced" with work queued.
    const remainingPending = filterPendingSyncOperationsForWorkspace(
      await listPendingSyncOperations(),
      workspace.id,
    );
    return buildSyncCompletionResult(remainingPending, {
      pushed,
      pulled,
      workspaceId: workspace.id,
      conflicts,
      error: firstConflictError,
    });
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

export function subscribeToAuthChanges(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback?.({ event, session, user: session?.user || null });
  });
  return () => data.subscription.unsubscribe();
}

export function startAutoSync({ entityTypes = DEFAULT_ENTITY_TYPES, onStatus } = {}) {
  let stopped = false;
  const run = async () => {
    if (stopped) return;
    try {
      const result = await syncWorkspace({ entityTypes });
      if (!stopped) onStatus?.(result);
    } catch (error) {
      if (!stopped) onStatus?.({ status: 'error', error });
    }
  };
  const onOnline = () => { void run(); };
  const onFocus = () => { if (typeof document === 'undefined' || document.visibilityState === 'visible') void run(); };
  const onVisibility = () => { if (document.visibilityState === 'visible') void run(); };
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
  }
  const unsubscribeAuth = subscribeToAuthChanges(({ event, session }) => {
    if (session?.user && ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
      void run();
    }
  });
  if (typeof navigator === 'undefined' || navigator.onLine) void run();
  return () => {
    stopped = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    }
    unsubscribeAuth();
  };
}

export async function getDatabaseStatus() {
  const localWorkspaceId = await getActiveWorkspaceId();
  if (!isSupabaseConfigured || !supabase) {
    return { local: 'ready', cloud: 'not_configured', workspaceId: localWorkspaceId };
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) return { local: 'ready', cloud: 'error', workspaceId: localWorkspaceId, error };
  if (!data.session?.user) return { local: 'ready', cloud: 'sign_in_required', workspaceId: localWorkspaceId };
  return { local: 'ready', cloud: 'ready', workspaceId: localWorkspaceId };
}

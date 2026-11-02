import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import {
  adoptLocalRecordsIntoWorkspace,
  getActiveWorkspaceId,
  listPendingSyncOperations,
  markLocalRecordSynced,
  mergeCloudRecord,
  removePendingSyncOperation,
  getLocalRecord,
  saveLocalRecord,
} from './localDatabase.js';
import { deleteCloudRecord, getCloudRecords, saveCloudRecord } from './cloudStorage.js';

let syncInFlight = null;

const LEGACY_STORAGE_ENTITY = 'local_storage';
const LEGACY_STORAGE_BASELINE_KEY = 'veltro.cloud-sync.local-storage-baseline.v1';
const LEGACY_STORAGE_OWNER_KEY = 'veltro.cloud-sync.local-storage-owner.v1';
const LEGACY_STORAGE_SNAPSHOT_ENTITY = 'legacy_storage_snapshot';
const LEGACY_STORAGE_EXCLUDED = /^(?:veltro-pro-auth|veltro-pro-device-id|veltro\.theme(?:\.palette\.v2)?|veltro\.language|veltro\.cloud-sync\.local-storage-baseline\.v1|veltro-products-catalog-v1|veltro\.cloud-sync\.local-storage-owner\.v1|veltro-products-conflicts-v1|sb-[^-]+-auth-token)$/i;

function readStorageBaseline() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_STORAGE_BASELINE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function isSyncableStorageKey(key) {
  if (!key || LEGACY_STORAGE_EXCLUDED.test(key)) return false;
  // Sync business records/settings only; do not replicate arbitrary browser or auth state.
  return /^(?:veltro[._-]|products$|categories$|sales$|purchases$|customers$|suppliers$|orders$|invoices$|expenses$|stock$)/i.test(key);
}

function isAccountScopedStorageKey(key) {
  return isSyncableStorageKey(key) || key === 'veltro-products-catalog-v1' || key === 'veltro-products-conflicts-v1';
}

async function switchLegacyStorageOwner(workspaceId, userId) {
  if (!userId || !workspaceId || typeof localStorage === 'undefined') return;
  const ownerToken = `${userId}:${workspaceId}`;
  const currentOwner = localStorage.getItem(LEGACY_STORAGE_OWNER_KEY);
  if (!currentOwner) {
    // Existing installations have one shared local catalog. Claim it for the
    // account already signed in rather than discarding data during migration.
    localStorage.setItem(LEGACY_STORAGE_OWNER_KEY, ownerToken);
    return;
  }
  if (currentOwner === ownerToken) return;

  const values = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (isAccountScopedStorageKey(key)) {
      const value = localStorage.getItem(key);
      if (value !== null) values[key] = value;
    }
  }

  // Preserve unsynced local edits in IndexedDB under their original account.
  await saveLocalRecord({
    entityType: LEGACY_STORAGE_SNAPSHOT_ENTITY,
    recordId: 'active',
    workspaceId: currentOwner,
    queueForSync: false,
    payload: { values, baseline: readStorageBaseline() },
  });

  Object.keys(values).forEach(key => localStorage.removeItem(key));
  const snapshot = await getLocalRecord({
    entityType: LEGACY_STORAGE_SNAPSHOT_ENTITY,
    recordId: 'active',
    workspaceId: ownerToken,
  });
  const nextValues = snapshot?.payload?.values;
  if (nextValues && typeof nextValues === 'object' && !Array.isArray(nextValues)) {
    for (const [key, value] of Object.entries(nextValues)) {
      if (isAccountScopedStorageKey(key) && typeof value === 'string') localStorage.setItem(key, value);
    }
  }
  const nextBaseline = snapshot?.payload?.baseline;
  localStorage.setItem(
    LEGACY_STORAGE_BASELINE_KEY,
    JSON.stringify(nextBaseline && typeof nextBaseline === 'object' && !Array.isArray(nextBaseline) ? nextBaseline : {}),
  );
  localStorage.setItem(LEGACY_STORAGE_OWNER_KEY, ownerToken);
}

async function syncLegacyLocalStorage(workspaceId, userId) {
  const ownerToken = `${userId}:${workspaceId}`;
  await switchLegacyStorageOwner(workspaceId, userId);
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

    // On a new device, adopt existing cloud data rather than overwrite it with defaults.
    if (oldValue === undefined && row) {
      if (remoteValue === null) {
        if (localValue !== null) localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, remoteValue);
      }
      baseline[key] = remoteValue;
      pulled += 1;
      continue;
    }

    const localChanged = localValue !== oldValue;
    const remoteChanged = (remoteValue !== oldValue) || (!row && oldValue !== undefined);
    if (localChanged) {
      if (localValue === null) {
        await deleteCloudRecord({ workspaceId, entityType: LEGACY_STORAGE_ENTITY, recordId: key });
        baseline[key] = null;
      } else {
        await saveCloudRecord({
          workspaceId, entityType: LEGACY_STORAGE_ENTITY, recordId: key,
          payload: { value: localValue },
        });
        baseline[key] = localValue;
      }
      pushed += 1;
      continue;
    }

    if (remoteChanged) {
      if (remoteValue === null) localStorage.removeItem(key);
      else localStorage.setItem(key, remoteValue);
      baseline[key] = remoteValue;
      pulled += 1;
    }
  }

  localStorage.setItem(LEGACY_STORAGE_BASELINE_KEY, JSON.stringify(baseline));
  const snapshotValues = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (isAccountScopedStorageKey(key)) {
      const value = localStorage.getItem(key);
      if (value !== null) snapshotValues[key] = value;
    }
  }
  await saveLocalRecord({
    entityType: LEGACY_STORAGE_SNAPSHOT_ENTITY,
    recordId: 'active',
    workspaceId: ownerToken,
    queueForSync: false,
    payload: { values: snapshotValues, baseline },
  });
  return { pushed, pulled };
}

export async function getOrCreateWorkspace() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error('Sign in to enable cloud synchronization.');

  // Employees must join the creator's workspace. Looking up workspaces only by
  // created_by silently created a second, empty workspace for every employee.
  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (membershipError) throw membershipError;

  let membership = Array.isArray(memberships) && memberships.length
    ? memberships.find(item => item.role !== 'owner') || memberships.find(item => item.role === 'owner') || memberships[0]
    : null;
  let workspace = null;

  if (membership?.workspace_id) {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', membership.workspace_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Your workspace membership exists, but its workspace could not be loaded.');
    workspace = data;
  } else {
    const label = user.user_metadata?.store_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'VELTRO Workspace';
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name: label, created_by: user.id })
      .select('id, name')
      .single();
    if (error) throw error;
    workspace = data;
    // The database trigger creates the owner membership atomically.
    membership = { workspace_id: workspace.id, role: 'owner' };
  }

  await adoptLocalRecordsIntoWorkspace(workspace.id);
  return { ...workspace, userId: user.id, memberRole: membership?.role || 'member' };
}
const DEFAULT_ENTITY_TYPES = [
  // Catalog and inventory
  'products', 'product_variants', 'categories', 'brands', 'units', 'barcodes',
  'stock', 'stock_levels', 'stock_movements', 'product_movements', 'inventory_counts', 'inventory_adjustments',
  // Sales, invoices, returns and pending work
  'sales', 'sales_invoices', 'sales_drafts', 'invoices', 'invoice_items', 'sales_returns',
  'sales_return_items', 'quotes', 'orders', 'pending_invoices', 'held_sales',
  // Purchases and supplier accounts
  'purchases', 'purchase_receipts', 'purchase_drafts', 'purchase_invoices', 'purchase_items',
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
    const pending = (await listPendingSyncOperations()).filter(operation => operation.workspaceId === workspace.id);
    let pushed = 0;
    let pulled = 0;
    // Bridge existing sections that still persist directly to localStorage into cloud_records.
    // This keeps legacy screens working while their CRUD flows migrate to the shared repository.
    try {
      const legacy = await syncLegacyLocalStorage(workspace.id, workspace.userId);
      pushed += legacy.pushed;
      pulled += legacy.pulled;
    } catch (error) {
      return { status: 'partial', pushed, pulled, error, workspaceId: workspace.id };
    }
    const pendingKeys = new Set(pending.map(item => item.recordKey));

    for (const operation of pending) {
      try {
        if (operation.operation === 'delete') {
          await deleteCloudRecord({
            workspaceId: workspace.id,
            entityType: operation.entityType,
            recordId: operation.recordId,
          });
        } else {
          await saveCloudRecord({
            workspaceId: workspace.id,
            entityType: operation.entityType,
            recordId: operation.recordId,
            payload: operation.payload,
          });
        }
        await markLocalRecordSynced(operation.recordKey);
        await removePendingSyncOperation(operation.id);
        pendingKeys.delete(operation.recordKey);
        pushed += 1;
        onProgress?.({ phase: 'upload', completed: pushed, total: pending.length });
      } catch (error) {
        // Keep the operation in the outbox for a later retry; never discard unsynced data.
        return { status: 'partial', pushed, pulled, error, workspaceId: workspace.id };
      }
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

    return { status: 'synced', pushed, pulled, workspaceId: workspace.id };
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
  if (typeof window !== 'undefined') window.addEventListener('online', onOnline);
  const unsubscribeAuth = subscribeToAuthChanges(({ event, session }) => {
    if (session?.user && ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
      void run();
    }
  });
  if (typeof navigator === 'undefined' || navigator.onLine) void run();
  return () => {
    stopped = true;
    if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
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

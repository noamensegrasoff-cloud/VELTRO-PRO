import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  listPendingSyncOperations,
  markLocalRecordSynced,
  mergeCloudRecord,
  removePendingSyncOperation,
} from './localDatabase.js';
import { deleteCloudRecord, getCloudRecords, saveCloudRecord } from './cloudStorage.js';

let syncInFlight = null;

export async function getOrCreateWorkspace() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error('Sign in to enable cloud synchronization.');

  const { data: existing, error: lookupError } = await supabase
    .from('workspaces')
    .select('id,name')
    .eq('created_by', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;

  let workspace = existing;
  if (!workspace) {
    const label = user.user_metadata?.store_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'VELTRO Workspace';
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name: label, created_by: user.id })
      .select('id,name')
      .single();
    if (error) throw error;
    workspace = data;
  }

  const { data: membership, error: membershipLookupError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipLookupError) throw membershipLookupError;
  if (!membership) {
    const { error } = await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    });
    if (error) throw error;
  }

  // Select the workspace without importing records from the old local-device
  // namespace. Migration must be a separate, explicit, user-approved action.
  await setActiveWorkspaceId(workspace.id);
  return workspace;
}

const DEFAULT_ENTITY_TYPES = [
  'products', 'categories', 'sales', 'sales_drafts', 'invoices',
  'purchases', 'purchase_drafts', 'suppliers', 'customers', 'orders',
  'cash_movements', 'expenses', 'settings', 'stock_movements',
];

export async function syncWorkspace({ entityTypes = DEFAULT_ENTITY_TYPES, onProgress } = {}) {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    if (!isSupabaseConfigured || !supabase) return { status: 'not_configured', pushed: 0, pulled: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { status: 'offline', pushed: 0, pulled: 0 };

    const workspace = await getOrCreateWorkspace();
    const pending = await listPendingSyncOperations();
    let pushed = 0;
    let pulled = 0;
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
        await markLocalRecordSynced(operation.recordKey, operation.createdAt);
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
  // Periodic retry covers transient failures even when the browser never emits
  // another online event. syncWorkspace remains single-flight per tab.
  const retryTimer = typeof window !== 'undefined'
    ? window.setInterval(() => { void run(); }, 30_000)
    : null;
  const unsubscribeAuth = subscribeToAuthChanges(({ event, session }) => {
    if (session?.user && ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
      void run();
    }
  });
  if (typeof navigator === 'undefined' || navigator.onLine) void run();
  return () => {
    stopped = true;
    if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
    if (retryTimer !== null && typeof window !== 'undefined') window.clearInterval(retryTimer);
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

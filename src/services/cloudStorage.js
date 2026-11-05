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

export async function getCloudRecords({ workspaceId, entityType, includeDeleted = false }) {
  if (!workspaceId || !entityType) throw new Error('workspaceId and entityType are required.');
  const client = requireCloud();
  let query = client.from('cloud_records')
    .select('workspace_id, entity_type, record_id, payload, updated_at, deleted_at, device_id')
    .eq('workspace_id', workspaceId)
    .eq('entity_type', entityType)
    .order('updated_at', { ascending: true });
  if (!includeDeleted) query = query.is('deleted_at', null);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function saveCloudRecord({ workspaceId, entityType, recordId, payload, expectedUpdatedAt = null }) {
  return syncCloudRecord({
    workspaceId, entityType, recordId, payload, expectedUpdatedAt, deleted: false,
  });
}

export async function deleteCloudRecord({ workspaceId, entityType, recordId, expectedUpdatedAt = null }) {
  return syncCloudRecord({
    workspaceId, entityType, recordId, payload: {}, expectedUpdatedAt, deleted: true,
  });
}

async function syncCloudRecord({ workspaceId, entityType, recordId, payload, expectedUpdatedAt, deleted }) {
  if (!workspaceId || !entityType || !recordId) {
    throw new Error('workspaceId, entityType and recordId are required.');
  }
  if (payload === undefined) throw new Error('payload is required.');
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

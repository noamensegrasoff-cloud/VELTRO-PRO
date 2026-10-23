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

export async function saveCloudRecord({ workspaceId, entityType, recordId, payload }) {
  if (!workspaceId || !entityType || !recordId) {
    throw new Error('workspaceId, entityType and recordId are required.');
  }
  if (payload === undefined) throw new Error('payload is required.');
  const client = requireCloud();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Sign in before saving cloud records.');
  const { data, error } = await client.from('cloud_records').upsert({
    workspace_id: workspaceId,
    entity_type: entityType,
    record_id: String(recordId),
    payload,
    device_id: getDeviceId(),
    updated_by: authData.user.id,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }, { onConflict: 'workspace_id,entity_type,record_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCloudRecord({ workspaceId, entityType, recordId }) {
  if (!workspaceId || !entityType || !recordId) {
    throw new Error('workspaceId, entityType and recordId are required.');
  }
  const client = requireCloud();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Sign in before deleting cloud records.');
  const now = new Date().toISOString();
  // Upsert a tombstone so deleting a record that never reached the cloud
  // still syncs successfully and can propagate to other devices.
  const { data, error } = await client.from('cloud_records').upsert({
    workspace_id: workspaceId,
    entity_type: entityType,
    record_id: String(recordId),
    payload: {},
    deleted_at: now,
    updated_at: now,
    updated_by: authData.user.id,
    device_id: getDeviceId(),
  }, { onConflict: 'workspace_id,entity_type,record_id' }).select().single();
  if (error) throw error;
  return data;
}

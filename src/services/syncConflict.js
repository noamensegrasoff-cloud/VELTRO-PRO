/**
 * Deterministic conflict policy for cloud_records snapshots.
 *
 * Newer updatedAt wins. If timestamps tie, the lexicographically greater
 * stable deviceId wins so two clients make the same decision. This is a
 * client-side convergence rule, not an atomic server-side compare-and-swap;
 * server CAS is still required before claiming protection from concurrent writes.
 */
export function resolveSnapshotConflict(local, remote) {
  if (!local) return 'remote';
  if (!remote) return 'local';

  const localTime = Date.parse(local.updatedAt || '') || 0;
  const remoteTime = Date.parse(remote.updated_at || remote.updatedAt || '') || 0;
  if (localTime > remoteTime) return 'local';
  if (remoteTime > localTime) return 'remote';

  const localDevice = String(local.deviceId || '');
  const remoteDevice = String(remote.device_id || remote.deviceId || '');
  return localDevice > remoteDevice ? 'local' : 'remote';
}

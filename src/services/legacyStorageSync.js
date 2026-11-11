export const LEGACY_STORAGE_OPERATION_IDS_KEY = 'veltro.cloud-sync.legacy-operation-ids.v1';

function createOperationId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function fingerprint(value) {
  const source = value === null ? 'null:' : `string:${String(value)}`;
  let hash = 14695981039346656037n;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= BigInt(source.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return `${source.length}:${hash.toString(16)}`;
}

function readOperationState(storage) {
  if (!storage) throw new Error('Local storage is unavailable for legacy sync idempotency.');
  const raw = storage.getItem(LEGACY_STORAGE_OPERATION_IDS_KEY);
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Legacy sync idempotency state is corrupt; refusing to send an unkeyed write.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Legacy sync idempotency state is invalid; refusing to send an unkeyed write.');
  }
  return parsed;
}

export function getStableLegacyStorageOperationId(storageKey, value, storage = globalThis.localStorage) {
  if (!storageKey) throw new Error('A legacy storage key is required.');
  const state = readOperationState(storage);
  const valueFingerprint = fingerprint(value);
  const existing = state[storageKey];
  if (existing?.operationId && existing.fingerprint === valueFingerprint) {
    return existing.operationId;
  }

  const operationId = createOperationId();
  state[storageKey] = { operationId, fingerprint: valueFingerprint };
  // If this write fails, propagate before any cloud request is made.
  storage.setItem(LEGACY_STORAGE_OPERATION_IDS_KEY, JSON.stringify(state));
  return operationId;
}

export function clearLegacyStorageOperationId(storageKey, storage = globalThis.localStorage) {
  if (!storageKey) return;
  const state = readOperationState(storage);
  if (!Object.prototype.hasOwnProperty.call(state, storageKey)) return;
  delete state[storageKey];
  if (Object.keys(state).length) {
    storage.setItem(LEGACY_STORAGE_OPERATION_IDS_KEY, JSON.stringify(state));
  } else {
    storage.removeItem(LEGACY_STORAGE_OPERATION_IDS_KEY);
  }
}

export function classifyLegacyStorageChange({
  localValue,
  baselineValue,
  remoteValue,
  baselineExists,
  rowExists,
}) {
  // A new device must adopt an existing cloud value before considering local defaults.
  if (!baselineExists && rowExists) return 'adopt_remote';

  const localChanged = localValue !== baselineValue;
  const remoteChanged = remoteValue !== baselineValue || (!rowExists && baselineExists);

  if (localChanged && remoteChanged) {
    return localValue === remoteValue ? 'converged' : 'conflict';
  }
  if (localChanged) return 'push_local';
  if (remoteChanged) return 'pull_remote';
  return 'unchanged';
}

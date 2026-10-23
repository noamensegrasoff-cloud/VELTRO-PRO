// Small, deterministic rules shared by the sync engine and its Node tests.
export function isSameLocalVersion(record, operationCreatedAt) {
  return Boolean(record && operationCreatedAt && record.updatedAt === operationCreatedAt);
}

export function isFullCloudPage(rows, pageSize) {
  return Array.isArray(rows) && rows.length === pageSize;
}

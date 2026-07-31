export const RAW_ARCHIVE_CONTRACT_VERSION = 'employee_raw_ingestion_v1';
export const RAW_INGESTION_STATUS = 'ACCEPTED';
export const RAW_PROJECTION_STATUS = 'HELD_FOR_REVIEW';

const clean = value => String(value ?? '').trim();

export function rawArchiveEntryIdentity(entry = {}) {
  return clean(entry.entry_id || entry.event_id || entry.id || entry.anchor_id);
}

export function parseRawEventArchive(value) {
  if (!value) return { ok: true, contract_version: RAW_ARCHIVE_CONTRACT_VERSION, entries: [] };
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const entries = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.entries) ? parsed.entries : null);
    if (!entries) return { ok: false, error_code: 'CANONICAL_ARCHIVE_CORRUPT', entries: [] };
    return {
      ok: true,
      contract_version: clean(parsed?.anchor_contract_version) || RAW_ARCHIVE_CONTRACT_VERSION,
      projection_status: clean(parsed?.projection_status) || RAW_PROJECTION_STATUS,
      entries
    };
  } catch {
    return { ok: false, error_code: 'CANONICAL_ARCHIVE_CORRUPT', entries: [] };
  }
}

export function serializeRawEventArchive(entries = []) {
  return JSON.stringify({
    anchor_contract_version: RAW_ARCHIVE_CONTRACT_VERSION,
    projection_status: RAW_PROJECTION_STATUS,
    entries: Array.isArray(entries) ? entries : []
  });
}

export function appendRawArchiveEntry(existingArchive, entry) {
  const parsed = parseRawEventArchive(existingArchive);
  if (!parsed.ok) return parsed;
  const identity = rawArchiveEntryIdentity(entry);
  if (!identity) return { ok: false, error_code: 'EMPLOYEE_ENTRY_ID_REQUIRED', entries: parsed.entries };
  if (parsed.entries.some(row => rawArchiveEntryIdentity(row) === identity)) {
    return { ok: false, error_code: 'EMPLOYEE_IDEMPOTENCY_CONFLICT', entries: parsed.entries };
  }
  const entries = [...parsed.entries, entry];
  return { ok: true, entries, entries_json: serializeRawEventArchive(entries) };
}

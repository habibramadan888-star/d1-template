import {
  RAW_INGESTION_STATUS,
  RAW_PROJECTION_STATUS
} from '../canonical/raw-event-archive.mjs';

export function buildEmployeeRawCanonicalEntry(input = {}, adapters = {}) {
  const envelope = input.envelope || {};
  const entry = envelope.entry || {};
  const cleanText = adapters.cleanText || (value => String(value ?? '').trim());
  const cleanId = adapters.cleanId || cleanText;
  const hash = adapters.hash || (value => String(value));
  const user = input.user || {};
  const rawPayload = input.raw_payload || {};
  const anomalies = Array.isArray(input.anomalies) ? input.anomalies : [];
  const submittedAt = cleanText(input.submitted_at, 80);
  const sourceReferences = {
    arrears_ref: cleanId(entry.arrears_ref || entry.linked_task_id || entry.original_arrears_id || ''),
    deposit_ref: cleanId(entry.deposit_ref || entry.checkout_ref || ''),
    ttlock_context_present: !!(entry.ttlock_context || entry.access_snapshot_context),
    original_session_id: cleanId(entry.original_session_id || ''),
    original_event_id: cleanId(entry.original_event_id || '')
  };
  const fingerprintPayload = {
    session_id: envelope.session_id,
    event_id: envelope.event_id,
    event_type: envelope.event_type,
    raw_payload: rawPayload
  };
  return {
    ...entry,
    id: envelope.event_id,
    entry_id: envelope.event_id,
    event_id: envelope.event_id,
    anchor_id: cleanId(entry.anchor_id || entry.event_id || entry.id) || envelope.event_id,
    session_id: envelope.session_id,
    type: envelope.type,
    event_type: envelope.event_type,
    employee: cleanText(user.userid || '', 120),
    operator: cleanText(entry.operator || entry.operator_id || user.userid || '', 120),
    submitted_at: submittedAt,
    source: 'employee_entry',
    source_references: sourceReferences,
    raw_payload: rawPayload,
    idempotency_key: envelope.idempotency_key,
    idempotency_fingerprint: hash(JSON.stringify(fingerprintPayload)),
    anomalies,
    review_required: anomalies.length > 0,
    ingestion_status: RAW_INGESTION_STATUS,
    projection_status: RAW_PROJECTION_STATUS,
    validation_status: anomalies.length ? 'accepted_with_anomaly' : 'accepted'
  };
}

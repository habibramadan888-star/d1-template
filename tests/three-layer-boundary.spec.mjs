import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendRawArchiveEntry,
  parseRawEventArchive,
  serializeRawEventArchive
} from '../modules/canonical/raw-event-archive.mjs';
import { buildEmployeeRawCanonicalEntry } from '../modules/employees/raw-ingestion-contract.mjs';
import { projectRawHeldSessionReadModel } from '../modules/owner-history/raw-held-session-read-model.mjs';

test('employee ingestion produces a raw fact without applying an owner projection', () => {
  const entry = buildEmployeeRawCanonicalEntry({
    envelope: { session_id: 'S1', event_id: 'E1', event_type: 'rent', type: 'R', idempotency_key: 'K1', entry: { bed: '848', amount: 750, paid: 750, payment_method: 'cash', tag: 'O' } },
    user: { userid: 'abdul' },
    anomalies: [{ code: 'TTLOCK_CONTEXT_UNAVAILABLE' }],
    submitted_at: '2026-07-31T01:31:00+04:00',
    raw_payload: { bed: '848', amount: 750 }
  }, { hash: () => 'fingerprint-1' });
  assert.equal(entry.ingestion_status, 'ACCEPTED');
  assert.equal(entry.projection_status, 'HELD_FOR_REVIEW');
  assert.equal(entry.review_required, true);
  assert.equal(entry.source, 'employee_entry');
  assert.equal(entry.idempotency_fingerprint, 'fingerprint-1');
});

test('canonical archive owns envelope parsing, append and idempotency identity', () => {
  const first = { entry_id: 'E1', event_type: 'rent', amount: 750 };
  const initial = serializeRawEventArchive([first]);
  assert.deepEqual(parseRawEventArchive(initial).entries, [first]);
  const appended = appendRawArchiveEntry(initial, { entry_id: 'E2', event_type: 'expense', amount: 150 });
  assert.equal(appended.ok, true);
  assert.equal(appended.entries.length, 2);
  assert.equal(appendRawArchiveEntry(appended.entries_json, first).error_code, 'EMPLOYEE_IDEMPOTENCY_CONFLICT');
});

test('owner read model derives a summary without changing projection status', () => {
  const entries = [
    { entry_id: 'R1', event_type: 'rent', paid: 4780, payment_method: 'cash' },
    { entry_id: 'R2', event_type: 'rent', paid: 460, expected_rent: 680, arrears_amount: 220, payment_method: 'bank' },
    { entry_id: 'D1', event_type: 'deposit_in', deposit_amount: 200, payment_method: 'cash' },
    { entry_id: 'DR1', event_type: 'deposit_out', actual_refund_amount: 200, payment_method: 'cash' },
    { entry_id: 'E1', event_type: 'expense', expense_amount: 150, payment_method: 'cash' }
  ];
  const model = projectRawHeldSessionReadModel({ source: 'employee_entry_raw_held', entries_json: serializeRawEventArchive(entries) });
  assert.equal(model.entry_count, 5);
  assert.equal(model.total_received, 5440);
  assert.equal(model.total_outflow, 350);
  assert.equal(model.net_funds, 5090);
  assert.equal(model.outstanding, 220);
  assert.equal(model.projection_status, 'HELD_FOR_REVIEW');
  assert.equal(model.business_totals_applied, false);
});

test('owner read model ignores non raw-held sessions', () => {
  assert.equal(projectRawHeldSessionReadModel({ source: 'employee_entry' }), null);
});

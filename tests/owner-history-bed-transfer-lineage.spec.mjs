import assert from 'node:assert/strict';
import test from 'node:test';
import { projectOwnerHistoryTransferLineage } from '../modules/owner-history/bed-transfer-lineage-projection.mjs';

const corpid = 'corp-main';
const entry = (id, type, bed, time, extra = {}) => ({
  corpid,
  session_ref: `session-${id}`,
  entry_ref: `entry-${id}`,
  anchor_ref: id,
  event_type: type,
  bed,
  canonical_accepted_at: time,
  effective_status: 'active',
  stay_context_id: 'stay-main',
  ...extra
});
const ab = entry('transfer-ab', 'bed_transfer', 'B', '2026-01-02T10:00:00Z', {
  transfer_anchor_id: 'transfer-ab',
  transfer_lineage_id: 'lineage-main',
  previous_transfer_anchor_id: null,
  from_bed: 'A',
  to_bed: 'B',
  source_context_anchor_refs: ['rent-a', 'deposit-a']
});
const bc = entry('transfer-bc', 'bed_transfer', 'C', '2026-01-03T10:00:00Z', {
  transfer_anchor_id: 'transfer-bc',
  transfer_lineage_id: 'lineage-main',
  previous_transfer_anchor_id: 'transfer-ab',
  from_bed: 'B',
  to_bed: 'C',
  source_context_anchor_refs: ['rent-b', 'rent-a']
});
const archive = [
  entry('rent-a', 'rent', 'A', '2026-01-01T08:00:00Z', { amount: 900 }),
  entry('deposit-a', 'deposit_in', 'A', '2026-01-01T08:05:00Z', { deposit_amount: 700 }),
  ab,
  entry('rent-b', 'rent', 'B', '2026-01-02T12:00:00Z', { amount: 450 }),
  bc,
  entry('old-c', 'rent', 'C', '2026-01-03T09:00:00Z', { stay_context_id: 'stay-older' }),
  entry('rent-c', 'rent', 'C', '2026-01-03T12:00:00Z', { amount: 300 }),
  entry('checkout-c', 'checkout', 'C', '2026-01-04T12:00:00Z'),
  entry('later-c', 'rent', 'C', '2026-01-05T12:00:00Z', { stay_context_id: 'stay-later' })
];
const project = (requested_bed, rows = archive, extra = {}) => projectOwnerHistoryTransferLineage({
  corpid,
  requested_bed,
  archive_entries: rows,
  ...extra
});

test('no lineage is explicitly not applicable', () => {
  const result = project('A', [archive[0]]);
  assert.equal(result.status, 'not_applicable');
  assert.deepEqual(result.canonical_history_entries, []);
});

test('A to B query returns A source, transfer, and B current leg', () => {
  const result = project('B', archive.filter(row => row !== bc));
  assert.equal(result.status, 'projected');
  assert.deepEqual(result.historical_beds, ['A', 'B']);
  assert.deepEqual(result.canonical_history_entries.map(row => row.anchor_ref), ['rent-a', 'deposit-a', 'transfer-ab', 'rent-b']);
});

test('A to B to C query returns stable A, B, C lineage history', () => {
  const result = project('C');
  assert.equal(result.effective_current_bed, 'C');
  assert.equal(result.lineage_display_current_bed, 'C');
  assert.deepEqual(result.historical_beds, ['A', 'B', 'C']);
  assert.deepEqual(result.canonical_history_entries.map(row => row.anchor_ref), [
    'rent-a', 'deposit-a', 'transfer-ab', 'rent-b', 'transfer-bc', 'rent-c', 'checkout-c'
  ]);
});

test('original physical beds are preserved in projected entries', () => {
  const rows = project('C').canonical_history_entries;
  assert.equal(rows.find(row => row.anchor_ref === 'rent-a').original_bed, 'A');
  assert.equal(rows.find(row => row.anchor_ref === 'rent-b').original_bed, 'B');
  assert.equal(rows.find(row => row.anchor_ref === 'rent-c').original_bed, 'C');
});

test('current leg excludes pre-transfer and post-checkout C events', () => {
  const refs = project('C').current_leg_anchor_refs;
  assert.deepEqual(refs, ['rent-c', 'checkout-c']);
  assert.equal(refs.includes('old-c'), false);
  assert.equal(refs.includes('later-c'), false);
});

test('source anchor refs and canonical history are deduplicated', () => {
  const repeated = { ...bc, source_context_anchor_refs: ['rent-a', 'rent-b', 'rent-a'] };
  const result = project('C', archive.map(row => row === bc ? repeated : row));
  assert.equal(result.source_context_anchor_refs.filter(ref => ref === 'rent-a').length, 1);
  assert.equal(result.canonical_history_entries.filter(row => row.anchor_ref === 'rent-a').length, 1);
  assert.equal(result.canonical_history_entries.filter(row => row.anchor_ref === 'transfer-ab').length, 1);
  assert.equal(result.canonical_history_entries.find(row => row.anchor_ref === 'rent-a').amount, 900);
});

test('void A to B restores effective current bed A while raw audit remains', () => {
  const voidAnchor = entry('void-ab', 'void_transfer', 'A', '2026-01-02T11:00:00Z', { target_transfer_anchor_id: 'transfer-ab' });
  const result = project('A', [archive[0], archive[1], ab, voidAnchor]);
  assert.equal(result.effective_current_bed, 'A');
  assert.deepEqual(result.active_transfer_anchor_ids, []);
  assert.equal(result.raw_transfer_events.some(row => row.anchor_ref === 'transfer-ab'), true);
  assert.deepEqual(result.effective_transfer_events, []);
});

test('void latest B to C restores effective current bed B', () => {
  const voidAnchor = entry('void-bc', 'void_transfer', 'B', '2026-01-03T11:00:00Z', { target_transfer_anchor_id: 'transfer-bc' });
  const result = project('B', [...archive.slice(0, 5), voidAnchor]);
  assert.equal(result.effective_current_bed, 'B');
  assert.deepEqual(result.active_transfer_anchor_ids, ['transfer-ab']);
  assert.equal(result.raw_transfer_events.length, 2);
});

test('void middle edge with a later active edge fails closed', () => {
  const voidAnchor = entry('void-ab', 'void_transfer', 'B', '2026-01-03T09:00:00Z', { target_transfer_anchor_id: 'transfer-ab' });
  const result = project('C', [...archive, voidAnchor]);
  assert.equal(result.error_code, 'OWNER_HISTORY_TRANSFER_LINEAGE_DISCONTINUITY');
  assert.deepEqual(result.canonical_history_entries, []);
});

test('correction replacement is effective and original remains raw visible', () => {
  const replacement = {
    ...ab,
    transfer_anchor_id: 'transfer-ab-corrected',
    anchor_ref: 'transfer-ab-corrected',
    entry_ref: 'entry-transfer-ab-corrected',
    replacement_for_transfer_anchor_id: 'transfer-ab',
    effective_status: 'corrected'
  };
  const result = project('B', [...archive.slice(0, 3), replacement, archive[3]]);
  assert.deepEqual(result.active_transfer_anchor_ids, ['transfer-ab-corrected']);
  assert.equal(result.raw_transfer_events.some(row => row.anchor_ref === 'transfer-ab'), true);
  assert.equal(result.raw_transfer_events.some(row => row.anchor_ref === 'transfer-ab-corrected'), true);
});

test('reversal is additive, references original, and excludes it effectively', () => {
  const reversal = entry('reverse-ab', 'transfer_reversal', 'A', '2026-01-02T11:00:00Z', { target_transfer_anchor_id: 'transfer-ab' });
  const result = project('A', [archive[0], archive[1], ab, reversal]);
  assert.equal(result.status, 'projected');
  assert.deepEqual(result.active_transfer_anchor_ids, []);
  assert.equal(result.raw_transfer_events.length, 1);
});

test('reversal without an original reference fails closed', () => {
  const reversal = entry('reverse-missing', 'transfer_reversal', 'A', '2026-01-02T11:00:00Z');
  const result = project('B', [ab, reversal]);
  assert.equal(result.error_code, 'OWNER_HISTORY_TRANSFER_LINEAGE_DISCONTINUITY');
});

test('projection never mutates canonical archive fixtures', () => {
  const fixture = structuredClone(archive);
  const before = JSON.stringify(fixture);
  project('C', fixture);
  assert.equal(JSON.stringify(fixture), before);
});

test('cross-corpid edge fails closed and leaks no refs', () => {
  const foreign = { ...bc, corpid: 'corp-foreign' };
  const result = project('C', archive.map(row => row === bc ? foreign : row));
  assert.equal(result.error_code, 'OWNER_HISTORY_TRANSFER_LINEAGE_CORPID_MISMATCH');
  assert.deepEqual(result.canonical_history_entries, []);
  assert.deepEqual(result.source_context_anchor_refs, []);
});

test('same-corpid cross-property lineage remains valid', () => {
  const rows = archive.map(row => ({ ...row, property_id: row.anchor_ref?.includes('a') ? 'property-one' : 'property-two' }));
  assert.equal(project('C', rows).status, 'projected');
});

test('multiple unlinked current contexts fail closed', () => {
  const noContextTransfer = { ...bc, stay_context_id: '' };
  const other = entry('other-c', 'rent', 'C', '2026-01-03T13:00:00Z', { stay_context_id: 'stay-other' });
  const result = project('C', [...archive.map(row => row === bc ? noContextTransfer : row), other]);
  assert.equal(result.error_code, 'OWNER_HISTORY_TRANSFER_LINEAGE_AMBIGUOUS');
});

test('a later active transfer from the terminal bed is not merged into current leg', () => {
  const cd = entry('transfer-cd-other', 'bed_transfer', 'D', '2026-01-04T10:00:00Z', {
    transfer_anchor_id: 'transfer-cd-other',
    transfer_lineage_id: 'lineage-other',
    previous_transfer_anchor_id: null,
    from_bed: 'C',
    to_bed: 'D',
    source_context_anchor_refs: ['rent-c']
  });
  const result = project('C', [...archive.slice(0, 7), cd]);
  assert.equal(result.error_code, 'OWNER_HISTORY_TRANSFER_LINEAGE_AMBIGUOUS');
  assert.deepEqual(result.canonical_history_entries, []);
});

test('optional lineage filter can only select an existing server lineage', () => {
  assert.equal(project('C', archive, { transfer_lineage_id: 'lineage-main' }).status, 'projected');
  assert.equal(project('C', archive, { transfer_lineage_id: 'lineage-unknown' }).status, 'not_applicable');
});

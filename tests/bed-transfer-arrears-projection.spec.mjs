import assert from 'node:assert/strict';
import test from 'node:test';
import { projectBedTransferFinanceAndArrears } from '../modules/finance/bed-transfer-finance-arrears-projection.mjs';

const corpid = 'corp-main';
const ab = {
  corpid, event_type: 'bed_transfer', transfer_anchor_id: 'transfer-ab-main', transfer_lineage_id: 'lineage-main', previous_transfer_anchor_id: null,
  from_bed: 'A', to_bed: 'B', canonical_accepted_at: '2026-01-02T10:00:00Z', fee_mode: 'waived', fee_amount_aed: 0,
  fee_waiver_reason: 'approved', payment_method: '', bed_price_difference_mode: 'none', bed_price_difference_amount_aed: 0,
  carried_arrears_refs: ['arrears-one']
};
const bc = {
  ...ab, transfer_anchor_id: 'transfer-bc-main', previous_transfer_anchor_id: 'transfer-ab-main', from_bed: 'B', to_bed: 'C',
  canonical_accepted_at: '2026-01-03T10:00:00Z', carried_arrears_refs: ['arrears-one', 'arrears-two']
};
const old = (ref, bed, amount, extra = {}) => ({
  corpid, arrears_ref: ref, bed, original_bed: bed, original_amount: amount, original_arrears_amount: amount,
  remaining_arrears: amount, source_event_type: 'rent_short_paid', source_anchor_ref: `source-${ref}`, status: 'open', ...extra
});
const project = (rows, existing) => projectBedTransferFinanceAndArrears({ corpid, archive_entries: rows, existing_arrears: existing });

test('one carried ref preserves identity, amount, source, and original bed', () => {
  const source = old('arrears-one', 'A', 80);
  const result = project([ab], [source]);
  const item = result.carried_arrears[0];
  assert.equal(item.arrears_ref, source.arrears_ref);
  assert.equal(item.remaining_arrears, source.remaining_arrears);
  assert.equal(item.source_anchor_ref, source.source_anchor_ref);
  assert.equal(item.original_bed, 'A');
  assert.equal(item.effective_current_bed, 'B');
});

test('multiple carried refs remain separate through A to B to C', () => {
  const result = project([ab, bc], [old('arrears-one', 'A', 80), old('arrears-two', 'B', 25)]);
  assert.deepEqual(result.carried_arrears.map(item => item.arrears_ref), ['arrears-one', 'arrears-two']);
  assert.deepEqual(result.carried_arrears.map(item => item.remaining_arrears), [80, 25]);
  assert.equal(result.carried_arrears.every(item => item.effective_current_bed === 'C'), true);
});

test('repeated carried ref is returned once and never aggregated', () => {
  const result = project([ab, bc], [old('arrears-one', 'A', 80), old('arrears-two', 'B', 25)]);
  assert.equal(result.carried_arrears.filter(item => item.arrears_ref === 'arrears-one').length, 1);
  assert.equal(result.carried_arrears.some(item => item.remaining_arrears === 105), false);
});

test('missing, closed, void, and cross-corpid refs emit reconciliation warnings', () => {
  const rows = [{ ...ab, carried_arrears_refs: ['missing', 'closed', 'voided', 'foreign'] }];
  const existing = [
    old('closed', 'A', 20, { status: 'settled', remaining_arrears: 0 }),
    old('voided', 'A', 30, { status: 'voided' }),
    old('foreign', 'A', 40, { corpid: 'corp-foreign' })
  ];
  const result = project(rows, existing);
  assert.deepEqual(result.carried_arrears, []);
  assert.deepEqual(new Set(result.reconciliation_warnings.map(item => item.code)), new Set([
    'CARRIED_ARREARS_REF_MISSING', 'CARRIED_ARREARS_NOT_OPEN', 'CARRIED_ARREARS_CORPID_MISMATCH'
  ]));
});

test('carried amount mismatch is explicit and not silently projected', () => {
  const row = { ...ab, carried_arrears: [{ arrears_ref: 'arrears-one', remaining_arrears: 75 }] };
  const result = project([row], [old('arrears-one', 'A', 80)]);
  assert.deepEqual(result.carried_arrears, []);
  assert.equal(result.reconciliation_warnings[0].code, 'CARRIED_ARREARS_AMOUNT_MISMATCH');
});

test('transfer void does not mutate or repay an existing carried arrears source', () => {
  const source = old('arrears-one', 'A', 80);
  const result = project([ab, { corpid, event_type: 'void_transfer', target_transfer_anchor_id: ab.transfer_anchor_id }], [source]);
  assert.deepEqual(result.carried_arrears, []);
  assert.equal(source.remaining_arrears, 80);
  assert.equal(result.finance.arrears_repaid ?? 0, 0);
});

test('source fixtures are never mutated', () => {
  const rows = structuredClone([ab, bc]);
  const existing = [old('arrears-one', 'A', 80), old('arrears-two', 'B', 25)];
  const before = JSON.stringify({ rows, existing });
  project(rows, existing);
  assert.equal(JSON.stringify({ rows, existing }), before);
});

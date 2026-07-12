import assert from 'node:assert/strict';
import test from 'node:test';
import { projectBedTransferFinanceAndArrears } from '../modules/finance/bed-transfer-finance-arrears-projection.mjs';

const corpid = 'corp-main';
const transfer = (extra = {}) => ({
  corpid,
  event_type: 'bed_transfer',
  transfer_anchor_id: 'transfer-anchor-one',
  transfer_lineage_id: 'transfer-lineage-one',
  previous_transfer_anchor_id: null,
  from_bed: 'A',
  to_bed: 'B',
  canonical_accepted_at: '2026-01-01T10:00:00Z',
  canonical_request_fingerprint: 'fingerprint-one',
  fee_mode: 'paid',
  fee_amount_aed: 50,
  payment_method: 'cash',
  bed_price_difference_mode: 'none',
  bed_price_difference_amount_aed: 0,
  carried_arrears_refs: [],
  ...extra
});
const project = (rows, extra = {}) => projectBedTransferFinanceAndArrears({ corpid, archive_entries: rows, ...extra });

test('paid AED 50 is transfer-fee income and never rent income', () => {
  const result = project([transfer()]);
  assert.equal(result.ok, true);
  assert.equal(result.finance.bed_transfer_fee_income, 50);
  assert.equal(result.finance.rent_income, 0);
  assert.equal(result.finance.cash_received, 50);
  assert.equal(result.finance.gross_received, 50);
});

test('waived fee with reason leaves every finance category zero', () => {
  const result = project([transfer({ fee_mode: 'waived', fee_amount_aed: 0, payment_method: '', fee_waiver_reason: 'owner-approved waiver' })]);
  assert.deepEqual(Object.values(result.finance), [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(result.derived_arrears, []);
});

test('waived fee without reason rejects fail closed', () => {
  const result = project([transfer({ fee_mode: 'waived', fee_amount_aed: 0, payment_method: '', fee_waiver_reason: '' })]);
  assert.equal(result.error_code, 'BED_TRANSFER_FEE_WAIVER_REASON_REQUIRED');
  assert.equal(result.finance.gross_received, 0);
});

test('unpaid AED 50 derives one stable full-payment-only arrears item', () => {
  const anchor = transfer({ fee_mode: 'unpaid', fee_amount_aed: 50, payment_method: '', fee_due_date: '2026-02-01' });
  const first = project([anchor]);
  const second = project([structuredClone(anchor)]);
  assert.equal(first.finance.gross_received, 0);
  assert.equal(first.finance.arrears_opened_amount, 50);
  assert.equal(first.derived_arrears.length, 1);
  assert.equal(first.derived_arrears[0].arrears_ref, 'bed-transfer-fee:transfer-anchor-one');
  assert.equal(first.derived_arrears[0].arrears_ref, second.derived_arrears[0].arrears_ref);
  assert.equal(first.derived_arrears[0].payment_policy, 'FULL_PAYMENT_ONLY');
  assert.equal(first.derived_arrears[0].partial_payment_allowed, false);
});

test('unpaid missing due date and non-50 values reject', () => {
  assert.equal(project([transfer({ fee_mode: 'unpaid', payment_method: '', fee_due_date: '' })]).error_code, 'BED_TRANSFER_FEE_DUE_DATE_REQUIRED');
  for (const fee_amount_aed of [49, 51]) {
    assert.equal(project([transfer({ fee_mode: 'unpaid', fee_amount_aed, payment_method: '', fee_due_date: '2026-02-01' })]).error_code, 'BED_TRANSFER_FEE_AMOUNT_INVALID');
  }
});

test('partial fee representation rejects', () => {
  const result = project([transfer({ fee_mode: 'unpaid', payment_method: '', fee_due_date: '2026-02-01', fee_paid_amount_aed: 10 })]);
  assert.equal(result.error_code, 'BED_TRANSFER_FEE_PARTIAL_PAYMENT_FORBIDDEN');
});

test('retry of the same canonical transfer anchor does not duplicate income', () => {
  const anchor = transfer();
  const result = project([anchor, structuredClone(anchor)]);
  assert.equal(result.finance.bed_transfer_fee_income, 50);
  assert.equal(result.canonical_anchor_dedup_count, 1);
});

test('bed difference none with zero has no effect', () => {
  const result = project([transfer({ fee_mode: 'waived', fee_amount_aed: 0, payment_method: '', fee_waiver_reason: 'waiver' })]);
  assert.equal(result.finance.bed_price_difference_income, 0);
  assert.equal(result.finance.arrears_opened_amount, 0);
});

test('paid employee-entered bed difference is separate income and not rent', () => {
  const result = project([transfer({
    bed_price_difference_mode: 'paid',
    bed_price_difference_amount_aed: 125,
    bed_price_difference_payment_method: 'bank',
    bed_price_difference_reason: 'employee-calculated approved difference'
  })]);
  assert.equal(result.finance.bed_transfer_fee_income, 50);
  assert.equal(result.finance.bed_price_difference_income, 125);
  assert.equal(result.finance.rent_income, 0);
  assert.equal(result.finance.bank_received, 125);
});

test('unpaid difference derives an independent deterministic arrears ref', () => {
  const result = project([transfer({
    bed_price_difference_mode: 'unpaid',
    bed_price_difference_amount_aed: 125,
    bed_price_difference_due_date: '2026-02-03'
  })]);
  const item = result.derived_arrears[0];
  assert.equal(item.arrears_ref, 'bed-price-difference:transfer-anchor-one');
  assert.equal(item.remaining_arrears, 125);
  assert.equal(item.payment_policy, 'FULL_PAYMENT_ONLY');
  assert.equal(result.finance.bed_price_difference_income, 0);
});

test('unpaid difference missing due date and paid-unpaid conflicts reject', () => {
  assert.equal(project([transfer({ bed_price_difference_mode: 'unpaid', bed_price_difference_amount_aed: 125 })]).error_code, 'BED_PRICE_DIFFERENCE_DUE_DATE_REQUIRED');
  assert.equal(project([transfer({ bed_price_difference_mode: 'paid', bed_price_difference_amount_aed: 125, bed_price_difference_payment_method: 'cash', bed_price_difference_due_date: '2026-02-03' })]).error_code, 'BED_PRICE_DIFFERENCE_MODE_CONFLICT');
});

test('projection contains no automatic price calculation input', () => {
  const result = project([transfer({ bed_price_difference_mode: 'paid', bed_price_difference_amount_aed: 37, bed_price_difference_payment_method: 'cash' })]);
  assert.equal(result.finance.bed_price_difference_income, 37);
  assert.equal('old_bed_price' in result, false);
  assert.equal('new_bed_price' in result, false);
});

test('void unpaid fee removes active derived arrears', () => {
  const anchor = transfer({ fee_mode: 'unpaid', payment_method: '', fee_due_date: '2026-02-01' });
  const voidAnchor = { corpid, event_type: 'void_transfer', target_transfer_anchor_id: anchor.transfer_anchor_id };
  const result = project([anchor, voidAnchor]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.derived_arrears, []);
  assert.equal(result.raw_transfer_events.length, 1);
  assert.equal(result.effective_transfer_events.length, 0);
});

test('void paid fee keeps raw amount, makes effective income zero, and warns without refund', () => {
  const anchor = transfer();
  const result = project([anchor, { corpid, event_type: 'void_transfer', target_transfer_anchor_id: anchor.transfer_anchor_id }]);
  assert.equal(result.raw_transfer_events[0].fee_amount_aed, 50);
  assert.equal(result.finance.bed_transfer_fee_income, 0);
  assert.equal(result.reconciliation_warnings[0].code, 'TRANSFER_VOID_FINANCIAL_RECONCILIATION_REQUIRED');
  assert.equal(result.derived_arrears.length, 0);
});

test('correction replacement is counted once while original remains raw', () => {
  const original = transfer();
  const replacement = transfer({
    transfer_anchor_id: 'transfer-anchor-replacement',
    canonical_request_fingerprint: 'fingerprint-replacement',
    replacement_for_transfer_anchor_id: original.transfer_anchor_id,
    fee_mode: 'waived',
    fee_amount_aed: 0,
    payment_method: '',
    fee_waiver_reason: 'replacement waiver'
  });
  const result = project([original, replacement]);
  assert.equal(result.raw_transfer_events.length, 2);
  assert.equal(result.effective_transfer_events.length, 1);
  assert.equal(result.finance.bed_transfer_fee_income, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { findDerivedArrearsPaymentForbiddenFields, parseBedTransferDerivedArrearsRef, prepareDerivedArrearsPayment } from '../modules/finance/bed-transfer-derived-arrears-payment.mjs';

const item = (kind = 'fee', remaining = 50) => ({
  arrears_ref: kind === 'fee' ? 'bed-transfer-fee:tf-1' : 'bed-price-difference:tf-1',
  source_event_type: kind === 'fee' ? 'bed_transfer_fee_unpaid' : 'bed_price_difference_unpaid',
  source_anchor_ref: 'tf-1', original_arrears_amount: remaining, remaining_arrears: remaining,
  already_paid_amount: 0, status: 'open', original_bed: 'A', effective_current_bed: 'B', transfer_lineage_id: 'lineage-1'
});
const prepare = (kind, amount, overrides = {}) => prepareDerivedArrearsPayment({
  corpid: 'corp', arrears_ref: item(kind).arrears_ref, arrears_item: item(kind, kind === 'fee' ? 50 : 73),
  source_effective: true, payment_amount: amount, payment_method: 'cash', payment_date: '2026-07-12',
  accepted_at: '2026-07-12T10:00:00Z', operator_reference: 'employee-1', event_id: 'ap-1', ...overrides
});

test('derived refs parse without provider identity', () => {
  assert.deepEqual(parseBedTransferDerivedArrearsRef('bed-transfer-fee:tf-1'), { kind: 'fee', source_anchor_ref: 'tf-1', source_arrears_type: 'bed_transfer_fee_unpaid' });
  assert.equal(parseBedTransferDerivedArrearsRef('rent-short-paid:1'), null);
});

test('transfer fee requires exact 50 and records server canonical metadata', () => {
  const accepted = prepare('fee', 50);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.server_fields.remaining_arrears, 0);
  assert.equal(accepted.server_fields.payment_policy, 'FULL_PAYMENT_ONLY');
  assert.equal(accepted.server_fields.original_bed, 'A');
  assert.equal(accepted.server_fields.lineage_display_current_bed, 'B');
  assert.equal(accepted.server_fields.linked_task_id, 'bed-transfer-fee:tf-1');
  for (const amount of [0, 1, 49]) assert.equal(prepare('fee', amount).error_code, 'BED_TRANSFER_FEE_ARREARS_FULL_PAYMENT_REQUIRED');
  assert.equal(prepare('fee', 51).error_code, 'ARREARS_PAYMENT_OVERPAY_NOT_ALLOWED');
});

test('bed price difference requires exact current remaining', () => {
  assert.equal(prepare('difference', 73).ok, true);
  assert.equal(prepare('difference', 72).error_code, 'BED_PRICE_DIFFERENCE_ARREARS_FULL_PAYMENT_REQUIRED');
  assert.equal(prepare('difference', 74).error_code, 'ARREARS_PAYMENT_OVERPAY_NOT_ALLOWED');
});

test('closed and source-void debts reject and same request fingerprint is stable', () => {
  assert.equal(prepare('fee', 50, { source_effective: false }).error_code, 'ARREARS_SOURCE_VOIDED');
  assert.equal(prepare('fee', 50, { arrears_item: { ...item('fee'), status: 'settled', remaining_arrears: 0 } }).error_code, 'ARREARS_REF_NOT_OPEN');
  assert.equal(prepare('fee', 50).server_fields.canonical_fingerprint, prepare('fee', 50).server_fields.canonical_fingerprint);
  assert.notEqual(prepare('fee', 50).server_fields.canonical_fingerprint, prepare('fee', 50, { event_id: 'ap-2' }).server_fields.canonical_fingerprint);
});

test('nested camel/snake provenance and provider injections are rejected', () => {
  const invalid = findDerivedArrearsPaymentForbiddenFields([{ wrapper: { sourceAnchorRef: 'tf-1' } }, { payload: { tenant_card_id: 'card' } }, { providerMetadata: { x: 1 } }]);
  assert.deepEqual(invalid, ['[0].wrapper.sourceAnchorRef', '[1].payload.tenant_card_id', '[2].providerMetadata']);
});

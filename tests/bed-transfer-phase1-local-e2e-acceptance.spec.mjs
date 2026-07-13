import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { buildBedTransferCanonicalLinkAnchor } from '../modules/employees/bed-transfer-canonical-link-anchor.mjs';
import { prepareCanonicalTransferArchiveWrite, classifyExistingCanonicalTransfer } from '../modules/employees/bed-transfer-canonical-archive-write.mjs';
import { classifyBedTransferTtlockSequence } from '../modules/employees/bed-transfer-ttlock-sequence.mjs';
import { projectOwnerHistoryTransferLineage } from '../modules/owner-history/bed-transfer-lineage-projection.mjs';
import { projectBedTransferFinanceAndArrears } from '../modules/finance/bed-transfer-finance-arrears-projection.mjs';
import { prepareDerivedArrearsPayment } from '../modules/finance/bed-transfer-derived-arrears-payment.mjs';
import { BED_TRANSFER_TODO_CODES, prepareOwnerReviewAcknowledgment, projectBedTransferOwnerTodos } from '../modules/owner-todo/bed-transfer-owner-todo.mjs';

const corpid = 'corp-local-e2e';
const worker = await readFile(new URL('../deploy-worker/src/index.js', import.meta.url), 'utf8');
const employeeUi = await readFile(new URL('../deploy-worker/public/employee-v3.html', import.meta.url), 'utf8');
const ownerUi = await readFile(new URL('../deploy-worker/public/index-51-main.js', import.meta.url), 'utf8');

function functionBlock(source, name) {
  let start = source.indexOf(`function ${name}`);
  if (source.slice(start - 6, start) === 'async ') start -= 6;
  assert.ok(start >= 0, `${name} missing`);
  const end = source.indexOf(`__name(${name},`, start);
  if (end > start) return source.slice(start, end);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} end missing`);
}

const snapshot = (status, extra = {}) => ({
  corpid,
  physical_bed_status: status,
  parsed_vacancy_marker: status === 'vacant',
  snapshot_fingerprint: `snapshot-${status}-local-e2e`,
  candidate_count: 1,
  parse_status: 'parsed',
  ...extra
});

const sourceContext = (bed = 'A', extra = {}) => ({
  corpid,
  from_bed: bed,
  physical_bed_status: 'not_marked_vacant',
  parsed_vacancy_marker: false,
  resolution_status: 'resolved',
  candidate_count: 1,
  snapshot_fingerprint: `source-snapshot-${bed}-local-e2e`,
  parse_status: 'parsed',
  source_context_anchor_refs: [`rent-${bed.toLowerCase()}-anchor-0001`],
  rent_coverage_ref: `rent-coverage-${bed}-0001`,
  deposit_context_ref: `deposit-context-${bed}-0001`,
  expiry_context_ref: `expiry-context-${bed}-0001`,
  expected_checkin_mmdd: '0102',
  open_arrears: [],
  ...extra
});

const transferInput = (extra = {}) => ({
  client_payload: { event_type: 'bed_transfer' },
  from_bed: 'A',
  to_bed: 'B',
  transfer_at: '2026-07-12T12:00:00+04:00',
  transfer_reason: 'local phase1 acceptance',
  payment_method: 'cash',
  corpid,
  canonical_source_context: sourceContext(),
  canonical_target_context: snapshot('vacant'),
  fee_mode: 'paid',
  fee_amount_aed: 50,
  bed_price_difference_mode: 'none',
  bed_price_difference_amount_aed: 0,
  ...extra
});

function buildTransfer(extra = {}, ids = {}) {
  const values = {
    transfer_anchor_id: ids.anchor || 'transfer-anchor-local-0001',
    transfer_lineage_id: ids.lineage || 'transfer-lineage-local-0001'
  };
  return buildBedTransferCanonicalLinkAnchor(transferInput(extra), { idFactory: name => values[name] });
}

function archiveTransfer(anchor, sessionId, acceptedAt) {
  const prepared = prepareCanonicalTransferArchiveWrite({
    validated_anchor: anchor,
    session_id: sessionId,
    accepted_at: acceptedAt,
    operator_reference: 'employee-local'
  });
  assert.equal(prepared.ok, true);
  return prepared;
}

const event = (anchorRef, eventType, bed, acceptedAt, extra = {}) => ({
  corpid,
  anchor_ref: anchorRef,
  entry_ref: anchorRef,
  session_ref: `session-${anchorRef}`,
  event_type: eventType,
  bed,
  canonical_accepted_at: acceptedAt,
  effective_status: 'active',
  ...extra
});

function projectFinance(entries, existingArrears = []) {
  return projectBedTransferFinanceAndArrears({ corpid, archive_entries: entries, existing_arrears: existingArrears });
}

function applyWorkerFinanceAnchor(anchor) {
  const context = {
    ownerOverviewMoney: value => Math.round((Number(value) || 0) * 100) / 100,
    entryAnchorEventType: () => '',
    entryAnchorType: () => ''
  };
  vm.createContext(context);
  for (const name of ['canonicalFinanceProjectionZeroTotals', 'canonicalFinanceProjectionPaymentMethod', 'canonicalFinanceProjectionAmount', 'canonicalFinanceProjectionEventType', 'canonicalFinanceProjectionAddInflow', 'canonicalFinanceProjectionAddOutflow', 'canonicalFinanceProjectionApplyAnchor']) {
    vm.runInContext(functionBlock(worker, name), context);
  }
  const totals = context.canonicalFinanceProjectionZeroTotals();
  context.canonicalFinanceProjectionApplyAnchor(totals, anchor);
  return JSON.parse(JSON.stringify(totals));
}

test('Scenario A: employee-first paid fee runs validate, canonical archive, History, Finance and Todo lifecycle', () => {
  const cleanClientPayload = transferInput().client_payload;
  assert.deepEqual(cleanClientPayload, { event_type: 'bed_transfer' });
  const validated = buildTransfer();
  assert.equal(validated.ok, true);
  assert.equal(validated.ttlock_sequence, 'employee_first_pre_move');
  assert.equal(validated.reconciliation_required, true);
  const prepared = archiveTransfer(validated, 'session-transfer-ab-paid', '2026-07-12T12:00:01+04:00');
  const transfer = prepared.entry;
  const archive = [
    event('rent-a-anchor-0001', 'rent', 'A', '2026-07-01T08:00:00+04:00', { amount: 900 }),
    transfer,
    event('rent-b-current-0001', 'rent', 'B', '2026-07-12T13:00:00+04:00', { amount: 300 })
  ];
  const history = projectOwnerHistoryTransferLineage({ corpid, requested_bed: 'B', archive_entries: archive });
  assert.deepEqual(history.historical_beds, ['A', 'B']);
  assert.deepEqual(history.canonical_history_entries.map(row => row.anchor_ref), ['rent-a-anchor-0001', transfer.transfer_anchor_id, 'rent-b-current-0001']);
  const finance = projectFinance(archive);
  assert.equal(finance.finance.bed_transfer_fee_income, 50);
  assert.equal(finance.finance.rent_income, 0);
  const beforeMove = projectBedTransferOwnerTodos({ corpid, archive_entries: archive, access_snapshots: { A: snapshot('not_marked_vacant'), B: snapshot('vacant') } });
  assert.equal(beforeMove.todos[0].task_type, BED_TRANSFER_TODO_CODES.TTLOCK);
  const afterMove = projectBedTransferOwnerTodos({ corpid, archive_entries: archive, access_snapshots: { A: snapshot('vacant'), B: snapshot('not_marked_vacant', { parsed_deposit_amount: 200, parsed_checkin_mmdd: '0102', parsed_valid_until_mmdd: '0815' }) } });
  assert.equal(afterMove.todos.length, 0);
  assert.equal(JSON.stringify(archive).match(/provider|card_id|99099/gi), null);
  const retry = classifyExistingCanonicalTransfer(prepared.entries_json, prepared.request_fingerprint);
  assert.equal(retry.idempotent, true);
  assert.equal(projectFinance([transfer, structuredClone(transfer)]).finance.bed_transfer_fee_income, 50);
});

test('Scenario B: owner-first waived transfer has owner acknowledgment evidence and Finance zero', () => {
  const source = sourceContext('A', { physical_bed_status: 'vacant', parsed_vacancy_marker: true });
  const target = snapshot('not_marked_vacant', { parsed_deposit_amount: 200, parsed_checkin_mmdd: '0102', parsed_valid_until_mmdd: '0815' });
  const validated = buildTransfer({ canonical_source_context: source, canonical_target_context: target, fee_mode: 'waived', fee_amount_aed: 0, payment_method: '', fee_waiver_reason: 'documented local waiver' }, { anchor: 'transfer-anchor-waiver-0001' });
  assert.equal(validated.ok, true);
  assert.equal(validated.ttlock_sequence, 'owner_first_post_move');
  const transfer = archiveTransfer(validated, 'session-transfer-waiver', '2026-07-12T12:10:00+04:00').entry;
  const beforeAck = projectBedTransferOwnerTodos({ corpid, archive_entries: [transfer], access_snapshots: { A: source, B: target } });
  assert.equal(beforeAck.todos.some(row => row.task_type === BED_TRANSFER_TODO_CODES.TTLOCK), false);
  assert.equal(beforeAck.todos[0].task_type, BED_TRANSFER_TODO_CODES.WAIVER);
  const ack = prepareOwnerReviewAcknowledgment({
    corpid,
    request: { transfer_anchor_id: transfer.transfer_anchor_id, review_code: BED_TRANSFER_TODO_CODES.WAIVER, action: 'acknowledged' },
    effective_transfer: transfer,
    accepted_at: '2026-07-12T12:11:00+04:00',
    owner_reference: 'owner-local'
  }, { idFactory: name => `${name}-local-0001` });
  assert.equal(ack.ok, true);
  assert.equal(ack.entry.finance_effect.bed_transfer_fee_income, 0);
  assert.equal(ack.entry.transfer_status_mutated, false);
  const archive = [transfer, ack.entry];
  assert.equal(projectBedTransferOwnerTodos({ corpid, archive_entries: archive, access_snapshots: { A: source, B: target } }).todos.length, 0);
  assert.deepEqual(Object.values(projectFinance(archive).finance), [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(functionBlock(ownerUi, 'acknowledgeOwnerBedTransferWaiver').includes('localStorage'), false);
});

test('Scenario C: unpaid fee is displayed, rejects partial AP, closes on exact AP and counts repayment once', () => {
  const validated = buildTransfer({ fee_mode: 'unpaid', fee_amount_aed: 50, payment_method: '', fee_due_date: '2026-07-20' }, { anchor: 'transfer-anchor-unpaid-0001' });
  const transfer = archiveTransfer(validated, 'session-transfer-unpaid', '2026-07-12T12:20:00+04:00').entry;
  const open = projectFinance([transfer]);
  const debt = open.derived_arrears[0];
  assert.equal(debt.arrears_ref, `bed-transfer-fee:${transfer.transfer_anchor_id}`);
  assert.equal(debt.remaining_arrears, 50);
  assert.match(functionBlock(ownerUi, 'normalizeArrearFromCloud'), /remaining_arrears/);
  assert.match(functionBlock(ownerUi, 'renderOwnerArrearsTaskCard'), /const amount=esc\(arrearAmountLabel\(a\)\)/);
  const preparePayment = amount => prepareDerivedArrearsPayment({ corpid, arrears_ref: debt.arrears_ref, arrears_item: debt, source_effective: true, payment_amount: amount, payment_method: 'cash', payment_date: '2026-07-12', accepted_at: '2026-07-12T12:21:00+04:00', operator_reference: 'employee-local', event_id: 'ap-local-0001' });
  assert.equal(preparePayment(49).error_code, 'BED_TRANSFER_FEE_ARREARS_FULL_PAYMENT_REQUIRED');
  const full = preparePayment(50);
  assert.equal(full.ok, true);
  assert.equal(full.server_fields.remaining_arrears_after_payment, 0);
  assert.equal(full.server_fields.settlement_status, 'settled');
  const ap = { corpid, event_type: 'arrears_payment', payment_amount: 50, payment_method: 'cash', event_id: 'ap-local-0001', ...full.server_fields };
  const repayment = applyWorkerFinanceAnchor(ap);
  assert.equal(repayment.arrears_repaid, 50);
  assert.equal(repayment.bed_transfer_fee_arrears_repaid, 50);
  assert.equal(repayment.rent_income, 0);
  assert.equal(preparePayment(50).server_fields.canonical_fingerprint, full.server_fields.canonical_fingerprint);
  assert.match(worker, /appliedDerivedRepaymentRefs\.has\(repaymentRef\)/);
  assert.match(worker, /status:"cloud_confirmed",sync_status:"SYNCED"/);
});

test('Scenario D: employee-entered bed differences stay separate, deterministic and full-payment-only', () => {
  const paid = archiveTransfer(buildTransfer({ bed_price_difference_mode: 'paid', bed_price_difference_amount_aed: 125, bed_price_difference_payment_method: 'bank' }, { anchor: 'transfer-anchor-diff-paid' }), 'session-diff-paid', '2026-07-12T12:30:00+04:00').entry;
  const paidProjection = projectFinance([paid]);
  assert.equal(paidProjection.finance.bed_price_difference_income, 125);
  assert.equal(paidProjection.finance.rent_income, 0);
  const unpaid = archiveTransfer(buildTransfer({ bed_price_difference_mode: 'unpaid', bed_price_difference_amount_aed: 73, bed_price_difference_due_date: '2026-07-21' }, { anchor: 'transfer-anchor-diff-unpaid' }), 'session-diff-unpaid', '2026-07-12T12:31:00+04:00').entry;
  const first = projectFinance([unpaid]);
  const second = projectFinance([structuredClone(unpaid)]);
  const debt = first.derived_arrears[0];
  assert.equal(debt.arrears_ref, `bed-price-difference:${unpaid.transfer_anchor_id}`);
  assert.equal(debt.arrears_ref, second.derived_arrears[0].arrears_ref);
  assert.equal(prepareDerivedArrearsPayment({ corpid, arrears_ref: debt.arrears_ref, arrears_item: debt, source_effective: true, payment_amount: 72 }).error_code, 'BED_PRICE_DIFFERENCE_ARREARS_FULL_PAYMENT_REQUIRED');
  assert.equal(prepareDerivedArrearsPayment({ corpid, arrears_ref: debt.arrears_ref, arrears_item: debt, source_effective: true, payment_amount: 73 }).ok, true);
  assert.equal(projectFinance([unpaid, structuredClone(unpaid)]).canonical_anchor_dedup_count, 1);
  const none = projectFinance([archiveTransfer(buildTransfer({ fee_mode: 'waived', fee_amount_aed: 0, payment_method: '', fee_waiver_reason: 'none-mode', bed_price_difference_mode: 'none', bed_price_difference_amount_aed: 0 }, { anchor: 'transfer-anchor-diff-none' }), 'session-diff-none', '2026-07-12T12:32:00+04:00').entry]);
  assert.equal(none.finance.bed_price_difference_income, 0);
});

test('Scenario E: A to B to C preserves lineage, history and two independent carried arrears', () => {
  const oldDebts = [
    { corpid, arrears_ref: 'legacy-arrears-one', original_bed: 'A', original_arrears_amount: 80, remaining_arrears: 80, status: 'open' },
    { corpid, arrears_ref: 'legacy-arrears-two', original_bed: 'A', original_arrears_amount: 35, remaining_arrears: 35, status: 'open' }
  ];
  const abValidated = buildTransfer({ canonical_source_context: sourceContext('A', { open_arrears: oldDebts }) }, { anchor: 'transfer-anchor-ab-chain', lineage: 'transfer-lineage-chain-0001' });
  const ab = archiveTransfer(abValidated, 'session-chain-ab', '2026-07-12T13:00:00+04:00').entry;
  const bcValidated = buildTransfer({
    from_bed: 'B', to_bed: 'C', transfer_at: '2026-07-12T14:00:00+04:00',
    canonical_source_context: sourceContext('B', { open_arrears: oldDebts }),
    canonical_target_context: snapshot('vacant'),
    active_lineage: { current_bed: 'B', transfer_lineage_id: ab.transfer_lineage_id, last_active_transfer_anchor_id: ab.transfer_anchor_id }
  }, { anchor: 'transfer-anchor-bc-chain' });
  const bc = archiveTransfer(bcValidated, 'session-chain-bc', '2026-07-12T14:00:01+04:00').entry;
  const archive = [
    event('rent-a-anchor-0001', 'rent', 'A', '2026-07-01T08:00:00+04:00'), ab,
    event('rent-b-anchor-0001', 'rent', 'B', '2026-07-12T13:30:00+04:00'), bc,
    event('unrelated-c', 'rent', 'C', '2026-07-12T13:59:00+04:00', { stay_context_id: 'other' }),
    event('rent-c-current', 'rent', 'C', '2026-07-12T14:30:00+04:00')
  ];
  const history = projectOwnerHistoryTransferLineage({ corpid, requested_bed: 'C', archive_entries: archive });
  assert.equal(ab.transfer_lineage_id, bc.transfer_lineage_id);
  assert.equal(bc.previous_transfer_anchor_id, ab.transfer_anchor_id);
  assert.deepEqual(history.historical_beds, ['A', 'B', 'C']);
  assert.equal(history.canonical_history_entries.some(row => row.anchor_ref === 'unrelated-c'), false);
  const finance = projectFinance(archive, oldDebts);
  assert.deepEqual(finance.carried_arrears.map(row => row.arrears_ref).sort(), ['legacy-arrears-one', 'legacy-arrears-two']);
  assert.deepEqual(finance.carried_arrears.map(row => row.effective_current_bed), ['C', 'C']);
  assert.equal(finance.finance.arrears_opened_amount, 0);
  assert.equal(finance.finance.gross_received, finance.finance.bed_transfer_fee_income);
});

test('Scenario F: void and correction projections remain raw-auditable and fail closed on discontinuity', () => {
  const ab = archiveTransfer(buildTransfer({}, { anchor: 'transfer-anchor-ab-void', lineage: 'transfer-lineage-void-0001' }), 'session-void-ab', '2026-07-12T15:00:00+04:00').entry;
  const bc = archiveTransfer(buildTransfer({ from_bed: 'B', to_bed: 'C', canonical_source_context: sourceContext('B'), active_lineage: { current_bed: 'B', transfer_lineage_id: ab.transfer_lineage_id, last_active_transfer_anchor_id: ab.transfer_anchor_id } }, { anchor: 'transfer-anchor-bc-void' }), 'session-void-bc', '2026-07-12T15:10:00+04:00').entry;
  const voidBc = event('void-bc', 'void_transfer', 'B', '2026-07-12T15:11:00+04:00', { target_transfer_anchor_id: bc.transfer_anchor_id });
  assert.equal(projectOwnerHistoryTransferLineage({ corpid, requested_bed: 'B', archive_entries: [ab, bc, voidBc] }).effective_current_bed, 'B');
  const voidAb = event('void-ab', 'void_transfer', 'A', '2026-07-12T15:01:00+04:00', { target_transfer_anchor_id: ab.transfer_anchor_id });
  assert.equal(projectOwnerHistoryTransferLineage({ corpid, requested_bed: 'A', archive_entries: [ab, voidAb] }).effective_current_bed, 'A');
  assert.equal(projectOwnerHistoryTransferLineage({ corpid, requested_bed: 'C', archive_entries: [ab, bc, voidAb] }).error_code, 'OWNER_HISTORY_TRANSFER_LINEAGE_DISCONTINUITY');
  const paidVoid = projectFinance([ab, voidAb]);
  assert.equal(paidVoid.raw_transfer_events.length, 1);
  assert.equal(paidVoid.finance.bed_transfer_fee_income, 0);
  assert.equal(paidVoid.reconciliation_warnings[0].code, 'TRANSFER_VOID_FINANCIAL_RECONCILIATION_REQUIRED');
  assert.equal(projectBedTransferOwnerTodos({ corpid, archive_entries: [ab, voidAb] }).todos[0].task_type, BED_TRANSFER_TODO_CODES.FINANCIAL);
  const unpaid = archiveTransfer(buildTransfer({ fee_mode: 'unpaid', fee_amount_aed: 50, payment_method: '', fee_due_date: '2026-07-22' }, { anchor: 'transfer-anchor-unpaid-void' }), 'session-unpaid-void', '2026-07-12T15:20:00+04:00').entry;
  assert.equal(projectFinance([unpaid, event('void-unpaid', 'void_transfer', 'A', '2026-07-12T15:21:00+04:00', { target_transfer_anchor_id: unpaid.transfer_anchor_id })]).derived_arrears.length, 0);
  const replacement = { ...ab, transfer_anchor_id: 'transfer-anchor-ab-replacement', canonical_request_fingerprint: 'replacement-fingerprint', replacement_for_transfer_anchor_id: ab.transfer_anchor_id, fee_mode: 'waived', fee_amount_aed: 0, payment_method: '', fee_waiver_reason: 'corrected waiver' };
  const corrected = projectFinance([ab, replacement]);
  assert.equal(corrected.raw_transfer_events.length, 2);
  assert.equal(corrected.effective_transfer_events.length, 1);
  assert.equal(corrected.finance.bed_transfer_fee_income, 0);
});

test('Scenario G: business rejection matrix returns exact codes with no canonical side effects', () => {
  const rejected = [
    buildTransfer({ to_bed: 'A' }),
    buildTransfer({ to_bed: '334' }),
    buildTransfer({ canonical_target_context: snapshot('vacant', { corpid: 'other' }) }),
    buildTransfer({ canonical_source_context: sourceContext('A', { candidate_count: 2 }) }),
    buildTransfer({ active_lineage: { current_bed: 'X', transfer_lineage_id: 'lineage-existing-0001', last_active_transfer_anchor_id: 'anchor-existing-0001' } })
  ];
  assert.deepEqual(rejected.map(row => row.error_code), ['BED_TRANSFER_SAME_BED_NOT_ALLOWED', 'BED_TRANSFER_334_FORBIDDEN', 'BED_TRANSFER_COMPANY_SCOPE_MISMATCH', 'BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS', 'BED_TRANSFER_LINEAGE_DISCONTINUOUS']);
  assert.equal(rejected.every(row => row.no_write === true), true);
  const ttlockBase = extra => ({ corpid, from_bed: 'A', to_bed: 'B', source_resolution: { resolution_status: 'resolved', from_bed: 'A', candidate_group_count: 1, deposit_context_ref: 'source-D-ref', expiry_context_ref: 'source-exp-ref', expected_checkin_mmdd: '0102' }, source_snapshot: snapshot('vacant'), target_snapshot: snapshot('not_marked_vacant', { parsed_deposit_amount: 200, parsed_checkin_mmdd: '0102', parsed_valid_until_mmdd: '0815' }), observation_at: '2026-07-12T16:00:00+04:00', ...extra });
  const ttlockRejected = [
    classifyBedTransferTtlockSequence(ttlockBase({ source_snapshot: snapshot('not_marked_vacant'), target_snapshot: snapshot('not_marked_vacant') })),
    classifyBedTransferTtlockSequence(ttlockBase({ source_snapshot: snapshot('vacant'), target_snapshot: snapshot('vacant') })),
    classifyBedTransferTtlockSequence(ttlockBase({ target_snapshot: snapshot('not_marked_vacant', { parsed_deposit_amount: null, parsed_checkin_mmdd: '0102', parsed_valid_until_mmdd: '0815' }) })),
    classifyBedTransferTtlockSequence(ttlockBase({ target_snapshot: snapshot('not_marked_vacant', { parsed_deposit_amount: 200, parsed_checkin_mmdd: '', parsed_valid_until_mmdd: '0815' }) })),
    classifyBedTransferTtlockSequence(ttlockBase({ target_snapshot: snapshot('not_marked_vacant', { parsed_deposit_amount: 200, parsed_checkin_mmdd: '0102', parsed_valid_until_mmdd: '' }) })),
    classifyBedTransferTtlockSequence(ttlockBase({ target_snapshot: snapshot('not_marked_vacant', { parsed_deposit_amount: 200, parsed_checkin_mmdd: '0203', parsed_valid_until_mmdd: '0815' }) }))
  ];
  assert.deepEqual(ttlockRejected.map(row => row.error_code), ['BED_TRANSFER_TTLOCK_STATE_INVALID', 'BED_TRANSFER_TTLOCK_STATE_INVALID', 'BED_TRANSFER_OWNER_FIRST_TARGET_D_REQUIRED', 'BED_TRANSFER_OWNER_FIRST_TARGET_MMDD_REQUIRED', 'BED_TRANSFER_OWNER_FIRST_TARGET_EXPIRY_REQUIRED', 'BED_TRANSFER_OWNER_FIRST_MMDD_MISMATCH']);
});

test('Scenario G: provider, server fields, timestamps, mixed sessions, gate false and idempotency conflicts fail before write', () => {
  assert.equal(buildTransfer({ client_payload: { event_type: 'bed_transfer', tenant_card_id: 'forbidden' } }).error_code, 'BED_TRANSFER_FORBIDDEN_IDENTITY_FIELD');
  assert.equal(buildTransfer({ client_payload: { event_type: 'bed_transfer', transfer_anchor_id: 'forbidden' } }).error_code, 'BED_TRANSFER_SERVER_MANAGED_FIELD_FORBIDDEN');
  const firewall = functionBlock(worker, 'bedTransferForbiddenIdentityFieldsFromBody');
  assert.match(firewall, /transferat","transferdate","canonicalacceptedat","acceptedat/);
  const single = functionBlock(worker, 'employeeBedTransferSingleEntryFailure');
  assert.match(single, /rows\.length!==1/);
  assert.match(single, /BED_TRANSFER_SESSION_MUST_BE_SINGLE_ENTRY/);
  const gate = functionBlock(worker, 'bedTransferWriteApproved');
  const context = {};
  vm.createContext(context);
  vm.runInContext(gate, context);
  assert.equal(context.bedTransferWriteApproved({ BED_TRANSFER_WRITE_APPROVED: 'false' }), false);
  const accepted = archiveTransfer(buildTransfer({}, { anchor: 'transfer-anchor-idempotent' }), 'session-idempotent', '2026-07-12T16:10:00+04:00');
  const changed = archiveTransfer(buildTransfer({ to_bed: 'C' }, { anchor: 'transfer-anchor-idempotent' }), 'session-idempotent', '2026-07-12T16:10:00+04:00');
  assert.equal(classifyExistingCanonicalTransfer(accepted.entries_json, changed.request_fingerprint).error_code, 'BED_TRANSFER_IDEMPOTENCY_CONFLICT');
  const flow = functionBlock(employeeUi, 'saveCanonicalBedTransferDraft');
  assert.match(flow, /state\.drafts=\[entry\]/);
  assert.match(flow, /renderEmployeeUploadDryRunError/);
});

test('Source-of-truth acceptance: canonical archive is the only transfer fact and all projections remain rebuildable', () => {
  assert.match(functionBlock(worker, 'persistEmployeeBedTransferCanonicalArchive'), /INSERT INTO sessions .*source,entries_json\)/s);
  assert.doesNotMatch(functionBlock(worker, 'persistEmployeeBedTransferCanonicalArchive'), /bed_transfer_events|transactions|entry_events|DB\.batch/);
  assert.match(worker, /source_deposit.*access_snapshot_remark_D|deposit_current_balance_source:"TTLock \/ Access Snapshot D amount"/);
  assert.match(worker, /physical_bed_status_source/);
  assert.doesNotMatch(functionBlock(employeeUi, 'buildBedTransferAnchor'), /tenant_card_id|card_id|provider_phone|phone_99099|provider_metadata|transfer_at|transfer_date/);
  for (const name of ['ownerHistoryTransferLineageHtml', 'renderOwnerFinancePanel', 'renderOwnerArrearsTaskCard', 'ownerBedTransferTodoRowHtml']) {
    assert.doesNotMatch(functionBlock(ownerUi, name), /localStorage|tenant_card_id|card_id|provider_phone|phone_99099|provider_metadata/i);
  }
  assert.match(worker, /saveSessionContainsBedTransfer\(body\).*bedTransferCanonicalPathRequiredResponse/);
  assert.match(worker, /production_cutover:"PRODUCTION_NO_GO"/);
});

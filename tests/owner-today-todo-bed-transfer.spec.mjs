import test from 'node:test';
import assert from 'node:assert/strict';
import { BED_TRANSFER_TODO_CODES, projectBedTransferOwnerTodos } from '../modules/owner-todo/bed-transfer-owner-todo.mjs';

const transfer = (overrides = {}) => ({ event_type:'bed_transfer', transfer_anchor_id:'tf-1', transfer_lineage_id:'lineage-1', corpid:'corp', from_bed:'A', to_bed:'B', canonical_accepted_at:'2026-07-12T10:00:00Z', ttlock_sequence:'employee_first_pre_move', reconciliation_required:true, source_snapshot_fingerprint:'source-before', target_snapshot_fingerprint:'target-before', fee_mode:'paid', fee_amount_aed:50, bed_price_difference_mode:'none', bed_price_difference_amount_aed:0, ...overrides });
const snapshot = (bed, vacant, overrides = {}) => ({ bed, snapshot_fingerprint:`fp-${bed}`, physical_bed_status:vacant?'vacant':'not_marked_vacant', parsed_vacancy_marker:vacant, parsed_deposit_amount:vacant?null:200, parsed_checkin_mmdd:vacant?'':'0712', parsed_valid_until_mmdd:vacant?'':'0812', parse_status:'parsed', warnings:[], ...overrides });
const project = (entries, snapshots = { A:snapshot('A',false), B:snapshot('B',true) }) => projectBedTransferOwnerTodos({ corpid:'corp', archive_entries:entries, access_snapshots:snapshots });

test('employee-first unresolved creates one stable provider-free TTLock todo', () => {
  const first=project([transfer()]); const second=project([transfer()]);
  assert.equal(first.todos.length,1); assert.equal(first.todos[0].task_type,BED_TRANSFER_TODO_CODES.TTLOCK);
  assert.equal(first.todos[0].task_id,second.todos[0].task_id);
  assert.equal(first.todos[0].transfer_anchor_id,'tf-1');
  assert.doesNotMatch(JSON.stringify(first),/tenant_card_id|provider_phone|card_id|old_ttlock_ref/);
});

test('valid post-move auto-resolves while invalid TTLock pairs stay active with warnings', () => {
  assert.equal(project([transfer()],{A:snapshot('A',true),B:snapshot('B',false)}).todos.length,0);
  const occupied=project([transfer()],{A:snapshot('A',false),B:snapshot('B',false)}).todos[0];
  assert.ok(occupied.warnings.includes('BED_TRANSFER_TTLOCK_BOTH_OCCUPIED'));
  const vacant=project([transfer()],{A:snapshot('A',true),B:snapshot('B',true)}).todos[0];
  assert.ok(vacant.warnings.includes('BED_TRANSFER_TTLOCK_BOTH_VACANT'));
  const missing=project([transfer()],{A:snapshot('A',true),B:snapshot('B',false,{parsed_deposit_amount:null,parsed_checkin_mmdd:'',parsed_valid_until_mmdd:''})}).todos[0];
  assert.ok(missing.warnings.includes('BED_TRANSFER_TARGET_D_MISSING'));
  assert.ok(missing.warnings.includes('BED_TRANSFER_TARGET_MMDD_MISSING'));
  assert.ok(missing.warnings.includes('BED_TRANSFER_TARGET_EXPIRY_MISSING'));
  const ambiguous=project([transfer()],{A:snapshot('A',true),B:snapshot('B',false,{candidate_count:2,ambiguous:true})}).todos[0];
  assert.ok(ambiguous.warnings.includes('BED_TRANSFER_TTLOCK_CONTEXT_AMBIGUOUS_OR_INVALID'));
});

test('known MMDD mismatch remains active and owner-first creates no move todo', () => {
  const mismatch=project([transfer({expected_checkin_mmdd:'0101'})],{A:snapshot('A',true),B:snapshot('B',false)}).todos[0];
  assert.ok(mismatch.warnings.includes('BED_TRANSFER_TARGET_MMDD_CONTINUITY_MISMATCH'));
  assert.equal(project([transfer({ttlock_sequence:'owner_first_post_move',reconciliation_required:false})],{A:snapshot('A',true),B:snapshot('B',false)}).todos.length,0);
});

test('void resolves ordinary move todo and correction derives only replacement', () => {
  const voided=project([transfer(),{event_type:'void_transfer',target_transfer_anchor_id:'tf-1',corpid:'corp'}]);
  assert.equal(voided.todos.length,1,'paid void keeps only finance reconciliation');
  assert.equal(voided.todos[0].task_type,BED_TRANSFER_TODO_CODES.FINANCIAL);
  const replacement=transfer({transfer_anchor_id:'tf-2',replacement_for_transfer_anchor_id:'tf-1',fee_mode:'unpaid',fee_amount_aed:50});
  const corrected=project([transfer(),replacement]);
  assert.equal(corrected.todos.filter(row=>row.task_type===BED_TRANSFER_TODO_CODES.TTLOCK).length,1);
  assert.equal(corrected.todos.find(row=>row.task_type===BED_TRANSFER_TODO_CODES.TTLOCK).transfer_anchor_id,'tf-2');
});

test('waiver todo appears only for effective unacknowledged waiver', () => {
  const waived=transfer({fee_mode:'waived',fee_amount_aed:0,fee_waiver_reason:'manager courtesy',ttlock_sequence:'owner_first_post_move',reconciliation_required:false});
  assert.equal(project([waived],{A:snapshot('A',true),B:snapshot('B',false)}).todos[0].task_type,BED_TRANSFER_TODO_CODES.WAIVER);
  const ack={event_type:'owner_review_acknowledgment',target_transfer_anchor_id:'tf-1',review_code:BED_TRANSFER_TODO_CODES.WAIVER,action:'acknowledged',corpid:'corp'};
  assert.equal(project([waived,ack],{A:snapshot('A',true),B:snapshot('B',false)}).todos.length,0);
  for(const mode of ['paid','unpaid'])assert.equal(project([waived,{...waived,transfer_anchor_id:`tf-${mode}`,fee_mode:mode,fee_amount_aed:50}],{A:snapshot('A',true),B:snapshot('B',false)}).todos.filter(row=>row.transfer_anchor_id===`tf-${mode}`&&row.task_type===BED_TRANSFER_TODO_CODES.WAIVER).length,0);
});

test('void financial todo requires actual collected amount and never invents refund', () => {
  const voidEvent={event_type:'void_transfer',target_transfer_anchor_id:'tf-1',corpid:'corp'};
  const paidFee=project([transfer(),voidEvent]).todos[0];
  assert.equal(paidFee.task_type,BED_TRANSFER_TODO_CODES.FINANCIAL); assert.equal(paidFee.automatic_refund_created,false); assert.equal(paidFee.effective_income_amount,0);
  const paidDifference=project([transfer({fee_mode:'waived',fee_amount_aed:0,fee_waiver_reason:'x',bed_price_difference_mode:'paid',bed_price_difference_amount_aed:75}),voidEvent]).todos[0];
  assert.equal(paidDifference.paid_bed_price_difference_amount,75);
  for(const mode of ['unpaid','waived']){
    const row=transfer({fee_mode:mode,fee_amount_aed:mode==='unpaid'?50:0,fee_waiver_reason:mode==='waived'?'x':''});
    assert.equal(project([row,voidEvent]).todos.length,0);
  }
});

test('retain-earned-income void resolves operational todo without creating financial reconciliation', () => {
  const retainedVoid={
    event_type:'void_transfer',
    target_transfer_anchor_id:'tf-1',
    financial_disposition:'retain_earned_income',
    paid_transfer_fee_amount_aed:50,
    payment_method:'cash',
    refund_required:false,
    automatic_refund_created:false,
    corpid:'corp'
  };
  assert.deepEqual(project([transfer(),retainedVoid]).todos,[]);
});

test('cross-corpid fails closed and bed 334 never produces todo', () => {
  assert.equal(projectBedTransferOwnerTodos({corpid:'corp',archive_entries:[transfer({corpid:'other'})],access_snapshots:{}}).error_code,'BED_TRANSFER_TODO_CORPID_MISMATCH');
  assert.equal(project([transfer({from_bed:'334'})]).todos.length,0);
});

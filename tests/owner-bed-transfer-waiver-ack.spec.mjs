import test from 'node:test';
import assert from 'node:assert/strict';
import { BED_TRANSFER_TODO_CODES, findOwnerReviewAcknowledgmentForbiddenFields, prepareOwnerReviewAcknowledgment } from '../modules/owner-todo/bed-transfer-owner-todo.mjs';

const transfer={event_type:'bed_transfer',transfer_anchor_id:'tf-waive',transfer_lineage_id:'lineage',corpid:'corp',from_bed:'A',to_bed:'B',fee_mode:'waived',fee_amount_aed:0,fee_waiver_reason:'courtesy'};
const request={transfer_anchor_id:'tf-waive',review_code:BED_TRANSFER_TODO_CODES.WAIVER,action:'acknowledged',idempotency_key:'same'};
const prepare=(overrides={})=>prepareOwnerReviewAcknowledgment({request,effective_transfer:transfer,corpid:'corp',accepted_at:'2026-07-12T12:00:00Z',owner_reference:'owner-1',...overrides},{idFactory:kind=>kind==='acknowledgment_session_id'?'session-ack':'anchor-ack'});

test('owner acknowledgment is additive, stable, finance-zero and does not mutate transfer',()=>{
  const result=prepare(); assert.equal(result.ok,true);
  assert.equal(result.entry.event_type,'owner_review_acknowledgment');
  assert.equal(result.entry.target_transfer_anchor_id,'tf-waive');
  assert.deepEqual(result.entry.finance_effect,{gross_received:0,rent_income:0,bed_transfer_fee_income:0,bed_price_difference_income:0});
  assert.equal(result.entry.transfer_status_mutated,false);
  assert.equal(prepare().canonical_fingerprint,result.canonical_fingerprint);
});

test('wrong corpid, non-waiver and wrong action reject',()=>{
  assert.equal(prepare({corpid:'other'}).error_code,'OWNER_REVIEW_ACK_CORPID_MISMATCH');
  assert.equal(prepare({effective_transfer:{...transfer,fee_mode:'paid',fee_amount_aed:50}}).error_code,'OWNER_REVIEW_ACK_NOT_APPLICABLE');
  assert.equal(prepareOwnerReviewAcknowledgment({request:{...request,action:'approved'},effective_transfer:transfer,corpid:'corp'}).error_code,'OWNER_REVIEW_ACK_CONTRACT_INVALID');
});

test('nested lineage, business facts and provider aliases are rejected',()=>{
  assert.deepEqual(findOwnerReviewAcknowledgmentForbiddenFields({wrapper:{transferLineageId:'x'},nested:{tenant_card_id:'card'},from_bed:'A'}),['from_bed','nested.tenant_card_id','wrapper.transferLineageId']);
});

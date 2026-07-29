const clean=value=>String(value??'').trim();
const stable=value=>Array.isArray(value)?`[${value.map(stable).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`:JSON.stringify(value);
function hash(value){let h=2166136261;for(const c of stable(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return `btv-${(h>>>0).toString(16).padStart(8,'0')}`;}

export function prepareOwnerBedTransferVoid(input={},options={}){
  const request=input.request||{},transfer=input.effective_transfer||{};
  const allowed=new Set(['transfer_anchor_id','reason','idempotency_key','financial_disposition']);
  const invalid=Object.keys(request).filter(key=>!allowed.has(key)).sort();
  if(invalid.length)return{ok:false,error_code:'BED_TRANSFER_VOID_FIELD_FORBIDDEN',invalid_fields:invalid,no_write:true,before_db:true};
  const target=clean(request.transfer_anchor_id),transferAnchor=clean(transfer.transfer_anchor_id||transfer.anchor_id||transfer.event_id);
  if(!target)return{ok:false,error_code:'BED_TRANSFER_VOID_TARGET_REQUIRED',no_write:true};
  if(!transferAnchor||target!==transferAnchor)return{ok:false,error_code:'BED_TRANSFER_VOID_TARGET_NOT_EFFECTIVE',no_write:true};
  if(!clean(input.corpid)||clean(transfer.corpid)!==clean(input.corpid))return{ok:false,error_code:'BED_TRANSFER_VOID_CORPID_MISMATCH',no_write:true};
  const reason=clean(request.reason);
  if(reason!=='CONTROLLED_BETA_TEST_CLEANUP')return{ok:false,error_code:'BED_TRANSFER_VOID_REASON_INVALID',no_write:true};
  const financialDisposition=clean(request.financial_disposition);
  if(financialDisposition&&financialDisposition!=='retain_earned_income')return{ok:false,error_code:'BED_TRANSFER_VOID_FINANCIAL_DISPOSITION_INVALID',no_write:true};
  const retainEarnedIncome=financialDisposition==='retain_earned_income';
  const feeMode=clean(transfer.fee_mode).toLowerCase(),paymentMethod=clean(transfer.payment_method).toLowerCase();
  const feeAmount=Math.round(Number(transfer.fee_amount_aed||0)*100)/100;
  const differenceMode=clean(transfer.bed_price_difference_mode||'none').toLowerCase();
  const differenceAmount=Math.round(Number(transfer.bed_price_difference_amount_aed||0)*100)/100;
  if(retainEarnedIncome&&(feeMode!=='paid'||feeAmount!==50||!['cash','bank'].includes(paymentMethod)||differenceMode!=='none'||differenceAmount!==0)){
    return{ok:false,error_code:'BED_TRANSFER_VOID_RETAIN_EARNED_INCOME_NOT_APPLICABLE',no_write:true};
  }
  const acceptedAt=clean(input.accepted_at),owner=clean(input.owner_reference),fingerprint=hash({corpid:clean(input.corpid),target,reason,financial_disposition:financialDisposition});
  const idFactory=options.idFactory||(()=>null),sessionId=idFactory('void_session_id'),anchorId=idFactory('void_anchor_id');
  const entry={event_type:'void_transfer',type:'TRANSFER_VOID',void_anchor_id:anchorId,anchor_id:anchorId,target_transfer_anchor_id:target,transfer_lineage_id:clean(transfer.transfer_lineage_id),from_bed:clean(transfer.from_bed),to_bed:clean(transfer.to_bed),corpid:clean(input.corpid),void_reason:reason,voided_at:acceptedAt,voided_by:owner,canonical_request_fingerprint:fingerprint,effective:true,original_transfer_mutated:false,hard_delete:false,ttlock_mutated:false,finance_effect:{rent_income:0,deposit_received:0,deposit_refund:0,arrears_repaid:0,bed_transfer_fee_income:0}};
  if(retainEarnedIncome)Object.assign(entry,{financial_disposition:'retain_earned_income',paid_transfer_fee_amount_aed:50,payment_method:paymentMethod,refund_required:false,automatic_refund_created:false});
  return{ok:true,void_session_id:sessionId,void_anchor_id:anchorId,request_fingerprint:fingerprint,entry,entries_json:JSON.stringify({anchor_contract_version:'employee_entry_anchor_v1',entries:[entry]})};
}

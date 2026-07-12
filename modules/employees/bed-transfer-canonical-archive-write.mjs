const clean=v=>String(v??'').trim();
const stable=value=>Array.isArray(value)?`[${value.map(stable).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`:JSON.stringify(value);
function hash(value){let h=2166136261;for(const c of stable(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return `bt-${(h>>>0).toString(16).padStart(8,'0')}`}
const sorted=a=>[...new Set((a||[]).map(clean).filter(Boolean))].sort((x,y)=>x.localeCompare(y));

export function prepareCanonicalTransferArchiveWrite(input={},options={}){
  const v=input.validated_anchor||{},sessionId=clean(input.session_id),now=clean(input.accepted_at),operator=clean(input.operator_reference);
  if(!sessionId)return{ok:false,error_code:'BED_TRANSFER_SESSION_ID_REQUIRED'};
  const business={event_type:'bed_transfer',type:'TF',from_bed:clean(v.from_bed),to_bed:clean(v.to_bed),transfer_at:clean(v.transfer_at),transfer_reason:clean(v.transfer_reason),corpid:clean(v.corpid),source_context_anchor_refs:sorted(v.source_context_anchor_refs),carried_arrears_refs:sorted(v.carried_arrears_refs),rent_coverage_ref:clean(v.rent_coverage_ref),deposit_context_ref:clean(v.deposit_context_ref),expiry_context_ref:clean(v.expiry_context_ref),access_snapshot_fingerprint:clean(v.snapshot_fingerprint||v.access_snapshot_fingerprint),fee_mode:clean(v.fee_mode),fee_amount_aed:Number(v.fee_amount_aed||0),fee_due_date:clean(v.fee_due_date),fee_waiver_reason:clean(v.fee_waiver_reason),payment_method:clean(v.payment_method)};
  const requestFingerprint=hash(business),idFactory=options.idFactory||(()=>null);
  const entry={...business,transfer_anchor_id:clean(v.transfer_anchor_id)||idFactory('transfer_anchor_id'),transfer_lineage_id:clean(v.transfer_lineage_id)||idFactory('transfer_lineage_id'),previous_transfer_anchor_id:clean(v.previous_transfer_anchor_id)||null,canonical_accepted_at:now,operator_reference:operator,source:'employee_entry',canonical_request_fingerprint:requestFingerprint};
  return{ok:true,session_id:sessionId,request_fingerprint:requestFingerprint,entry,entries_json:JSON.stringify({anchor_contract_version:'employee_entry_anchor_v1',entries:[entry]})};
}

export function classifyExistingCanonicalTransfer(existingEntriesJson,requestFingerprint){
  try{const p=JSON.parse(existingEntriesJson||'{}'),rows=Array.isArray(p)?p:p.entries||[];const entry=rows.find(r=>r?.event_type==='bed_transfer');if(!entry)return{status:'conflict',error_code:'BED_TRANSFER_IDEMPOTENCY_CONFLICT'};if(entry.canonical_request_fingerprint!==requestFingerprint)return{status:'conflict',error_code:'BED_TRANSFER_IDEMPOTENCY_CONFLICT'};return{status:'accepted',idempotent:true,entry};}catch{return{status:'conflict',error_code:'BED_TRANSFER_IDEMPOTENCY_CONFLICT'}}
}

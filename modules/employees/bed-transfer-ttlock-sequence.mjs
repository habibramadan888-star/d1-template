const clean=v=>String(v??'').trim();
const occupied=s=>s?.physical_bed_status==='not_marked_vacant'&&s?.parsed_vacancy_marker!==true;
const vacant=s=>s?.physical_bed_status==='vacant'&&s?.parsed_vacancy_marker===true;
const bad=s=>!s||!clean(s.snapshot_fingerprint)||s.missing===true||s.ambiguous===true||s.conflict===true||s.stale===true||Number(s.candidate_count??1)!==1||['missing','ambiguous','invalid','unparsed','unavailable','stale','conflict'].includes(clean(s.parse_status).toLowerCase());
const fail=(error_code,reasons=[])=>({status:'invalid_state',error_code,ambiguity_reasons:reasons,reconciliation_required:false});
export function classifyBedTransferTtlockSequence(input={}){
  const source=input.source_snapshot||{},target=input.target_snapshot||{},resolved=input.source_resolution||{};
  if(clean(input.from_bed)==='334'||clean(input.to_bed)==='334')return fail('BED_TRANSFER_334_FORBIDDEN',['bed_334_forbidden']);
  if(clean(input.corpid)!==clean(source.corpid)||clean(input.corpid)!==clean(target.corpid))return fail('BED_TRANSFER_TTLOCK_STATE_INVALID',['corpid_mismatch']);
  if(resolved.resolution_status!=='resolved'||clean(resolved.from_bed)!==clean(input.from_bed))return fail('BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS',['source_context_not_resolved']);
  if(resolved.active_transfer_lineage_id&&clean(resolved.previous_transfer_anchor_id)==='')return fail('BED_TRANSFER_LINEAGE_DISCONTINUITY',['active_lineage_terminal_missing']);
  if(bad(source)||bad(target))return fail('BED_TRANSFER_TTLOCK_CONTEXT_AMBIGUOUS',['snapshot_missing_ambiguous_or_invalid']);
  const base={source_snapshot_fingerprint:clean(source.snapshot_fingerprint),target_snapshot_fingerprint:clean(target.snapshot_fingerprint),ttlock_observation_at:clean(input.observation_at),physical_state_before_submission:{source:source.physical_bed_status,target:target.physical_bed_status},continuity_checks:{corpid:'matched',request_beds:'matched',source_context:'resolved'},active_transfer_lineage_id:resolved.active_transfer_lineage_id||null,previous_transfer_anchor_id:resolved.previous_transfer_anchor_id||null};
  if(occupied(source)&&vacant(target))return{status:'employee_first_pre_move',ttlock_sequence:'employee_first_pre_move',reconciliation_required:true,...base,deposit_context_ref:clean(resolved.deposit_context_ref),expiry_context_ref:clean(resolved.expiry_context_ref)};
  if(vacant(source)&&occupied(target)){
    if(target.parsed_deposit_amount===null||target.parsed_deposit_amount===undefined||target.deposit_parse_valid===false)return fail('BED_TRANSFER_OWNER_FIRST_TARGET_D_REQUIRED',['target_D_missing']);
    const mmdd=clean(target.parsed_checkin_mmdd);if(!mmdd)return fail('BED_TRANSFER_OWNER_FIRST_TARGET_MMDD_REQUIRED',['target_MMDD_missing']);
    const expiry=clean(target.normalized_expiry_value||target.parsed_valid_until_mmdd);if(!expiry)return fail('BED_TRANSFER_OWNER_FIRST_TARGET_EXPIRY_REQUIRED',['target_expiry_missing']);
    const expected=clean(resolved.expected_checkin_mmdd);if(expected&&expected!==mmdd)return fail('BED_TRANSFER_OWNER_FIRST_MMDD_MISMATCH',['known_MMDD_mismatch']);
    return{status:'owner_first_post_move',ttlock_sequence:'owner_first_post_move',reconciliation_required:false,...base,continuity_checks:{...base.continuity_checks,mmdd:expected?'matched':'target_complete_no_source_reference',deposit:'target_D_present',expiry:'target_normalized_expiry_present'},deposit_context_ref:`access_snapshot:${clean(target.snapshot_fingerprint)}:D`,expiry_context_ref:`access_snapshot:${clean(target.snapshot_fingerprint)}:expiry`};
  }
  return fail('BED_TRANSFER_TTLOCK_STATE_INVALID',['physical_state_pair_invalid']);
}

const clean=v=>String(v??'').trim();
const bed=v=>clean(v).replace(/^#+/,'');
const stable=a=>[...new Set(a.map(clean).filter(Boolean))].sort((x,y)=>x.localeCompare(y));
const active=e=>e.effective!==false&&!['void','voided','reversed','deleted','inactive'].includes(clean(e.effective_status||e.archive_state||e.status).toLowerCase())&&!e.voided_at;
const time=e=>clean(e.accepted_at||e.occurred_at||e.created_at||e.date);
const ref=e=>clean(e.anchor_ref||e.anchor_id||e.event_id||(e.session_id&&e.entry_id?`${e.session_id}:${e.entry_id}`:''));
const eventType=e=>clean(e.event_type).toLowerCase();
const relevant=(e,b)=>bed(e.bed||e.room)===b||bed(e.from_bed)===b||bed(e.to_bed)===b;
const sourceCandidate=e=>eventType(e)==='rent';
const voidTarget=e=>clean(e.target_anchor_id||e.voided_anchor_id||e.target_transfer_anchor_id||e.voided_transfer_anchor_id||e.voids_transfer_anchor_id||e.reversal_of_transfer_anchor_id||e.original_event_id);
const voidEvidence=e=>['void','void_event','void_transfer','transfer_void','reversal','reverse','correction_void'].includes(eventType(e));
const clone=v=>JSON.parse(JSON.stringify(v??null));

function failure(status,error_code,count,reasons){return{resolution_status:status,error_code,candidate_group_count:count,ambiguity_reasons:stable(reasons)}}
function contextRefs(entries){return stable(entries.map(ref));}
function arrearsRefs(rows){return stable(rows.map(r=>clean(r.arrears_ref||r.cloud_arrears_ref)).filter(Boolean));}
function contextRefsFromSnapshot(snapshot={}){const fp=clean(snapshot.snapshot_fingerprint||snapshot.fingerprint);return{snapshot_fingerprint:fp,deposit_context_ref:fp?`access_snapshot:${fp}:D`:'',expiry_context_ref:fp?`access_snapshot:${fp}:expiry`:''};}

export function resolveOwnerConfirmedLegacyGenesis(raw={}){
  const input=clone(raw),base=input.base_resolution||{},fromBed=bed(input.from_bed),toBed=bed(input.to_bed);
  const source=input.source_context||{},target=input.target_context||{};
  const allowlist=new Set((Array.isArray(input.allowed_source_beds)?input.allowed_source_beds:[]).map(bed).filter(Boolean));
  const fail=(code,reasons)=>failure('ambiguous',code,0,reasons);
  const appEnv=clean(input.app_env).toLowerCase(),mode=clean(input.legacy_genesis_mode).toLowerCase();
  const controlledBeta=appEnv==='beta_preview'&&input.write_approved===true;
  const internalBeta=appEnv==='internal_beta'&&input.write_approved===true&&mode==='server_verified';
  if(!controlledBeta&&!internalBeta)return fail('BED_TRANSFER_LEGACY_GENESIS_DISABLED',['legacy_genesis_gate_closed']);
  if(controlledBeta&&!allowlist.has(fromBed))return fail('BED_TRANSFER_LEGACY_GENESIS_NOT_ALLOWLISTED',['source_bed_not_allowlisted']);
  if(controlledBeta&&(fromBed!=='146'||toBed!=='111'))return fail('BED_TRANSFER_LEGACY_GENESIS_SCOPE_MISMATCH',['controlled_beta_pair_required']);
  if(fromBed==='334'||toBed==='334'||!fromBed||!toBed||fromBed===toBed)return fail('BED_TRANSFER_LEGACY_GENESIS_SCOPE_MISMATCH',['invalid_bed_pair']);
  if(clean(input.corpid)!==clean(source.corpid)||clean(input.corpid)!==clean(target.corpid))return fail('BED_TRANSFER_COMPANY_SCOPE_MISMATCH',['corpid_mismatch']);
  const emptyCanonical=base.error_code==='BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS'&&Number(base.candidate_group_count||0)===0&&Array.isArray(base.ambiguity_reasons)&&base.ambiguity_reasons.length>0&&base.ambiguity_reasons.every(reason=>['no_legacy_mmdd_match','no_post_checkout_genesis'].includes(reason));
  if(!emptyCanonical)return fail(base.error_code||'BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS',['canonical_conflict_or_existing_context']);
  if(!['occupied','not_marked_vacant'].includes(clean(source.physical_bed_status).toLowerCase())||source.parsed_vacancy_marker===true)return fail('BED_TRANSFER_LEGACY_GENESIS_SOURCE_NOT_OCCUPIED',['source_not_occupied']);
  if(clean(target.physical_bed_status).toLowerCase()!=='vacant'||target.parsed_vacancy_marker!==true)return fail('BED_TRANSFER_TARGET_NOT_VACANT',['target_not_vacant']);
  for(const ctx of [source,target])if(ctx.ambiguous===true||ctx.conflict===true||ctx.stale===true||Number(ctx.candidate_count||0)!==1)return fail('BED_TRANSFER_ACCESS_SNAPSHOT_AMBIGUOUS',['access_snapshot_not_unique']);
  const fp=clean(source.snapshot_fingerprint),mmdd=clean(source.parsed_checkin_mmdd),expiry=clean(source.normalized_expiry_value||source.parsed_valid_until_mmdd);
  if(!fp||!mmdd||!expiry||source.parsed_deposit_amount==null)return fail('BED_TRANSFER_LEGACY_GENESIS_CONTEXT_INCOMPLETE',['source_snapshot_context_incomplete']);
  const prefix=`access_snapshot:${fp}`;
  return {resolution_status:'resolved',resolution_method:internalBeta?'server_verified_legacy_genesis':'owner_confirmed_legacy_genesis',source_context_mode:internalBeta?'server_verified_legacy_genesis':'owner_confirmed_legacy',lineage_genesis:true,owner_confirmation_scope:internalBeta?'INTERNAL_BETA_EMPLOYEE_TTLOCK_VERIFIED':'CONTROLLED_BETA_TEST',corpid:clean(input.corpid),from_bed:fromBed,active_transfer_lineage_id:null,previous_transfer_anchor_id:null,genesis_anchor_ref:`${prefix}:legacy_genesis`,source_context_anchor_refs:[`${prefix}:legacy_genesis`],carried_arrears_refs:arrearsRefs(input.open_arrears||[]),rent_coverage_ref:`${prefix}:MMDD:${mmdd}`,deposit_context_ref:`${prefix}:D`,expiry_context_ref:`${prefix}:expiry`,snapshot_fingerprint:fp,expected_checkin_mmdd:mmdd,candidate_group_count:1,candidate_count:1,ambiguity_reasons:[]};
}
function finish(method,input,entries,genesis,options={}){
  const snapshot=contextRefsFromSnapshot(input.access_snapshot||{});
  const rents=entries.filter(e=>eventType(e)==='rent');
  const rent=rents.at(-1)||genesis;
  return{resolution_status:'resolved',resolution_method:method,corpid:clean(input.corpid),from_bed:bed(input.from_bed),active_transfer_lineage_id:options.lineage_id||null,previous_transfer_anchor_id:options.previous_anchor_id||null,genesis_anchor_ref:ref(genesis),source_context_anchor_refs:contextRefs(entries),carried_arrears_refs:arrearsRefs(input.open_arrears||[]),rent_coverage_ref:clean(rent?.rent_coverage_ref)||ref(rent),deposit_context_ref:snapshot.deposit_context_ref,expiry_context_ref:snapshot.expiry_context_ref,snapshot_fingerprint:snapshot.snapshot_fingerprint,expected_checkin_mmdd:clean(genesis?.checkin_mmdd||genesis?.parsed_checkin_mmdd),candidate_group_count:1,ambiguity_reasons:[]};
}

function resolveLineage(input,transfers,voided){
  const groups=new Map();
  for(const edge of transfers.filter(active)){const id=clean(edge.transfer_lineage_id);if(!id)continue;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(edge)}
  const matches=[];
  for(const [id,edges] of groups){
    const usable=edges.filter(e=>!voided.has(clean(e.transfer_anchor_id)));
    const byId=new Map(usable.map(e=>[clean(e.transfer_anchor_id),e]));
    const roots=usable.filter(e=>!clean(e.previous_transfer_anchor_id));
    let broken=roots.length!==1,ordered=[],cur=roots[0];
    while(cur&&!broken){ordered.push(cur);const next=usable.filter(e=>clean(e.previous_transfer_anchor_id)===clean(cur.transfer_anchor_id));if(next.length>1){broken=true;break}cur=next[0]}
    if(ordered.length!==usable.length)broken=true;
    for(const e of usable)if(clean(e.previous_transfer_anchor_id)&&!byId.has(clean(e.previous_transfer_anchor_id)))broken=true;
    if(broken&&edges.some(e=>relevant(e,bed(input.from_bed))))return failure('discontinuous','BED_TRANSFER_LINEAGE_DISCONTINUITY',groups.size,['active_transfer_lineage_broken']);
    const last=ordered.at(-1);if(last&&bed(last.to_bed)===bed(input.from_bed))matches.push({id,ordered,last});
  }
  if(matches.length>1)return failure('discontinuous','BED_TRANSFER_LINEAGE_DISCONTINUITY',matches.length,['multiple_active_lineages_for_current_bed']);
  if(matches.length===1){const m=matches[0],entries=m.ordered;const genesis={anchor_ref:entries[0].source_context_anchor_refs?.[0]||ref(entries[0])};return finish('active_transfer_lineage',input,entries,genesis,{lineage_id:m.id,previous_anchor_id:clean(m.last.transfer_anchor_id)});}
  return null;
}

export function resolveBedTransferSourceContext(raw={}){
  const input=clone(raw),fromBed=bed(input.from_bed);
  if(fromBed==='334')return failure('ambiguous','BED_TRANSFER_334_FORBIDDEN',0,['bed_334_forbidden']);
  const rawEntries=input.archive_entries||[];
  const voidRows=[...(input.void_anchors||[]),...rawEntries.filter(voidEvidence)].filter(active);
  const voidedRefs=new Set(voidRows.map(voidTarget).filter(Boolean));
  const all=rawEntries.filter(e=>active(e)&&!voidedRefs.has(ref(e))).sort((a,b)=>time(a).localeCompare(time(b))||ref(a).localeCompare(ref(b)));
  const transfers=(input.transfer_anchors||all.filter(e=>eventType(e)==='bed_transfer')).filter(active);
  const voided=new Set(voidRows.map(voidTarget).filter(Boolean));
  const lineage=resolveLineage(input,transfers,voided);if(lineage)return lineage;
  const entries=all.filter(e=>relevant(e,fromBed)&&eventType(e)!=='bed_transfer');
  const closes=entries.filter(e=>['checkout','left_with_arrears'].includes(eventType(e)));
  if(closes.length){
    const latest=closes.at(-1),segment=entries.filter(e=>time(e)>time(latest));
    const starts=segment.filter(sourceCandidate);
    if(!starts.length)return failure('ambiguous','BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS',0,['no_post_checkout_genesis']);
    const explicit=stable(starts.filter(e=>e.stay_action==='start'||e.genesis_candidate===true).map(e=>clean(e.genesis_group_id||e.session_id||ref(e))));
    if(explicit.length>1)return failure('ambiguous','BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS',explicit.length,['multiple_unmergeable_post_checkout_genesis_groups']);
    const genesis=starts[0];return finish('post_latest_checkout_segment',input,segment.filter(sourceCandidate),genesis);
  }
  const mmdd=clean(input.access_snapshot?.checkin_mmdd||input.access_snapshot?.parsed_checkin_mmdd);
  const sourceEntries=entries.filter(sourceCandidate);
  const starts=sourceEntries.filter(e=>clean(e.checkin_mmdd||e.parsed_checkin_mmdd)===mmdd);
  const groups=new Map();for(const e of starts){const k=clean(e.genesis_group_id||e.session_id||ref(e));if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}
  if(!mmdd||groups.size!==1)return failure('ambiguous','BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS',groups.size,[groups.size?'multiple_legacy_mmdd_matches':'no_legacy_mmdd_match']);
  const group=[...groups.values()][0],genesis=group[0],startTime=time(genesis);
  if(sourceEntries.some(e=>time(e)<startTime&&!group.includes(e)))return failure('ambiguous','BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS',1,['unassigned_legacy_history']);
  return finish('unique_legacy_mmdd_canonical_match',input,sourceEntries.filter(e=>time(e)>=startTime),genesis);
}

const clean=v=>String(v??'').trim();
const bed=v=>clean(v).replace(/^#+/,'');
const stable=a=>[...new Set(a.map(clean).filter(Boolean))].sort((x,y)=>x.localeCompare(y));
const active=e=>!['void','voided','reversed','deleted','inactive'].includes(clean(e.effective_status||e.archive_state||e.status).toLowerCase())&&!e.voided_at;
const time=e=>clean(e.accepted_at||e.occurred_at||e.created_at||e.date);
const ref=e=>clean(e.anchor_ref||e.anchor_id||e.event_id||(e.session_id&&e.entry_id?`${e.session_id}:${e.entry_id}`:''));
const eventType=e=>clean(e.event_type).toLowerCase();
const relevant=(e,b)=>bed(e.bed||e.room)===b||bed(e.from_bed)===b||bed(e.to_bed)===b;
const clone=v=>JSON.parse(JSON.stringify(v??null));

function failure(status,error_code,count,reasons){return{resolution_status:status,error_code,candidate_group_count:count,ambiguity_reasons:stable(reasons)}}
function contextRefs(entries){return stable(entries.map(ref));}
function arrearsRefs(rows){return stable(rows.map(r=>clean(r.arrears_ref||r.cloud_arrears_ref)).filter(Boolean));}
function contextRefsFromSnapshot(snapshot={}){const fp=clean(snapshot.snapshot_fingerprint||snapshot.fingerprint);return{snapshot_fingerprint:fp,deposit_context_ref:fp?`access_snapshot:${fp}:D`:'',expiry_context_ref:fp?`access_snapshot:${fp}:expiry`:''};}
function finish(method,input,entries,genesis,options={}){
  const snapshot=contextRefsFromSnapshot(input.access_snapshot||{});
  const rents=entries.filter(e=>eventType(e)==='rent');
  const rent=rents.at(-1)||genesis;
  return{resolution_status:'resolved',resolution_method:method,corpid:clean(input.corpid),from_bed:bed(input.from_bed),active_transfer_lineage_id:options.lineage_id||null,previous_transfer_anchor_id:options.previous_anchor_id||null,genesis_anchor_ref:ref(genesis),source_context_anchor_refs:contextRefs(entries),carried_arrears_refs:arrearsRefs(input.open_arrears||[]),rent_coverage_ref:clean(rent?.rent_coverage_ref)||ref(rent),deposit_context_ref:snapshot.deposit_context_ref,expiry_context_ref:snapshot.expiry_context_ref,snapshot_fingerprint:snapshot.snapshot_fingerprint,candidate_group_count:1,ambiguity_reasons:[]};
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
  const all=(input.archive_entries||[]).filter(active).sort((a,b)=>time(a).localeCompare(time(b))||ref(a).localeCompare(ref(b)));
  const transfers=(input.transfer_anchors||all.filter(e=>eventType(e)==='bed_transfer')).filter(active);
  const voided=new Set((input.void_anchors||[]).filter(active).map(v=>clean(v.target_transfer_anchor_id||v.voided_transfer_anchor_id)).filter(Boolean));
  const lineage=resolveLineage(input,transfers,voided);if(lineage)return lineage;
  const entries=all.filter(e=>relevant(e,fromBed)&&eventType(e)!=='bed_transfer');
  const closes=entries.filter(e=>['checkout','left_with_arrears'].includes(eventType(e)));
  if(closes.length){
    const latest=closes.at(-1),segment=entries.filter(e=>time(e)>time(latest));
    const starts=segment.filter(e=>['rent','deposit_in'].includes(eventType(e)));
    if(!starts.length)return failure('ambiguous','BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS',0,['no_post_checkout_genesis']);
    const explicit=stable(starts.filter(e=>e.stay_action==='start'||e.genesis_candidate===true).map(e=>clean(e.genesis_group_id||e.session_id||ref(e))));
    if(explicit.length>1)return failure('ambiguous','BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS',explicit.length,['multiple_unmergeable_post_checkout_genesis_groups']);
    const genesis=starts[0];return finish('post_latest_checkout_segment',input,segment,genesis);
  }
  const mmdd=clean(input.access_snapshot?.checkin_mmdd||input.access_snapshot?.parsed_checkin_mmdd);
  const starts=entries.filter(e=>['rent','deposit_in'].includes(eventType(e))&&clean(e.checkin_mmdd||e.parsed_checkin_mmdd)===mmdd);
  const groups=new Map();for(const e of starts){const k=clean(e.genesis_group_id||e.session_id||ref(e));if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}
  if(!mmdd||groups.size!==1)return failure('ambiguous','BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS',groups.size,[groups.size?'multiple_legacy_mmdd_matches':'no_legacy_mmdd_match']);
  const group=[...groups.values()][0],genesis=group[0],startTime=time(genesis);
  if(entries.some(e=>time(e)<startTime&&!group.includes(e)))return failure('ambiguous','BED_TRANSFER_SOURCE_CONTEXT_AMBIGUOUS',1,['unassigned_legacy_history']);
  return finish('unique_legacy_mmdd_canonical_match',input,entries.filter(e=>time(e)>=startTime),genesis);
}

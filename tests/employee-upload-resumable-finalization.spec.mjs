import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import {classifyExistingCanonicalTransfer,prepareCanonicalTransferArchiveWrite} from '../modules/employees/bed-transfer-canonical-archive-write.mjs';
import {findEffectiveBedTransferAnchor} from '../modules/owner-todo/bed-transfer-owner-todo.mjs';

const worker=await readFile('deploy-worker/src/index.js','utf8');
const employee=await readFile('deploy-worker/public/employee-v3.html','utf8');

function block(source,name,last=false){
  const pattern=new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`,'g');
  const starts=Array.from(source.matchAll(pattern),match=>match.index);
  const start=last?(starts.at(-1)??-1):(starts[0]??-1);
  assert.notEqual(start,-1,`${name} must exist`);
  const marker=`__name(${name},`;
  const namedEnd=source.indexOf(marker,start);
  if(namedEnd>start)return source.slice(start,namedEnd);
  let depth=0,body=false;
  for(let index=start;index<source.length;index+=1){
    if(source[index]==='{'){depth+=1;body=true;}
    if(source[index]==='}'&&body&&--depth===0)return source.slice(start,index+1);
  }
  assert.fail(`${name} must close`);
}

const preview={event_type:'bed_transfer',type:'TF',from_bed:'112',to_bed:'111',transfer_reason:'room_issue',corpid:'corp',source_context_mode:'server_verified_legacy_genesis',lineage_genesis:true,owner_confirmation_scope:'INTERNAL_BETA',source_context_anchor_refs:[],carried_arrears_refs:[],rent_coverage_ref:'rent-ref',deposit_context_ref:'deposit-ref',expiry_context_ref:'expiry-ref',snapshot_fingerprint:'snapshot',ttlock_sequence:'employee_first_pre_move',source_snapshot_fingerprint:'source-snapshot',target_snapshot_fingerprint:'target-snapshot',physical_state_before_submission:{source:'not_marked_vacant',target:'vacant'},continuity_checks:{corpid:'matched'},fee_mode:'paid',fee_amount_aed:50,payment_method:'cash'};

function persistenceHarness(globalFinder=async()=>({status:'missing',matches:[]}),options={}){
  const {summaryJson=true,entriesJson=true,existingSession=true}=options;
  const sessionId='S20260713-jkqj7';
  const entries=Array.from({length:6},(_,index)=>({event_type:'rent',type:'R',id:`persisted-${index+1}`,event_id:`persisted-${index+1}`}));
  let row=existingSession?{id:sessionId,anchor_id:'EMPV3-anchor',entries_count:6,entries_json:JSON.stringify({anchor_contract_version:'employee_entry_anchor_v1',entries}),handover_status:'EXPORTING',voided_at:null}:null;
  let updates=0,inserts=0,ids=0;
  const sqls=[];
  const columns=new Set(["id","corpid","anchor_id","date","entries_count","created_by","created_at","operator_id","operator_name","cash_handover","bank_transfer_total","bank_transfer_count","gross_received","handover_status","exported_at","export_text","source","voided_at",...(entriesJson?["entries_json"]:[]),...(summaryJson?["summary_json"]:[])]);
  const context={Set,prepareCanonicalTransferArchiveWrite,classifyExistingCanonicalTransfer,findEffectiveCanonicalTransferByFingerprint:globalFinder,empTableColumns:async()=>columns,canonicalSessionSummaryWithClientDiagnostic:(_session,nextEntries)=>({cash_handover:50,bank_transfer_total:0,bank_transfer_count:0,gross_received:50,entry_count:nextEntries.length,server_authoritative:true}),canonicalSessionSummaryPersistenceFields:summary=>({cash_handover:summary.cash_handover,bank_transfer_total:summary.bank_transfer_total,bank_transfer_count:summary.bank_transfer_count,gross_received:summary.gross_received,summary_json:JSON.stringify(summary)}),cleanId:value=>String(value||''),cleanText:value=>String(value||''),empNow:()=> '2026-07-15T12:00:00+04:00',cleanDate:value=>String(value||'').slice(0,10),bedTransferWriteApproved:env=>env.BED_TRANSFER_WRITE_APPROVED==='true',crypto:{randomUUID:()=>`00000000-0000-4000-8000-${String(++ids).padStart(12,'0')}`},json:(body,status)=>({body,status}),success:body=>body};
  vm.createContext(context);
  vm.runInContext(`${block(worker,'persistEmployeeBedTransferCanonicalArchive')};this.persist=persistEmployeeBedTransferCanonicalArchive`,context);
  const env={APP_ENV:'internal_beta',BED_TRANSFER_WRITE_APPROVED:'true',DB:{prepare:sql=>({bind:(...args)=>({
    first:async()=>row,
    run:async()=>{
      sqls.push(sql);
      if(/^UPDATE sessions SET entries_json=/.test(sql)){
        let index=0;
        row.entries_json=args[index++];row.entries_count=args[index++];row.cash_handover=args[index++];row.bank_transfer_total=args[index++];row.bank_transfer_count=args[index++];row.gross_received=args[index++];
        if(sql.includes('summary_json=?'))row.summary_json=args[index++];
        row.handover_status='COMPLETED';row.exported_at=args[index++];updates+=1;return{meta:{changes:1}};
      }
      if(/^INSERT INTO sessions/.test(sql)){
        const names=sql.match(/INSERT INTO sessions \(([^)]+)\)/)?.[1].split(',')||[];
        row=Object.fromEntries(names.map((name,index)=>[name,args[index]]));
        row.voided_at=null;inserts+=1;return{meta:{changes:1}};
      }
      throw new Error(`unexpected write: ${sql}`);
    }
  })})}};
  return{context,env,get row(){return row},get updates(){return updates},get inserts(){return inserts},sqls};
}

test('authentication transport and local render failures retain the authenticated workspace',()=>{
  const auth=block(employee,'checkEmployeeSession');
  const action=block(employee,'employeeUploadSuggestedActionParts');
  assert.match(action,/const errorCode=String\(r\.error_code\|\|''\)/);
  assert.doesNotMatch(action,/\(r\.error_code\|\|''\)\.includes/);
  assert.match(auth,/employee session check temporarily unavailable/);
  assert.match(auth,/employeeFetchCurrentAuthUserWithRetry/);
  assert.match(auth,/EMPLOYEE_AUTH_STATES\.TRANSIENT_ERROR/);
  assert.match(auth,/employee local workspace render failed; authentication retained/);
  assert.match(auth,/if\(!me\)\{[\s\S]*redirectToUnifiedLogin\('employee_session_required'\)/);
  const fetchCatch=auth.slice(auth.indexOf('me=await employeeFetchCurrentAuthUserWithRetry'),auth.indexOf('if(!me)'));
  assert.doesNotMatch(fetchCatch,/redirectToUnifiedLogin/);
});

test('aggregate recovery preserves all local entries and writes only non-persisted identities',()=>{
  const upload=block(employee,'commitSessionAndExport',true);
  assert.match(upload,/const originalDrafts=allOriginalDrafts/);
  assert.doesNotMatch(upload,/state\.drafts=uploadList/);
  assert.match(upload,/rawResult\.idempotent===true\?'ALREADY_PERSISTED':'VALIDATED'/);
  assert.match(upload,/writeQueue\.filter\(entry=>entry\.upload_resume_state!=='ALREADY_PERSISTED'\)/);
  assert.match(upload,/if\(e\.upload_resume_state==='ALREADY_PERSISTED'\)/);
  assert.match(upload,/uploadList\.filter\(entry=>String\(entry\?\.type\|\|''\)\.toUpperCase\(\)!=='TF'\)/);
  assert.match(upload,/bedTransferUploadPayloads\.get\(employeeEntryStableIdentity\(e\)\)/);
  assert.match(upload,/allOriginalDrafts\.map\(original=>completedByIdentity\.get/);
});

test('same-session archive matches are idempotent while a missing transfer remains pending',()=>{
  const duplicate=block(worker,'checkEmployeeEntryDuplicates');
  const anchors=block(worker,'employeeEntryExistingSessionAnchors');
  assert.match(anchors,/request_context[\s\S]*cloudArrearsFetchActiveSessionRows/);
  assert.match(anchors,/same_session/);
  assert.match(duplicate,/allSameSessionArchiveExisting/);
  assert.match(duplicate,/incoming\.event_id&&stored\.event_id===incoming\.event_id/);
  assert.match(duplicate,/canonical_fingerprint_persistence:'COMPLETE'/);
  assert.match(duplicate,/if\(existing\.same_session\)continue/);
});

test('canonical Bed Transfer validation and write both enforce the effective global business fingerprint',()=>{
  const validate=block(worker,'validateEmployeeEntryUploadPayload');
  const persist=block(worker,'persistEmployeeBedTransferCanonicalArchive');
  const lookup=block(worker,'findEffectiveCanonicalTransferByFingerprint');
  assert.match(validate,/prepareCanonicalTransferArchiveWrite[\s\S]*findEffectiveCanonicalTransferByFingerprint/);
  assert.match(validate,/canonical_fingerprint_persistence:"COMPLETE_GLOBAL"/);
  assert.match(validate,/BED_TRANSFER_CANONICAL_FINGERPRINT_CONFLICT/);
  assert.ok(persist.indexOf('findEffectiveCanonicalTransferByFingerprint')<persist.indexOf("const readExisting="));
  assert.match(persist,/already_accepted:true,no_write:true,canonical_fingerprint_persistence:'COMPLETE_GLOBAL'/);
  assert.match(lookup,/canonical_request_fingerprint/);
  assert.match(lookup,/findEffectiveBedTransferAnchor/);
  assert.doesNotMatch(lookup,/entry_identity/);
});

test('a cross-session effective fingerprint without entry_identity returns existing idempotent success',async()=>{
  const oldEntry={...prepareCanonicalTransferArchiveWrite({validated_anchor:preview,session_id:'old-session',accepted_at:'2026-07-15T12:00:00+04:00',operator_reference:'employee'},{idFactory:name=>name==='transfer_anchor_id'?'old-anchor':'old-lineage'}).entry};
  delete oldEntry.id;delete oldEntry.event_id;delete oldEntry.entry_identity;
  const h=persistenceHarness(async(_env,_user,fingerprint)=>({status:'accepted',matches:[{entry:oldEntry}],entry:oldEntry,existing_anchor:'old-anchor',existing_session_id:'old-session',fingerprint}));
  const result=await h.context.persist(h.env,{corpid:'corp',userid:'employee',employee_name:'Employee'},{entry_identity:'new-entry',entry:{id:'new-entry'},session:{id:'new-session'}},{bed_transfer_phase1_preview:preview});
  assert.equal(result.ok,true);
  assert.equal(result.idempotent,true);
  assert.equal(result.already_accepted,true);
  assert.equal(result.no_write,true);
  assert.equal(result.existing_session_id,'old-session');
  assert.equal(result.existing_anchor,'old-anchor');
  assert.equal(result.canonical_entry.entry_identity,undefined);
  assert.equal(h.updates,0);
});

test('multiple effective anchors with one canonical fingerprint fail closed before mutation',async()=>{
  const h=persistenceHarness(async()=>({status:'conflict',matches:[{existing_anchor:'a'},{existing_anchor:'b'}]}));
  const result=await h.context.persist(h.env,{corpid:'corp',userid:'employee'},{entry_identity:'new-entry',entry:{id:'new-entry'},session:{id:'new-session'}},{bed_transfer_phase1_preview:preview});
  assert.equal(result.status,409);
  assert.equal(result.body.error_code,'BED_TRANSFER_CANONICAL_FINGERPRINT_CONFLICT');
  assert.equal(result.body.write_attempted,false);
  assert.equal(h.updates,0);
});

test('global fingerprint lookup ignores the precisely voided duplicate and keeps the older anchor effective',async()=>{
  const oldAnchor={event_type:'bed_transfer',transfer_anchor_id:'old-anchor',canonical_request_fingerprint:'bt-same',corpid:'corp'};
  const newAnchor={event_type:'bed_transfer',transfer_anchor_id:'new-anchor',canonical_request_fingerprint:'bt-same',corpid:'corp',entry_identity:'new-entry'};
  const voidAnchor={event_type:'void_transfer',void_anchor_id:'void-new',target_transfer_anchor_id:'new-anchor',corpid:'corp'};
  const items=[{session:{id:'old-session'},anchor:oldAnchor},{session:{id:'new-session'},anchor:newAnchor},{session:{id:'void-session'},anchor:voidAnchor}];
  const context={cleanText:(value,max=1000)=>String(value??'').trim().slice(0,max),employeeEntryExistingSessionAnchors:async()=>items,findEffectiveBedTransferAnchor};
  vm.createContext(context);
  vm.runInContext(`${block(worker,'findEffectiveCanonicalTransferByFingerprint')};this.lookup=findEffectiveCanonicalTransferByFingerprint`,context);
  const cleaned=await context.lookup({}, {corpid:'corp'}, 'bt-same');
  assert.equal(cleaned.status,'accepted');
  assert.equal(cleaned.matches.length,1);
  assert.equal(cleaned.existing_anchor,'old-anchor');
  assert.equal(cleaned.existing_session_id,'old-session');
  items.pop();
  const conflicted=await context.lookup({}, {corpid:'corp'}, 'bt-same');
  assert.equal(conflicted.status,'conflict');
  assert.equal(conflicted.matches.length,2);
});

test('resumable finalization appends exactly one transfer and retry is idempotent',async()=>{
  const h=persistenceHarness();
  const body={entry_identity:'E20260715-645lm',entry:{id:'E20260715-645lm'},session:{id:'S20260713-jkqj7'}};
  const first=await h.context.persist(h.env,{corpid:'corp',userid:'employee',employee_name:'Employee'},body,{bed_transfer_phase1_preview:preview});
  assert.equal(first.ok,true);
  assert.equal(first.resumable_finalization,true);
  assert.equal(first.session_finalized,true);
  assert.equal(h.updates,1);
  assert.equal(h.row.entries_count,7);
  assert.equal(h.row.handover_status,'COMPLETED');
  const persisted=JSON.parse(h.row.entries_json).entries;
  assert.equal(persisted.filter(entry=>entry.event_type==='bed_transfer').length,1);
  assert.equal(persisted.at(-1).entry_identity,'E20260715-645lm');
  assert.equal(persisted.at(-1).fee_amount_aed,50);
  const retry=await h.context.persist(h.env,{corpid:'corp',userid:'employee',employee_name:'Employee'},body,{bed_transfer_phase1_preview:preview});
  assert.equal(retry.idempotent,true);
  assert.equal(h.updates,1);
  assert.equal(JSON.parse(h.row.entries_json).entries.length,7);
});

test('resumable finalization omits optional summary_json on the legacy sessions schema',async()=>{
  const h=persistenceHarness(undefined,{summaryJson:false});
  const body={entry_identity:'E20260715-645lm',entry:{id:'E20260715-645lm'},session:{id:'S20260713-jkqj7'}};
  const result=await h.context.persist(h.env,{corpid:'corp',userid:'employee',employee_name:'Employee'},body,{bed_transfer_phase1_preview:preview});
  assert.equal(result.ok,true);
  assert.equal(h.updates,1);
  assert.equal(h.row.entries_count,7);
  assert.equal(h.row.handover_status,'COMPLETED');
  assert.equal(h.row.summary_json,undefined);
  assert.equal(h.sqls.some(sql=>sql.includes('summary_json=?')),false);
});

test('resumable finalization persists optional summary_json when the column exists',async()=>{
  const h=persistenceHarness();
  const result=await h.context.persist(h.env,{corpid:'corp',userid:'employee',employee_name:'Employee'},{entry_identity:'E20260715-645lm',entry:{id:'E20260715-645lm'},session:{id:'S20260713-jkqj7'}},{bed_transfer_phase1_preview:preview});
  assert.equal(result.ok,true);
  assert.equal(typeof h.row.summary_json,'string');
  assert.equal(h.sqls.some(sql=>sql.includes('summary_json=?')),true);
});

test('canonical archive fails closed before writes when entries_json is unavailable',async()=>{
  const h=persistenceHarness(undefined,{entriesJson:false,summaryJson:false});
  const result=await h.context.persist(h.env,{corpid:'corp',userid:'employee',employee_name:'Employee'},{entry_identity:'E20260715-645lm',entry:{id:'E20260715-645lm'},session:{id:'S20260713-jkqj7'}},{bed_transfer_phase1_preview:preview});
  assert.equal(result.status,503);
  assert.equal(result.body.error_code,'CANONICAL_ARCHIVE_SCHEMA_UNAVAILABLE');
  assert.equal(result.body.write_attempted,false);
  assert.equal(h.updates,0);
  assert.equal(h.inserts,0);
});

test('new canonical session persists entries_json without optional summary_json',async()=>{
  const h=persistenceHarness(undefined,{summaryJson:false,existingSession:false});
  const result=await h.context.persist(h.env,{corpid:'corp',userid:'employee',employee_name:'Employee'},{entry_identity:'E20260715-645lm',entry:{id:'E20260715-645lm'},session:{id:'S20260713-jkqj7',date:'2026-07-15'}},{bed_transfer_phase1_preview:preview});
  assert.equal(result.ok,true);
  assert.equal(result.canonical_persistence_verified,true);
  assert.equal(h.inserts,1);
  assert.equal(h.updates,0);
  assert.equal(h.row.entries_count,1);
  assert.equal(JSON.parse(h.row.entries_json).entries.length,1);
  assert.equal(h.row.summary_json,undefined);
  assert.equal(h.sqls.some(sql=>sql.includes('summary_json')),false);
});

test('resumable finalization remains closed outside internal beta',async()=>{
  const h=persistenceHarness();
  h.env.APP_ENV='production';
  const result=await h.context.persist(h.env,{corpid:'corp',userid:'employee',employee_name:'Employee'},{entry_identity:'E20260715-645lm',session:{id:'S20260713-jkqj7'}},{bed_transfer_phase1_preview:preview});
  assert.equal(result.status,409);
  assert.equal(h.updates,0);
  assert.equal(h.row.entries_count,6);
});

test('entry identity is persisted without changing the canonical business fingerprint',()=>{
  const base={validated_anchor:preview,session_id:'S20260713-jkqj7',accepted_at:'2026-07-15T12:00:00+04:00',operator_reference:'employee'};
  const withIdentity=prepareCanonicalTransferArchiveWrite({...base,entry_identity:'E20260715-645lm'},{idFactory:name=>name});
  const withoutIdentity=prepareCanonicalTransferArchiveWrite(base,{idFactory:name=>name});
  assert.equal(withIdentity.request_fingerprint,withoutIdentity.request_fingerprint);
  assert.equal(withIdentity.entry.id,'E20260715-645lm');
  assert.equal(withIdentity.entry.event_id,'E20260715-645lm');
  assert.equal(withIdentity.entry.entry_identity,'E20260715-645lm');
});

test('cloud reconciliation can match canonical entries or already persisted transaction identities',()=>{
  const sync=block(worker,'handleEmployeeEntrySyncState');
  assert.match(sync,/SELECT id FROM transactions WHERE corpid=\? AND id IN/);
  assert.match(sync,/matched_by:'transaction_entry_id'/);
  assert.match(sync,/matched_by:"canonical_fingerprint_or_event_id"/);
});

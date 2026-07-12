import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../deploy-worker/public/employee-v3.html',import.meta.url),'utf8');
const worker=await readFile(new URL('../deploy-worker/src/index.js',import.meta.url),'utf8');
const block=(source,name)=>{const start=source.indexOf(`function ${name}`);assert.ok(start>=0,name);const next=source.slice(start+10).match(/\n(?:async\s+)?function\s+/);return source.slice(start,next?start+10+next.index:source.length)};

test('Bed Transfer bypasses generic save and generic bed validation',()=>{
  const save=block(html,'saveEntry');
  assert.match(save,/entryType'\)\.value==='TF'\)\{showStatus\('Use Validate Transfer/);
  assert.ok(save.indexOf("value==='TF'")<save.indexOf('const v=validate()'));
  assert.doesNotMatch(block(html,'validateBedTransferEntry'),/(?:^|['"`])Bed is required|room.*required/i);
});

test('validated clean identity is reused for one canonical record request',()=>{
  const validate=block(html,'saveCanonicalBedTransferDraft'),record=block(html,'recordCanonicalBedTransfer');
  assert.match(validate,/validatedRecord=employeeBedTransferRecordPayload\(requestPayload\)/);
  assert.match(record,/apiFetch\('\/api\/employee\/entry'/);
  assert.equal((record.match(/apiFetch\(/g)||[]).length,1);
  for(const path of ['/api/employee/bed-transfers','/api/save_session'])assert.equal(record.includes(path),false);
  assert.doesNotMatch(record,/submitBedTransferEvent|saveEntry\(/);
});

test('write false, unvalidated, busy, and accepted states make zero duplicate writes',()=>{
  const gate=block(html,'applyEmployeeBedTransferUiGate'),record=block(html,'recordCanonicalBedTransfer');
  assert.match(gate,/gate\.final_upload_enabled/);assert.match(gate,/validatedRecord/);assert.match(gate,/!state\.bedTransferContext\?\.recordedResult/);
  assert.match(record,/dataset\.busy==='1'\|\|state\.bedTransferContext\?\.recordedResult/);
  assert.match(record,/await employeeLoadBedTransferCapabilities\(\)/);
  assert.match(record,/if\(!employeeBedTransferWriteEnabled\(\)\)/);
});

test('record failure retains draft and success exposes only canonical IDs',()=>{
  const record=block(html,'recordCanonicalBedTransfer');
  assert.match(record,/draft retained/);assert.doesNotMatch(record,/sync_status='SYNCED'|upload_status='SYNCED'/);
  for(const field of ['session_id','transfer_anchor_id','transfer_lineage_id'])assert.match(record,new RegExp(field));
  for(const field of ['tenant_card_id','card_id','provider_phone','phone_99099','provider_metadata','old_ttlock_ref'])assert.doesNotMatch(record,new RegExp(field));
});

test('beta serializer uses a legal transfer reason marker and no extra beta field',()=>{
  const serializer=block(html,'employeeBedTransferValidatePayload');
  const context={Object,String,state:{bedTransferCapabilities:{controlled_beta_preview:true}}};vm.createContext(context);vm.runInContext(`${serializer};globalThis.serialize=employeeBedTransferValidatePayload`,context);
  const payload=context.serialize({event_type:'bed_transfer',type:'TF',source:'employee_entry',from_bed:'146',to_bed:'111',transfer_reason:'customer_request',fee_mode:'paid',fee_amount_aed:50,payment_method:'cash'},{id:'beta-session'});
  assert.match(payload.entry.transfer_reason,/^CONTROLLED_BETA_TEST\|/);
  assert.equal('beta_test' in payload.entry,false);
  assert.deepEqual(Object.keys(payload.entry).filter(key=>/context|fingerprint|provider|card|transfer_at|transfer_date|corpid/i.test(key)),[]);
});

test('beta capability is version-scoped and keeps production no-go',()=>{
  assert.match(block(worker,'bedTransferDeploymentCapabilities'),/controlled_beta_preview:String\(env\.APP_ENV/);
  assert.match(block(worker,'ownerTodayTodoAcknowledgmentWriteEnabled'),/"beta_preview"/);
  assert.match(block(worker,'bedTransferDeploymentCapabilities'),/production_cutover:"PRODUCTION_NO_GO"/);
});

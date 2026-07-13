import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../deploy-worker/public/employee-v3.html',import.meta.url),'utf8');
const worker=await readFile(new URL('../deploy-worker/src/index.js',import.meta.url),'utf8');
const block=(source,name)=>{const start=source.indexOf(`function ${name}`);assert.ok(start>=0,name);const next=source.slice(start+10).match(/\n(?:async\s+)?function\s+/);return source.slice(start,next?start+10+next.index:source.length)};

test('Bed Transfer bypasses generic single-bed validation and saves through its local session path',()=>{
  const save=block(html,'saveEntry');
  assert.match(save,/value==='TF'\)return saveCanonicalBedTransferDraft\(\)/);
  assert.ok(save.indexOf("value==='TF'")<save.indexOf('const v=validate()'));
  assert.doesNotMatch(block(html,'validateBedTransferEntry'),/(?:^|['"`])Bed is required|room.*required/i);
});

test('canonical serializer is used automatically by unified Upload Session',()=>{
  const upload=html.slice(html.lastIndexOf('async function commitSessionAndExport'));
  assert.match(upload,/employeeBedTransferValidatePayload\(e,sessionForEntry\)/);
  assert.match(upload,/employeeBedTransferRecordPayload\(requestPayload\)/);
  assert.equal((upload.match(/apiFetch\('\/api\/employee\/entry'/g)||[]).length,1);
  for(const path of ['/api/employee/bed-transfers','/api/save_session'])assert.equal(upload.includes(path),false);
});

test('Save Transfer carries stable local identity but no canonical transfer anchor',()=>{
  const builder=block(html,'buildBedTransferAnchor');
  assert.match(builder,/const id=uid\('E'\)/);
  assert.doesNotMatch(builder,/transfer_anchor_id|transfer_lineage_id|previous_transfer_anchor_id/);
  assert.match(builder,/return applyEntryAnchors\(payload\)/);
  const save=block(html,'saveCanonicalBedTransferDraft');
  assert.match(save,/entry\.session_id=currentSessionId\(\)/);
  assert.match(save,/state\.drafts\.unshift\(entry\)/);
});

test('paid, waived and unpaid Current Session models never fall back to generic zero values',()=>{
  const source=block(html,'employeeBedTransferSessionCardModel');
  const context={Number,String,fmtMoney:n=>Number(n||0).toFixed(2)};
  vm.createContext(context);vm.runInContext(`${source};globalThis.card=employeeBedTransferSessionCardModel`,context);
  const paid=context.card({from_bed:'144',to_bed:'111',fee_amount_aed:50,fee_mode:'paid',payment_method:'cash'});
  assert.equal(paid.beds,'144 → 111');
  assert.match(paid.detail,/Due AED 50\.00/);assert.match(paid.detail,/Paid AED 50\.00/);assert.match(paid.detail,/Cash/);
  assert.match(context.card({fee_amount_aed:0,fee_mode:'waived'}).detail,/Due AED 0\.00/);
  assert.match(context.card({fee_amount_aed:50,fee_mode:'unpaid'}).detail,/Paid AED 0\.00/);
});

test('beta serializer uses legal business fields and no provider or server-managed fields',()=>{
  const serializer=block(html,'employeeBedTransferValidatePayload');
  const context={Object,String,state:{bedTransferCapabilities:{controlled_beta_preview:true}}};vm.createContext(context);vm.runInContext(`${serializer};globalThis.serialize=employeeBedTransferValidatePayload`,context);
  const payload=context.serialize({event_type:'bed_transfer',type:'TF',source:'employee_entry',from_bed:'146',to_bed:'111',transfer_reason:'customer_request',fee_mode:'paid',fee_amount_aed:50,payment_method:'cash'},{id:'beta-session'});
  assert.match(payload.entry.transfer_reason,/^CONTROLLED_BETA_TEST\|/);
  assert.equal('beta_test' in payload.entry,false);
  assert.deepEqual(Object.keys(payload.entry).filter(key=>/context|fingerprint|provider|card|transfer_at|transfer_date|corpid/i.test(key)),[]);
});

test('internal beta capability remains version-scoped and production cutover remains no-go',()=>{
  assert.match(block(worker,'bedTransferDeploymentCapabilities'),/internal_beta:String\(env\.APP_ENV/);
  assert.match(block(worker,'ownerTodayTodoAcknowledgmentWriteEnabled'),/"internal_beta"/);
  assert.match(block(worker,'bedTransferDeploymentCapabilities'),/production_cutover:"PRODUCTION_NO_GO"/);
});

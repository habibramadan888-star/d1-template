import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../deploy-worker/public/employee-v3.html',import.meta.url),'utf8');
const worker=await readFile(new URL('../deploy-worker/src/index.js',import.meta.url),'utf8');
const block=(source,name)=>{const start=source.indexOf(`function ${name}`);assert.ok(start>=0,name);const next=source.slice(start+10).match(/\n(?:async\s+)?function\s+/);return source.slice(start,next?start+10+next.index:source.length)};

test('Bed Context final response is a provider-free safe DTO',()=>{
  const dto=block(worker,'employeeBedTransferSafeContextDto');
  assert.match(block(worker,'handleEmployeeBedContext'),/employeeBedTransferSafeContextDto\(await canonicalBedContextGateway/);
  for(const field of ['card_name','card_id','tenant_card_id','provider_phone','phone_99099','provider_metadata','old_ttlock_ref','snapshot_fingerprint','creator','created_at'])assert.doesNotMatch(dto,new RegExp(`\\b${field}\\b`));
  for(const field of ['physical_bed_status','parsed_deposit_amount','parsed_checkin_mmdd','normalized_expiry_value','current_rent_coverage_end','open_arrears'])assert.match(dto,new RegExp(field));
});

test('Bed Transfer DOM never renders the raw Access Card strip',()=>{
  const strips=block(html,'renderEmployeeBedInfoStrips');
  assert.match(strips,/const transfer=\$\('entryType'\)\?\.value==='TF'/);
  assert.match(strips,/transfer\?'':\$\('transferFromBed'\)/);
  assert.doesNotMatch(block(html,'employeeRenderBedTransferContext'),/cardName|card_name|remark|phone|99099|provider/);
});

test('dedicated Validate and disabled Record buttons have the exact contract',()=>{
  assert.match(html,/id="btnValidateBedTransfer"[^>]*>Validate Transfer \/ 验证换床/);
  assert.match(html,/id="btnRecordBedTransfer"[^>]*disabled[^>]*aria-disabled="true"/);
  const gate=block(html,'applyEmployeeBedTransferUiGate');
  assert.match(gate,/validateButton\.disabled=!gate\.validate_enabled/);
  assert.match(gate,/recordButton\.disabled=!recordEnabled/);
});

test('validate serializer is an exact business-input allowlist with no dates context or provider fields',()=>{
  const serializer=block(html,'employeeBedTransferValidatePayload');
  const context={Object,String,state:{bedTransferCapabilities:{controlled_beta_preview:false}}};vm.createContext(context);vm.runInContext(`${serializer};globalThis.serialize=employeeBedTransferValidatePayload`,context);
  const payload=context.serialize({event_type:'bed_transfer',type:'TF',source:'employee_entry',from_bed:'146',to_bed:'111',transfer_reason:'move',fee_mode:'paid',fee_amount_aed:50,payment_method:'cash',transfer_date:'x',transfer_at:'x',canonical_accepted_at:'x',source_context:{raw:true},snapshot_fingerprint:'x',corpid:'x',card_id:'x'},{id:'safe-session',date:'x',entries_json:'x'});
  assert.equal(payload.dry_run,true);assert.equal(payload.validate_only,true);assert.equal(payload.no_write,true);
  for(const field of ['transfer_date','transfer_at','canonical_accepted_at','source_context','snapshot_fingerprint','corpid','card_id','entries_json','date'])assert.equal(JSON.stringify(payload).includes(`"${field}"`),false,field);
  assert.equal(payload.entry.fee_amount_aed,50);assert.equal(payload.entry.from_bed,'146');assert.equal(payload.entry.to_bed,'111');
});

test('Validate click uses only canonical validate endpoint and never a write route',()=>{
  const save=block(html,'saveCanonicalBedTransferDraft'),request=block(html,'validateEmployeeUploadDryRun');
  assert.match(save,/employeeBedTransferValidatePayload/);assert.match(save,/validateEmployeeUploadDryRun/);assert.match(request,/\/api\/employee\/entry\/validate/);
  for(const route of ['/api/employee/bed-transfers','/api/save_session'])assert.equal((save+request).includes(route),false);
  assert.doesNotMatch(save+request,/submitBedTransferEvent/);
});

test('validation result displays sequence warnings no-write and never upload success',()=>{
  const render=block(html,'employeeRenderBedTransferServerValidation');
  for(const value of ['Validation passed','sequence','no_write=true','warnings','draft retained'])assert.match(render,new RegExp(value));
  assert.doesNotMatch(render,/Uploaded|Synced|Done/);
});

test('Bed Transfer has no editable transfer timestamp or date picker',()=>{
  const markup=html.slice(html.indexOf('<div class="grid" id="transferFields">'),html.indexOf('<div class="grid" id="expenseFields">'));
  assert.doesNotMatch(markup,/Transfer Date|transferDate|transfer_date|type="datetime-local"|type="time"/i);
  assert.match(markup,/服务器接受时间/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../deploy-worker/public/employee-v3.html',import.meta.url),'utf8');
const block=name=>{const start=html.indexOf(`function ${name}`);assert.ok(start>=0,name);const next=html.slice(start+10).match(/\n(?:async\s+)?function\s+/);return html.slice(start,next?start+10+next.index:html.length)};

test('capability matrix separates validate-only fields from final write',()=>{
  const source=block('employeeBedTransferUiGateState');
  const context={state:{bedTransferCapabilities:{}}};vm.createContext(context);
  vm.runInContext(`${source};globalThis.gate=employeeBedTransferUiGateState`,context);
  assert.deepEqual({...context.gate({status:'success',bed_transfer_validate_enabled:true,bed_transfer_write_enabled:false})},{fields_enabled:true,context_loading_enabled:true,validate_enabled:true,final_upload_enabled:false,error_code:''});
  assert.equal(context.gate({status:'success',bed_transfer_validate_enabled:false,bed_transfer_write_enabled:false}).validate_enabled,false);
  assert.equal(context.gate({status:'error',bed_transfer_validate_enabled:true,bed_transfer_write_enabled:true}).final_upload_enabled,false);
  assert.equal(context.gate({status:'success',bed_transfer_validate_enabled:true,bed_transfer_write_enabled:true}).final_upload_enabled,true);
});

test('TF controls and context loading use validate capability, not write capability',()=>{
  assert.match(block('applyEmployeeBedTransferUiGate'),/control\.disabled=!gate\.fields_enabled/);
  assert.match(block('employeeLoadBedTransferContexts'),/if\(!employeeBedTransferValidateEnabled\(\)\)throw/);
  const render=block('renderEntryTtlockStatus');
  assert.match(render,/isTransfer\?!employeeBedTransferValidateEnabled\(\):!ttlockCacheReady\(\)/);
});

test('capability failure is fail closed for validation and upload',()=>{
  const load=block('employeeLoadBedTransferCapabilities');
  assert.match(load,/status:'error',bed_transfer_validate_enabled:false,bed_transfer_write_enabled:false/);
  assert.match(block('validateBedTransferEntry'),/if\(!capabilityGate\.validate_enabled\)errors\.push/);
  assert.match(block('saveCanonicalBedTransferDraft'),/if\(!employeeBedTransferValidateEnabled\(\)\)/);
});

test('Save Transfer enters Current Session locally and Upload remains write-gated',()=>{
  const save=block('saveCanonicalBedTransferDraft');
  assert.match(save,/state\.drafts\.unshift\(entry\)/);
  assert.match(save,/saveDrafts\(\)/);
  assert.match(save,/buildExport\(\)|refreshSessionViews\(\)/);
  assert.doesNotMatch(save,/validateEmployeeUploadDryRun|apiFetch\(|submitBedTransferEvent|\/api\/employee\/entry['"`]/);
  assert.match(html,/transferWriteBlocked[\s\S]{0,500}!employeeBedTransferWriteEnabled\(\)[\s\S]{0,500}exportBtn\.disabled=true/);
});

test('Bed Transfer serializer excludes server-managed identity and timestamp fields',()=>{
  const anchor=block('buildBedTransferAnchor');
  for(const field of ['transfer_at','transfer_date','canonical_accepted_at','source_context','source_context_anchor_refs','transfer_anchor_id','transfer_lineage_id','previous_transfer_anchor_id','carried_arrears_refs','snapshot_fingerprint','corpid','tenant_card_id','card_id','old_ttlock_ref'])assert.doesNotMatch(anchor,new RegExp(`\\b${field}\\b`));
  assert.doesNotMatch(anchor,/type=['"](?:date|datetime-local|time)['"]/);
});

test('other six Employee templates keep their existing validators and builders',()=>{
  const registry=html.slice(html.indexOf('const entryTemplates={'),html.indexOf('const employeeEntryTemplates=entryTemplates'));
  for(const [key,validator,builder] of [['rent','validateRentEntry','buildRentAnchor'],['arrears_payment','validateArrearsPaymentEntry','buildArrearsPaymentAnchor'],['deposit_in','validateDepositInEntry','buildDepositInAnchor'],['deposit_out','validateDepositOutEntry','buildDepositOutAnchor'],['checkout','validateCheckoutEntry','buildCheckoutAnchor'],['expense','validateExpenseEntry','buildExpenseAnchor']]){
    const start=registry.indexOf(`${key}:{`);assert.ok(start>=0,key);
    const entry=registry.slice(start,registry.indexOf('\n  },',start)+5);
    assert.match(entry,new RegExp(`validator:${validator}`));
    assert.match(entry,new RegExp(`anchorBuilder:${builder}`));
  }
});

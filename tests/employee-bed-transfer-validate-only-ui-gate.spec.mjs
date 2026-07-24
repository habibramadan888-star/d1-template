import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../deploy-worker/public/employee-v3.html',import.meta.url),'utf8');
const block=name=>{const start=html.indexOf(`function ${name}`);assert.ok(start>=0,name);const next=html.slice(start+10).match(/\n(?:async\s+)?function\s+/);return html.slice(start,next?start+10+next.index:html.length)};

function control({id='',transferField=false,transferChip=false}={}){
  const attributes=new Map();
  return {
    id,
    disabled:false,
    hidden:false,
    value:'',
    textContent:'',
    title:'',
    dataset:{},
    transferField,
    transferChip,
    setAttribute(name,value){attributes.set(name,String(value));},
    removeAttribute(name){attributes.delete(name);},
    hasAttribute(name){return attributes.has(name);},
    getAttribute(name){return attributes.get(name)??null;},
    matches(selector){return transferChip&&selector==='.event-chip[data-type="TF"]';},
    closest(selector){return transferField&&selector==='#transferFields'?{id:'transferFields'}:null;},
  };
}

function domLifecycleHarness(){
  const transferFromBed=control({id:'transferFromBed',transferField:true});
  const bedTo=control({id:'bedTo',transferField:true});
  const transferReason=control({id:'transferReason',transferField:true});
  const transferControls=[transferFromBed,bedTo,transferReason];
  const tfChip=control({transferChip:true});
  const save=control({id:'btnSaveEntry'});
  const upload=control({id:'btnExport'});
  const entryType=control({id:'entryType'});
  entryType.value='TF';
  const notice=control({id:'bedTransferWriteDisabledNotice'});
  const elements={transferFromBed,bedTo,transferReason,btnSaveEntry:save,btnExport:upload,entryType,bedTransferWriteDisabledNotice:notice};
  let mounted=false;
  const state={
    authState:{status:'AUTH_REHYDRATING'},
    bedTransferCapabilities:{status:'loading',bed_transfer_validate_enabled:false,bed_transfer_write_enabled:false,production_cutover:'PRODUCTION_NO_GO'},
  };
  const context=vm.createContext({
    state,
    EMPLOYEE_AUTH_STATES:{REHYDRATING:'AUTH_REHYDRATING',AUTHENTICATED:'AUTHENTICATED',REQUIRED:'AUTH_REQUIRED',TRANSIENT_ERROR:'AUTH_TRANSIENT_ERROR'},
    document:{
      body:control(),
      createElement:()=>control(),
      querySelectorAll(selector){
        if(selector==='#transferFields input,#transferFields select,#transferFields textarea')return transferControls;
        if(selector==='#view-entry button,#view-entry input,#view-entry select,#view-entry textarea')return [tfChip,save,upload,...(mounted?transferControls:[])];
        return [];
      },
      querySelector(selector){return selector==='.event-chip[data-type="TF"]'?tfChip:null;},
    },
    $:id=>elements[id]||null,
    location:{search:''},
    Object,
    String,
  });
  vm.runInContext([
    block('employeeSetAuthInteractionLocked'),
    block('employeeBedTransferUiGateState'),
    block('employeeReadonlyPreflightRequested'),
    block('employeeRenderReadonlyPreflightDiagnostic'),
    block('applyEmployeeBedTransferUiGate'),
  ].join('\n'),context);
  const apply=()=>vm.runInContext('applyEmployeeBedTransferUiGate()',context);
  const lock=value=>vm.runInContext('employeeSetAuthInteractionLocked',context)(value);
  const setCapability=({status='success',validate=true,write=false}={})=>{
    state.bedTransferCapabilities={status,bed_transfer_validate_enabled:validate,bed_transfer_write_enabled:write,production_cutover:'PRODUCTION_NO_GO'};
  };
  const authenticate=()=>{state.authState={status:'AUTHENTICATED'};lock(false);apply();};
  return {
    state,transferFromBed,bedTo,transferReason,transferControls,tfChip,save,upload,
    mount(){mounted=true;apply();},
    lock,apply,setCapability,authenticate,
    finalUploadDisabled(){upload.disabled=!vm.runInContext('employeeBedTransferUiGateState().final_upload_enabled',context);return upload.disabled;},
  };
}

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

test('real DOM lifecycle: capabilities first then authenticated unlock leaves validate-only TF fields enabled',()=>{
  const h=domLifecycleHarness();
  h.mount();
  h.lock(true);
  h.setCapability({validate:true,write:false});
  h.apply();
  assert.equal(h.transferControls.every(node=>node.disabled),true);
  assert.equal(h.tfChip.disabled,true);
  h.authenticate();
  assert.equal(h.tfChip.disabled,false);
  assert.equal(h.transferFromBed.disabled,false);
  assert.equal(h.bedTo.disabled,false);
  assert.equal(h.finalUploadDisabled(),true);
});

test('real DOM lifecycle: authentication first then capability success converges on the same final state',()=>{
  const h=domLifecycleHarness();
  h.mount();
  h.lock(true);
  h.authenticate();
  assert.equal(h.transferControls.every(node=>node.disabled),true);
  h.setCapability({validate:true,write:false});
  h.apply();
  assert.equal(h.tfChip.disabled,false);
  assert.equal(h.transferFromBed.disabled,false);
  assert.equal(h.bedTo.disabled,false);
  assert.equal(h.finalUploadDisabled(),true);
});

test('capability error keeps TF chip fields save and formal upload fail closed',()=>{
  const h=domLifecycleHarness();
  h.mount();
  h.authenticate();
  h.setCapability({status:'error',validate:false,write:false});
  h.apply();
  assert.equal(h.tfChip.disabled,true);
  assert.equal(h.transferControls.every(node=>node.disabled),true);
  assert.equal(h.save.disabled,true);
  assert.equal(h.finalUploadDisabled(),true);
});

test('template mount reapplies the final capability gate to the real transfer nodes',()=>{
  const mount=block('employeeMountEntryTemplate');
  assert.match(mount,/mount\.dataset\.eventTemplate===key[\s\S]*?applyEmployeeBedTransferUiGate\(\)/);
  assert.match(mount,/renderEmployeeBedInfoStrips\(\);\s*applyEmployeeBedTransferUiGate\(\);\s*return template/);
  const h=domLifecycleHarness();
  h.setCapability({validate:true,write:false});
  h.authenticate();
  h.mount();
  assert.equal(h.transferFromBed.disabled,false);
  assert.equal(h.bedTo.disabled,false);
});

test('authenticated final capability authority removes stale auth snapshots from TF controls',()=>{
  const h=domLifecycleHarness();
  h.mount();
  h.lock(true);
  assert.equal(Object.hasOwn(h.transferFromBed.dataset,'authLockPrevious'),true);
  assert.equal(Object.hasOwn(h.bedTo.dataset,'authLockPrevious'),true);
  h.setCapability({validate:true,write:false});
  h.authenticate();
  assert.equal(Object.hasOwn(h.transferFromBed.dataset,'authLockPrevious'),false);
  assert.equal(Object.hasOwn(h.bedTo.dataset,'authLockPrevious'),false);
  assert.equal(h.transferFromBed.disabled,false);
  assert.equal(h.bedTo.disabled,false);
});

test('readonly asset identity diagnostic is opt-in and exposes only the approved state fields',()=>{
  assert.match(html,/const EMPLOYEE_UI_BUILD_ID='bt-readonly-preflight-006f-v1'/);
  const diagnostic=block('employeeRenderReadonlyPreflightDiagnostic');
  for(const field of ['ui_build_id','auth_state','capability_status','validate_enabled','write_enabled','tf_chip_disabled','source_disabled','target_disabled','source_auth_lock_previous','target_auth_lock_previous','production_cutover'])assert.match(diagnostic,new RegExp(field));
  for(const forbidden of ['cookie','token','tenant','provider','draft'])assert.doesNotMatch(diagnostic,new RegExp(forbidden,'i'));
  assert.match(block('employeeReadonlyPreflightRequested'),/readonly_preflight/);
});

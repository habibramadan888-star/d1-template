import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {buildBedTransferCanonicalLinkAnchor} from '../modules/employees/bed-transfer-canonical-link-anchor.mjs';

const worker=await readFile(new URL('../deploy-worker/src/index.js',import.meta.url),'utf8');
const owner=await readFile(new URL('../deploy-worker/public/index-51-main.js',import.meta.url),'utf8');
const functionBlock=(source,name)=>{const start=source.indexOf(`function ${name}`);assert.ok(start>=0,name);const namedEnd=source.indexOf(`__name(${name}`,start);if(namedEnd>start)return source.slice(start,source.indexOf('\n',namedEnd)+1);const tail=source.slice(start+10);const match=tail.match(/\n(?:async\s+)?function\s+/);const next=match?start+10+match.index:-1;return source.slice(start,next<0?source.length:next);};

test('employee /api/me uses the standard response wrapper and preserves formal staff role semantics',()=>{
  const start=worker.indexOf('if (path === "/api/me")');
  const end=worker.indexOf('const phase0ReadOnlyResponse',start);
  const block=worker.slice(start,end);
  assert.match(block,/role: user\.role/);
  assert.match(block,/return json\(ok\(data\),200,\{/);
  assert.match(block,/"x-homelink-worker-version":String\(env\.CF_VERSION_METADATA\?\.id\|\|""\)/);
  assert.match(block,/"x-homelink-asset-version":HOMELINK_DIAGNOSTIC_ASSET_VERSION/);
  assert.match(block,/"x-homelink-auth-response-class":"AUTHENTICATED"/);
  assert.match(worker,/function isStaffRoleValue\(role\)[\s\S]*\["staff", "employee"\]\.includes\(normalizeRoleValue\(role\)\)/);
});

test('authenticated preview classification separates HTTP authentication from employee role assertion',()=>{
  const classify=(status,body)=>{const data=body?.code===0&&body?.data?body.data:body;const role=String(data?.role||'').trim().toLowerCase();return{authenticated:status===200,employee_role:['staff','employee'].includes(role)};};
  assert.deepEqual(classify(200,{code:0,data:{role:'STAFF'}}),{authenticated:true,employee_role:true});
  assert.deepEqual(classify(200,{code:0,data:{role:'manager'}}),{authenticated:true,employee_role:false});
});

test('Arrears final response firewall recursively removes provider identity aliases and preserves business values',()=>{
  const start=worker.indexOf('const providerIdentityResponseForbiddenKeys');
  const end=worker.indexOf('function canonicalArrearsGatewayCleanItem',start);
  const source=worker.slice(start,end);
  const context={WeakMap,Set,String,Object,Array};
  context.__name=()=>{};
  vm.runInNewContext(`${source}\nglobalThis.firewall=providerIdentityResponseFirewall;`,context);
  const input={amount:50,status:'open',tenant_card_id:'secret',nested:{providerPhone:'secret',customerCode:'secret',due_date:'2026-08-01'},source_proof:{forbidden_sources_excluded:['tenant_card_id','provider_phone']}};
  const clean=context.firewall(input);
  assert.equal(clean.amount,50);
  assert.equal(clean.status,'open');
  assert.equal(clean.tenant_card_id,undefined);
  assert.equal(clean.nested.providerPhone,undefined);
  assert.equal(clean.nested.customerCode,undefined);
  assert.equal(clean.nested.due_date,'2026-08-01');
  assert.deepEqual([...clean.source_proof.forbidden_sources_excluded],['tenant_card_id','provider_phone']);
  assert.equal(input.tenant_card_id,'secret');
});

test('cloud Arrears response applies the firewall only at the final serializer boundary',()=>{
  const block=functionBlock(worker,'handleOwnerCloudArrearsProjection');
  assert.match(block,/return success\(providerIdentityResponseFirewall\(\{/);
  assert.match(block,/projection,/);
  assert.match(block,/open_items:projection\.open_items/);
  assert.match(block,/closed_items:projection\.closed_items/);
});

test('session detail business rows already pass the employee source firewall while proof may name forbidden sources',()=>{
  assert.match(functionBlock(worker,'normalizeEntryAnchor'),/applyEmployeeEntrySourceFirewall\(type,anchor\)/);
  assert.match(functionBlock(worker,'canonicalOwnerHistorySourceProof'),/forbidden_truth_sources/);
  assert.match(functionBlock(worker,'canonicalOwnerHistoryDetailGatewayFields'),/provider_identity_used:false/);
});

test('existing TTLock endDate is normalized without adding aliases or changing units',()=>{
  const source=functionBlock(worker,'canonicalAccessCardExpiryValue');
  const context={Number,Date};
  context.__name=()=>{};
  vm.runInNewContext(`${source}\nglobalThis.expiry=canonicalAccessCardExpiryValue;`,context);
  assert.equal(context.expiry({endDate:0}),'');
  assert.equal(context.expiry({endDate:'invalid'}),'');
  assert.equal(context.expiry({endDate:1700000000000}),'2023-11-14T22:13:20.000Z');
  assert.equal(context.expiry({expireDate:1700000000000}),'');
});

test('Bed Context serializes normalized TTLock expiry from the Access Snapshot DTO',()=>{
  const access=functionBlock(worker,'canonicalDepositAccessSnapshotForBed');
  const occupancy=functionBlock(worker,'canonicalOccupancyGateway');
  assert.match(access,/snapshot\.normalized_expiry_value=canonicalAccessCardExpiryValue\(card\)/);
  assert.match(occupancy,/normalized_expiry_value:access\.snapshot\?\.normalized_expiry_value\|\|""/);
});

test('Bed Transfer additions in Owner UI remain Gateway-only and do not recalculate facts',()=>{
  const history=functionBlock(owner,'ownerHistoryTransferLineageHtml');
  const finance=functionBlock(owner,'renderOwnerFinancePanel');
  const arrears=functionBlock(owner,'loadExistingArrearsForOwner');
  const todo=functionBlock(owner,'loadOwnerTodayTodos');
  assert.match(history,/lineage\.historical_beds/);
  assert.doesNotMatch(history,/fetch\(|apiFetch|room IN|localStorage|LS\./);
  assert.match(finance,/data\.bed_transfer_fee_income/);
  assert.match(finance,/data\.bed_price_difference_income/);
  assert.doesNotMatch(finance,/\.reduce\(|bed_transfer_fee_income\s*\+|bed_price_difference_income\s*\+/);
  assert.match(arrears,/\/api\/owner\/cloud-arrears\/projection/);
  assert.match(todo,/\/api\/owner\/today-todos/);
});

const sourceContext={corpid:'corp',resolution_status:'resolved',candidate_count:1,source_context_anchor_refs:['rent-anchor-0001'],rent_coverage_ref:'rent-coverage-0001',deposit_context_ref:'deposit-context-0001',expiry_context_ref:'expiry-context-0001',snapshot_fingerprint:'source-snapshot-0001',physical_bed_status:'not_marked_vacant',parsed_vacancy_marker:false,parse_status:'parsed',open_arrears:[]};
const targetContext={corpid:'corp',candidate_count:1,snapshot_fingerprint:'target-snapshot-0001',physical_bed_status:'vacant',parsed_vacancy_marker:true,parse_status:'parsed'};
const validInput=patch=>({client_payload:{event_type:'bed_transfer'},from_bed:'146',to_bed:'111',transfer_at:'2026-07-12T12:00:00+04:00',transfer_reason:'local validation order',payment_method:'cash',corpid:'corp',canonical_source_context:sourceContext,canonical_target_context:targetContext,fee_mode:'paid',fee_amount_aed:50,bed_price_difference_mode:'none',bed_price_difference_amount_aed:0,...patch});

test('malformed fee reaches the formal fee error on a locally valid source-context fixture',()=>{
  assert.equal(buildBedTransferCanonicalLinkAnchor(validInput({fee_amount_aed:49})).error_code,'BED_TRANSFER_FEE_AMOUNT_INVALID');
});

test('malformed difference reaches the formal difference error on a locally valid source-context fixture',()=>{
  assert.equal(buildBedTransferCanonicalLinkAnchor(validInput({bed_price_difference_mode:'paid',bed_price_difference_amount_aed:-1,bed_price_difference_payment_method:'cash'})).error_code,'BED_PRICE_DIFFERENCE_AMOUNT_INVALID');
});

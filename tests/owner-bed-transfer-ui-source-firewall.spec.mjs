import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ui=await readFile(new URL('../deploy-worker/public/index-51-main.js',import.meta.url),'utf8');
const employee=await readFile(new URL('../deploy-worker/public/employee-v3.html',import.meta.url),'utf8');
const worker=await readFile(new URL('../deploy-worker/src/index.js',import.meta.url),'utf8');
const contract=await readFile(new URL('../modules/employees/bed-transfer-phase1-contract.mjs',import.meta.url),'utf8');
const block=name=>{const start=ui.indexOf(`function ${name}`);assert.ok(start>=0,name);const next=ui.indexOf('\nfunction ',start+10);return ui.slice(start,next<0?ui.length:next);};

test('all new Owner gateways share JSON HTTP and auth fail-closed guard',()=>{
  const guard=block('ownerGatewayJson');
  assert.match(guard,/contentType\.includes\('json'\)/);
  assert.match(guard,/!response\.ok/);
  assert.match(guard,/response\.status===401\|\|response\.status===403/);
  assert.match(guard,/data\?\.ok===false\|\|data\?\.success===false/);
});

test('failed refresh clears canonical success state instead of promoting local cache',()=>{
  assert.match(block('loadOwnerFinanceProjection'),/state\.ownerFinance=null/);
  assert.match(block('loadOwnerTodayTodos'),/state\.ownerTodayTodos=null/);
  const arrears=block('loadArrearsForOwner');
  assert.match(arrears,/state\.arrears=\[\];state\.arrearsClosed=\[\]/);
  assert.doesNotMatch(arrears,/LS\.get\(ARREARS_KEY\)|localStorage/);
});

test('Bed Transfer renderers never consume provider card or phone identity',()=>{
  const names=['ownerHistoryTransferLineageHtml','renderOwnerFinancePanel','renderOwnerArrearsTaskCard','ownerBedTransferTodoRowHtml'];
  for(const name of names)assert.doesNotMatch(block(name),/tenant_card_id|card_id|old_ttlock_ref|provider_phone|phone_99099|creator_phone|provider_metadata/i,name);
});

test('UI modules read their own Gateway and never derive across DOM modules',()=>{
  assert.doesNotMatch(block('ownerHistoryTransferLineageHtml'),/Finance|arrears_repaid|todo/i);
  assert.doesNotMatch(block('renderOwnerFinancePanel'),/historyContent|arrearsPanel|ownerTodayTodos/);
  assert.doesNotMatch(block('ownerBedTransferTodoRowHtml'),/historyContent|ownerFinance/);
});

test('Employee UI and production Bed Transfer write gate remain unchanged and closed',()=>{
  assert.match(employee,/const BED_TRANSFER_WRITE_ENABLED=false/);
  assert.match(worker,/\["TF","TFF"\]\.includes\(writeGateType\)&&!bedTransferWriteApproved\(env\)/);
  assert.match(worker,/validateBedTransferPhase1Contract/);
  assert.match(contract,/fromBed === "334" \|\| toBed === "334"/);
});

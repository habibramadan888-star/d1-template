import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const worker = await readFile(new URL('../deploy-worker/src/index.js', import.meta.url), 'utf8');
const employee = await readFile(new URL('../deploy-worker/public/employee-v3.html', import.meta.url), 'utf8');
const owner = await readFile(new URL('../deploy-worker/public/index-51-main.js', import.meta.url), 'utf8');
const embeddedBuilder = await readFile(new URL('../deploy-worker/scripts/build-embedded-worker.js', import.meta.url), 'utf8');

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} missing`);
  const marker = source.indexOf(`__name(${name},`, start);
  assert.ok(marker > start, `${name} marker missing`);
  return source.slice(start, marker);
}

function capability(env = {}) {
  const code = [
    functionBlock(worker, 'qaAcceptanceEnabled'),
    functionBlock(worker, 'ownerTodayTodoAcknowledgmentWriteEnabled'),
    functionBlock(worker, 'ownerBedTransferVoidWriteEnabled'),
    functionBlock(worker, 'bedTransferWriteApproved'),
    functionBlock(worker, 'bedTransferDeploymentCapabilities'),
    'result=bedTransferDeploymentCapabilities(env);'
  ].join('\n');
  const sandbox = { env, result: null, cleanText: (value, max) => String(value || '').slice(0, max) };
  vm.runInNewContext(code, sandbox);
  return structuredClone(sandbox.result);
}

test('server capability response is fail-closed when gates are unset or malformed', () => {
  for (const env of [{}, { BED_TRANSFER_WRITE_APPROVED: 'TRUE' }, { BED_TRANSFER_WRITE_APPROVED: '1' }, { OWNER_TODAY_TODO_ACK_ENABLED: 'true', APP_ENV: 'production' }]) {
    const row = capability(env);
    assert.equal(row.bed_transfer_write_enabled, false);
    assert.equal(row.owner_waiver_ack_enabled, false);
    assert.equal(row.bed_transfer_validate_enabled, true);
    assert.equal(row.production_cutover, 'PRODUCTION_NO_GO');
  }
});

test('server capability response reflects exact real gates without exposing env values', () => {
  const row = capability({ BED_TRANSFER_WRITE_APPROVED: ' true ', OWNER_TODAY_TODO_ACK_ENABLED: 'on', APP_ENV: 'test', APP_VERSION: '2.0.0', JWT_SECRET: 'not-returned' });
  assert.equal(row.bed_transfer_write_enabled, true);
  assert.equal(row.owner_waiver_ack_enabled, true);
  assert.equal(row.canonical_write_path, '/api/employee/entry');
  assert.equal(row.app_version, '2.0.0');
  assert.equal(Object.hasOwn(row, 'JWT_SECRET'), false);
  assert.match(worker, /path==="\/api\/capabilities"&&method==="GET"/);
});

test('internal beta exposes an exact independent Owner void gate without opening employee writes', () => {
  const row = capability({ BED_TRANSFER_WRITE_APPROVED: 'false', OWNER_TODAY_TODO_ACK_ENABLED: 'true', BED_TRANSFER_OWNER_VOID_ENABLED: 'true', BED_TRANSFER_OWNER_VOID_TARGET_ANCHOR_ID: 'target-anchor', APP_ENV: 'internal_beta' });
  assert.equal(row.bed_transfer_write_enabled, false);
  assert.equal(row.owner_waiver_ack_enabled, true);
  assert.equal(row.bed_transfer_owner_void_enabled, true);
  assert.equal(row.internal_beta, true);
  assert.equal(row.production_cutover, 'PRODUCTION_NO_GO');
});

test('employee capability failure disables Bed Transfer fields, local save and final session upload', () => {
  assert.match(employee, /bedTransferCapabilities:\{status:'idle'.*bed_transfer_write_enabled:false/);
  assert.match(employee, /catch\{\s*state\.bedTransferCapabilities=\{.*status:'error'.*bed_transfer_write_enabled:false/s);
  assert.match(employee, /transferWriteBlocked=.*!employeeBedTransferWriteEnabled\(\)/);
  assert.match(employee, /renderEmployeeButtonLabel\('Upload Disabled','Bed Transfer validation only'\)/);
  assert.match(employee, /saveCanonicalBedTransferDraft/);
  assert.match(employee, /saveButton\.disabled=!gate\.fields_enabled\|\|!contextReady/);
  assert.match(employee, /status:'error',bed_transfer_validate_enabled:false,bed_transfer_write_enabled:false/);
});

test('Bed Transfer capability gate clears stale auth-lock accessibility state when validation is enabled', () => {
  assert.match(employee, /if\(gate\.validate_enabled\)chip\.removeAttribute\('aria-disabled'\);else chip\.setAttribute\('aria-disabled','true'\)/);
});

test('owner capability failure hides waiver acknowledgment and blocks direct invocation', () => {
  assert.match(owner, /ownerCapabilities:\{status:'idle',owner_waiver_ack_enabled:false/);
  assert.match(owner, /catch\{\s*state\.ownerCapabilities=\{status:'error',owner_waiver_ack_enabled:false/s);
  assert.match(owner, /isOwnerWriteRole\(\)&&ownerWaiverAckCapabilityEnabled\(\)/);
  assert.match(owner, /if\(!ownerWaiverAckCapabilityEnabled\(\)\)\{toast/);
  assert.match(owner, /await loadOwnerCapabilities\(\)/);
});

test('independent and save_session Bed Transfer routes remain closed', () => {
  assert.match(functionBlock(worker, 'handleEmployeeBedTransferCreate'), /return bedTransferCanonicalPathRequiredResponse\(\)/);
  assert.match(worker, /if\(saveSessionContainsBedTransfer\(body\)\)return bedTransferCanonicalPathRequiredResponse\(\)/);
  assert.match(functionBlock(worker, 'bedTransferWriteDisabledResponse'), /write_attempted:false/);
});

test('embedded Worker generator accepts LF and CRLF source checkouts', () => {
  assert.match(embeddedBuilder, /marker\.replace\(\/\\n\/g, "\\r\\n"\)/);
  assert.match(embeddedBuilder, /replacement\.replace\(\/\\n\/g, "\\r\\n"\)/);
});

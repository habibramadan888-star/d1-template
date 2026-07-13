import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../deploy-worker/public/employee-v3.html', import.meta.url), 'utf8');
const worker = await readFile(new URL('../deploy-worker/src/index.js', import.meta.url), 'utf8');

function block(source, name, asyncFunction = false) {
  const marker = `${asyncFunction ? 'async ' : ''}function ${name}`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} must exist`);
  const rest = source.slice(start + marker.length);
  const next = rest.match(/\n(?:async\s+)?function\s+/);
  return source.slice(start, next ? start + marker.length + next.index : source.length);
}

test('Save Transfer is local-only and requires the already loaded matching Bed Context', () => {
  const validation = block(html, 'validateBedTransferEntry');
  assert.match(validation, /status!=='ready'\|\|state\.bedTransferContext\.requestKey!==expectedContextKey/);
  assert.match(validation, /BED_TRANSFER_BED_CONTEXT_REQUIRED/);
  const save = block(html, 'saveCanonicalBedTransferDraft', true);
  assert.match(save, /validateBedTransferEntry\(\)/);
  assert.match(save, /state\.drafts\.unshift\(entry\)/);
  assert.doesNotMatch(save, /employeeLoadBedTransferContexts|validateEmployeeUploadDryRun|apiFetch\(/);
});

test('Upload Session performs formal validation before the single canonical write', () => {
  const flow = html.slice(html.lastIndexOf('async function commitSessionAndExport'));
  const validate = flow.indexOf('await validateEmployeeUploadDryRun');
  const write = flow.indexOf("apiFetch('/api/employee/entry'");
  assert.ok(validate >= 0 && validate < write);
  assert.match(flow, /dry_run:true,validate_only:true,no_write:true|employeeBedTransferValidatePayload/);
  assert.equal((flow.match(/apiFetch\('\/api\/employee\/entry'/g)||[]).length,1);
});

test('upload failure retains the local transfer and exposes one explicit error', () => {
  const flow = html.slice(html.lastIndexOf('async function commitSessionAndExport'));
  assert.ok((flow.match(/state\.drafts=originalDrafts/g)||[]).length>=2);
  assert.match(flow,/uploadValidationFailedMessage=/);
  assert.match(flow,/renderEmployeeUploadDryRunError/);
});

test('successful cloud confirmation removes the transfer from Current Session', () => {
  const flow = html.slice(html.lastIndexOf('async function commitSessionAndExport'));
  assert.match(flow,/if\(cloudConfirmed&&includesBedTransfer\)/);
  assert.match(flow,/toUpperCase\(\)!=='TF'/);
  assert.match(flow,/localStorage\.removeItem\(employeeStorageKey\('empv3:sessionId'\)\)/);
});

test('formal upload gate still fails closed and production cutover stays no-go', () => {
  const response = block(worker, 'bedTransferWriteDisabledResponse');
  assert.match(response, /BED_TRANSFER_WRITE_NOT_ENABLED/);
  assert.match(response, /write_attempted:false/);
  assert.match(response, /PRODUCTION_NO_GO/);
});

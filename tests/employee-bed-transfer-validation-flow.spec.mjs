import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../deploy-worker/public/employee-v3.html', import.meta.url), 'utf8');
const worker = await readFile(new URL('../deploy-worker/src/index.js', import.meta.url), 'utf8');

function block(source, name, asyncFunction = false) {
  const marker = `${asyncFunction ? 'async ' : ''}function ${name}`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} must exist`);
  const next = source.indexOf('\nfunction ', start + marker.length);
  const nextAsync = source.indexOf('\nasync function ', start + marker.length);
  const ends = [next, nextAsync].filter(value => value >= 0);
  return source.slice(start, ends.length ? Math.min(...ends) : source.length);
}

test('draft flow performs local check, fresh contexts and validate-only before retaining one draft', () => {
  const flow = block(html, 'saveCanonicalBedTransferDraft', true);
  const firstLocal = flow.indexOf('validateBedTransferEntry()');
  const contexts = flow.indexOf('await employeeLoadBedTransferContexts()');
  const secondLocal = flow.indexOf('validateBedTransferEntry()', firstLocal + 1);
  const dryRun = flow.indexOf('await validateEmployeeUploadDryRun');
  const retain = flow.indexOf('state.drafts=[entry]');
  assert.ok(firstLocal >= 0 && firstLocal < contexts && contexts < secondLocal && secondLocal < dryRun && dryRun < retain);
  assert.match(flow, /result\?\.ok!==true\|\|result\?\.event_type!=='bed_transfer'\|\|result\?\.no_write_requested!==true/);
  assert.doesNotMatch(flow, /\/api\/employee\/entry['"]/);
});

test('validate failure preserves form and makes no real-write call', () => {
  const flow = block(html, 'saveCanonicalBedTransferDraft', true);
  const catchBlock = flow.slice(flow.indexOf('}catch(error){'));
  assert.match(catchBlock, /renderEmployeeUploadDryRunError/);
  assert.doesNotMatch(catchBlock, /resetForm\(|state\.drafts=\[entry\]|\/api\/employee\/entry['"]/);
});

test('formal upload gate remains closed and reports a specific no-write error', () => {
  assert.match(html, /const BED_TRANSFER_WRITE_ENABLED=false/);
  assert.match(html, /换床正式上传尚未启用/);
  const response = block(worker, 'bedTransferWriteDisabledResponse');
  assert.match(response, /BED_TRANSFER_WRITE_NOT_ENABLED/);
  assert.match(response, /write_attempted:false/);
  assert.match(response, /PRODUCTION_NO_GO/);
});

test('effective upload flow validates before write and never marks accepted response as Synced', () => {
  const start = html.lastIndexOf('async function commitSessionAndExport');
  const flow = html.slice(start);
  const validate = flow.indexOf('await validateEmployeeUploadDryRun');
  const write = flow.indexOf("apiFetch('/api/employee/entry'");
  assert.ok(validate >= 0 && validate < write);
  const accepted = flow.slice(write, flow.indexOf('}catch(err){', write));
  assert.match(accepted, /e\.sync_status='LOCAL'/);
  assert.doesNotMatch(accepted, /e\.sync_status='SYNCED'/);
  assert.match(accepted, /e\.upload_status='CHECKING_CLOUD'/);
});

test('Bed Transfer retry identity is stable across validate and final upload', () => {
  const builder = block(html, 'buildBedTransferAnchor');
  assert.equal((builder.match(/const id=uid\('E'\)/g) || []).length, 1);
  const flow = block(html, 'saveCanonicalBedTransferDraft', true);
  assert.match(flow, /const entry=buildBedTransferAnchor\(\)/);
  assert.match(flow, /validateEmployeeUploadDryRun\(canonicalEntry,session,0\)/);
  assert.match(flow, /state\.drafts=\[entry\]/);
});

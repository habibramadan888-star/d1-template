import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../deploy-worker/public/employee-v3.html', import.meta.url), 'utf8');

function functionBlock(name, nextName) {
  const start = html.indexOf(`async function ${name}(`);
  const end = html.indexOf(`\nasync function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `${name} must exist`);
  return html.slice(start, end >= 0 ? end : html.length);
}

test('employee primary action is one confirm-and-upload action', () => {
  assert.match(html, /id="btnExportSession"[^>]*>[\s\S]*?Confirm &amp; Upload[\s\S]*?确认并上传/);
  assert.match(html, /data-employee-validation-tools="true"/);
  assert.match(html, /<details[^>]*data-employee-validation-tools="true"[^>]*>/);
  assert.match(html, /id="btnValidateSession"[\s\S]*?Validate Only[\s\S]*?仅预校验（不上传）/);
});

test('confirm-and-upload reuses validation then formal upload without a new gate', () => {
  const flow = functionBlock('commitSessionAndExport', 'employeeSessionCardDescription');
  assert.match(flow, /validateEmployeeUploadAggregateDryRun\(validationRequests\)/);
  assert.match(flow, /if\(validateOnly\)[\s\S]*?return;/);
  const validationIndex = flow.indexOf('validateEmployeeUploadAggregateDryRun(validationRequests)');
  const writeIndex = flow.indexOf("apiFetch('/api/employee/entry'", validationIndex);
  assert.ok(validationIndex >= 0 && writeIndex > validationIndex, 'formal write must follow aggregate validation');
  assert.match(html, /btnExportSession'\)\.onclick=commitSessionAndExport/);
  assert.match(html, /btnValidateSession'\)\.onclick=\(\)=>\{state\.aggregateValidationOnly=true;commitSessionAndExport\(\)\}/);
});

test('single-action UI does not reference Owner, projection, or TTLock gates', () => {
  const actions = html.slice(html.indexOf('<div class="employee-session-actions"'), html.indexOf('</div>\n      </div>', html.indexOf('<div class="employee-session-actions"')));
  assert.doesNotMatch(actions, /owner|projection|ttlock/i);
});

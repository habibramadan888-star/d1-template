import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const employeePath='deploy-worker/public/employee-v3.html';

test('employee entry uses one final validate, saveEntry, and syncForm definition',async()=>{
  const source=await readFile(employeePath,'utf8');
  assert.equal((source.match(/function validate\(\)/g)||[]).length,1);
  assert.equal((source.match(/async function saveEntry\(\)/g)||[]).length,1);
  assert.equal((source.match(/function syncForm\(\)/g)||[]).length,1);
  assert.doesNotMatch(source,/validate\s*=\s*function|saveEntry\s*=|syncForm\s*=\s*function/);
  assert.doesNotMatch(source,/saveEntryWithoutTtlockGate|saveEntryWithTtlockGate/);
});

test('consolidated validate preserves seven-event dispatch and UI state',async()=>{
  const source=await readFile(employeePath,'utf8');
  const start=source.indexOf('function validate()');
  const end=source.indexOf('function entryPayload()',start);
  const block=source.slice(start,end);
  assert.match(block,/employeeEntryTemplateKeyForType/);
  assert.match(block,/template\.validator\|\|validateRentEntry/);
  assert.match(block,/employeeRenderValidation\(result\)/);
  assert.match(block,/submit\.disabled=blocked/);
  assert.match(block,/employeeUpdateCollapsedStepSummaries\(result\)/);
  for(const validator of ['validateRentEntry','validateArrearsPaymentEntry','validateDepositInEntry','validateDepositOutEntry','validateCheckoutEntry','validateExpenseEntry','validateBedTransferEntry']){
    assert.match(source,new RegExp(`function ${validator}\\(`));
  }
});

test('unreachable legacy business hard gates are absent',async()=>{
  const source=await readFile(employeePath,'utf8');
  assert.doesNotMatch(source,/if\(false&&leftMode\)/);
  assert.doesNotMatch(source,/saveEntryWithoutTtlockGate|saveEntryWithTtlockGate/);
  assert.doesNotMatch(source,/const employeeLegacyValidate=validate|const employeeBusinessRuleValidate=validate/);
});

test('sync and save preserve the current non-blocking behavior',async()=>{
  const source=await readFile(employeePath,'utf8');
  const sync=source.slice(source.indexOf('function syncForm()'),source.indexOf('function validate()'));
  const save=source.slice(source.indexOf('async function saveEntry()'),source.indexOf('function resetForm()'));
  assert.match(sync,/renderLeftWithArrearsFields\(\)/);
  assert.match(sync,/employeeUpdateCollapsedStepSummaries\(\)/);
  assert.match(save,/if\(\$\('entryType'\)\.value==='TF'\)return saveCanonicalBedTransferDraft\(\)/);
  assert.match(save,/const v=validate\(\);if\(v\.errors\.length\)/);
  assert.match(save,/state\.drafts\.unshift\(e\)/);
  assert.doesNotMatch(save,/ttlock|owner|openTasksForBed|depositHeld/);
});

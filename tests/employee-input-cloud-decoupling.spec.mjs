import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../deploy-worker/public/employee-v3.html', import.meta.url), 'utf8');

function body(name, next = 'function ') {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf(`\n${next}`, start + 10);
  return source.slice(start, end === -1 ? source.length : end);
}

test('business references warn but do not block employee draft entry', () => {
  const rent = body('validateRentEntry');
  const arrears = body('validateArrearsPaymentEntry');
  const deposit = body('validateDepositInEntry');
  const checkout = body('validateCheckoutEntry');
  assert.match(rent, /samePeriodTask\)warns\.push/);
  assert.match(rent, /Overpaid rent has no excess handling choice/);
  assert.match(arrears, /Cloud arrears reference is unavailable/);
  assert.match(deposit, /system reference.*reviewed/);
  assert.match(checkout, /Open Arrears Found.*saved for Owner Review/);
});

test('TTLock and capability availability cannot disable Add to Session', () => {
  const ttlock = body('renderEntryTtlockStatus');
  const save = body('saveEntry');
  const transferGate = body('employeeBedTransferUiGateState');
  assert.doesNotMatch(ttlock, /save\.disabled\s*=\s*blocked/);
  assert.doesNotMatch(save, /ensureEntryTtlockReady/);
  assert.equal((source.match(/async function saveEntry\(\)/g) || []).length, 1);
  assert.match(transferGate, /fields_enabled:true/);
  assert.match(transferGate, /final_upload_enabled:true/);
});

test('external arrears and deposit references do not populate employee amount', () => {
  const sync = body('syncForm');
  assert.doesNotMatch(sync, /if\(task&&!num\(\$\('amount'\)\.value\)\)\$\('amount'\)\.value/);
  assert.doesNotMatch(sync, /type==='DR'.*\$\('amount'\)\.value=fmtMoney\(depositHeld\(\)\)/);
});

test('Bed Transfer keeps ordinary raw entry identity and treats context as review evidence', () => {
  const validator = body('validateBedTransferEntry');
  const payload = body('employeeBedTransferValidatePayload');
  assert.match(validator, /BED_TRANSFER_BED_CONTEXT_UNAVAILABLE/);
  assert.doesNotMatch(validator, /errors\.push\('BED_TRANSFER_BED_CONTEXT/);
  for (const field of ['id','entry_id','event_id','anchor_id','session_id']) assert.match(payload, new RegExp(`'${field}'`));
});

test('real technical requirements remain fail closed', () => {
  const rent = body('validateRentEntry');
  const expense = body('validateExpenseEntry');
  const transfer = body('validateBedTransferEntry');
  assert.match(rent, /Bed is required/);
  assert.match(rent, /Payment Method is required/);
  assert.match(expense, /Expense Description is required/);
  assert.match(transfer, /From Bed is required/);
  assert.match(transfer, /To Bed is required/);
});

test('ordinary Entry uses one active upload implementation and no cloud-review button gate', () => {
  assert.equal((source.match(/async function commitSessionAndExport\(/g) || []).length, 1);
  assert.equal((source.match(/function currentSessionHasCloudReviewBlock\(/g) || []).length, 0);
  const actionStart = source.indexOf('updateEntrySessionActionState=function(){');
  const actionEnd = source.indexOf('\nfunction refreshSessionViews', actionStart);
  const action = source.slice(actionStart, actionEnd);
  assert.doesNotMatch(action, /currentSessionHasCloudReviewBlock/);
  assert.doesNotMatch(action, /const blocked=/);
});

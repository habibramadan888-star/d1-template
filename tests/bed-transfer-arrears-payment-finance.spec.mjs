import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../deploy-worker/src/index.js', import.meta.url), 'utf8');

test('finance counts generic and component repayment once without rent or transfer income duplication', () => {
  assert.match(source, /bed_transfer_fee_arrears_repaid:0/);
  assert.match(source, /bed_price_difference_arrears_repaid:0/);
  assert.match(source, /totals\.arrears_repaid\+=amount/);
  assert.match(source, /appliedDerivedRepaymentRefs\.has\(repaymentRef\)/);
  assert.match(source, /ARREARS_REPAYMENT_SOURCE_VOID_RECONCILIATION_REQUIRED/);
});

test('full payment projection ignores later conflicts and never subtracts twice', () => {
  assert.match(source, /FULL_PAYMENT_ARREARS_MULTIPLE_ACTIVE_AP_CONFLICT/);
  assert.match(source, /FULL_PAYMENT_ARREARS_AMOUNT_CONFLICT/);
  assert.match(source, /item\.linked_repayment_events\.length/);
  assert.match(source, /Math\.max\(0,Number\(item\.arrear_amount\|\|0\)-item\.actual_received\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../deploy-worker/src/index.js', import.meta.url), 'utf8');

test('existing AP writer resolves derived refs through canonical gateway and persists additive session anchor', () => {
  assert.match(source, /canonicalArrearsGateway\(env,user,\{arrears_ref:ref,limit:2000\}\)/);
  assert.match(source, /resolveDerivedArrearsPaymentForEntry/);
  assert.match(source, /derived_arrears_payment:derivedArrearsPayment/);
  assert.match(source, /Object\.assign\(body\.session\.entries\[eventIndex\],fields\)/);
  assert.match(source, /entries_json:cleanText\(sessionEntriesJson/);
  assert.doesNotMatch(source, /CREATE TABLE[^\n]*arrears_payment/i);
});

test('firewall runs before schema database checks and old AP lookup remains available', () => {
  assert.ok(source.indexOf('arrearsPaymentForbiddenServerFieldFailure(body||{},rawEventIndex)') < source.indexOf('empTableExists(env,"sessions")'));
  assert.match(source, /findDerivedArrearsPaymentForbiddenFields\(\[envelope,sessionEnvelope,\.\.\.rows\]\)/);
  assert.match(source, /empFindOpenArrearTaskForPaymentReadOnly/);
  assert.match(source, /if\(projected\)return null/);
  assert.match(source, /arrear_tasks/);
});

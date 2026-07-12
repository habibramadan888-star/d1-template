import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const worker = await readFile(new URL('../deploy-worker/src/index.js', import.meta.url), 'utf8');
const link = await readFile(new URL('../modules/employees/bed-transfer-canonical-link-anchor.mjs', import.meta.url), 'utf8');
const archive = await readFile(new URL('../modules/employees/bed-transfer-canonical-archive-write.mjs', import.meta.url), 'utf8');

function block(name) {
  const start = worker.indexOf(`function ${name}`);
  const asyncStart = worker.indexOf(`async function ${name}`);
  const begin = start === -1 ? asyncStart : start;
  assert.notEqual(begin, -1, `${name} missing`);
  const end = worker.indexOf(`__name(${name}`, begin);
  assert.notEqual(end, -1, `${name} block end missing`);
  return worker.slice(begin, end);
}

test('Finance Gateway directly projects canonical transfer anchors', () => {
  const build = block('canonicalFinanceProjectionBuild');
  assert.match(worker, /projectBedTransferFinanceAndArrears/);
  assert.match(build, /ownerHistoryTransferLineageArchiveEntries\(\[\.\.\.sessions,\.\.\.correctionSessions\],user\.corpid\)/);
  assert.match(build, /bed_transfer_fee_income/);
  assert.match(build, /bed_price_difference_income/);
  assert.match(build, /canonicalFinanceProjectionEventType\(anchor\)!=="bed_transfer"/);
});

test('Arrears Gateway derives transfer arrears and current lineage bed without materialized truth', () => {
  const projection = block('buildCloudArrearsProjectionFromSessions');
  const clean = block('canonicalArrearsGatewayCleanItem');
  assert.match(projection, /projectBedTransferFinanceAndArrears/);
  assert.match(projection, /effective_current_bed/);
  assert.match(clean, /source_anchor_ref/);
  assert.match(clean, /payment_policy/);
  assert.doesNotMatch(projection, /INSERT|UPDATE|DELETE|arrear_tasks/);
});

test('canonical archive allowlist and idempotency hash include all bed-difference fields', () => {
  for (const field of [
    'bed_price_difference_mode', 'bed_price_difference_amount_aed', 'bed_price_difference_due_date',
    'bed_price_difference_payment_method', 'bed_price_difference_reason'
  ]) {
    assert.match(link, new RegExp(field));
    assert.match(archive, new RegExp(field));
    assert.match(worker, new RegExp(field));
  }
  assert.match(archive, /const requestFingerprint=hash\(business\)/);
});

test('AP lookup accepts any canonical arrears ref but writer remains unchanged', () => {
  const lookup = block('empFindProjectionArrearsForPayment');
  const validation = block('validateArrearsPaymentUploadFields');
  assert.match(lookup, /canonicalArrearsGateway/);
  assert.match(lookup, /row\.arrears_ref/);
  assert.match(validation, /arrears_ref/);
  assert.doesNotMatch(validation, /rent_short_paid/);
  assert.doesNotMatch(worker.slice(worker.indexOf('function projectBedTransferFinanceAndArrears')), /function projectBedTransferFinanceAndArrears/);
});

test('existing AP anchors are applied after transfer-derived arrears exist', () => {
  const projection = block('buildCloudArrearsProjectionFromSessions');
  const derivedAt = projection.indexOf('transferProjection.derived_arrears');
  const paymentAt = projection.indexOf('for(const payment of payments)');
  assert.ok(derivedAt >= 0);
  assert.ok(paymentAt > derivedAt);
  assert.match(projection, /const item=itemsByRef\.get\(payment\.ref\)/);
});

test('no UI, schema, migration, TTLock D, or production behavior is introduced', async () => {
  const tests = await Promise.all([
    readFile(new URL('./bed-transfer-finance-projection.spec.mjs', import.meta.url), 'utf8'),
    readFile(new URL('./bed-transfer-arrears-projection.spec.mjs', import.meta.url), 'utf8')
  ]);
  assert.doesNotMatch(tests.join('\n'), /\b334\b/);
  const projection = await readFile(new URL('../modules/finance/bed-transfer-finance-arrears-projection.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(projection, /\b(?:TTLock|INSERT|UPDATE|DELETE|migration)\b|fetch\(/i);
  assert.match(projection, /readonly: true/);
  assert.match(projection, /no_write: true/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const worker = readFileSync('deploy-worker/src/index.js', 'utf8');
const ownerJs = readFileSync('deploy-worker/public/index-51-main.js', 'utf8');

test('backend reports only the two allowed arrears source authorities', () => {
  assert.match(worker, /source_authority:\["existing_arrears_record","ttlock_expired_unpaid"\]/);
  assert.match(worker, /existing_arrears_record/);
  assert.match(worker, /ttlock_expired_unpaid/);
  assert.doesNotMatch(worker, /source_authority:\[[^\]]*current_due_unpaid/);
});

test('frontend pool accepts existing arrears and ttlock expired unpaid only', () => {
  const start = ownerJs.indexOf('function normalizeArrearsSourceType');
  const end = ownerJs.indexOf('function isAllowedArrearsSource', start);
  assert.ok(start > 0 && end > start, 'source normalization block should exist');
  const block = ownerJs.slice(start, end + 260);
  assert.match(block, /existing_arrears_record/);
  assert.match(block, /ttlock_expired_unpaid/);
  assert.match(block, /unsupported_arrears_source/);
  assert.doesNotMatch(block, /current_due_unpaid/);
});

test('missing bed rent excludes ttlock card without blocking existing arrears', () => {
  assert.match(ownerJs, /bedRentAmountForArrears/);
  assert.match(ownerJs, /return null/);
  assert.match(ownerJs, /filter\(card=>Number\(bedRentAmountForArrears\(card\)\)>0\)/);
  assert.match(ownerJs, /ttlock_expired_unpaid:\{ok:false/);
});

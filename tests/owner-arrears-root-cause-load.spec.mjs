import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const worker = readFileSync('deploy-worker/src/index.js', 'utf8');
const ownerJs = readFileSync('deploy-worker/public/index-51-main.js', 'utf8');

test('owner arrears read endpoint exposes bounded diagnostic contract', () => {
  assert.match(worker, /path === "\/api\/arrears\/followup\/tasks"/);
  assert.match(worker, /empListMergedArrearTasksDetailed/);
  assert.match(worker, /source_status/);
  assert.match(worker, /total_amount_fils/);
  assert.match(worker, /total_count/);
  assert.match(worker, /existing_arrears_count/);
  assert.match(worker, /ttlock_expired_unpaid_count/);
  assert.match(worker, /employee_promised_count/);
  assert.match(worker, /recent_tasks/);
});

test('owner arrears read path no longer runs schema DDL before listing tasks', () => {
  const start = worker.indexOf('async function empListMergedArrearTasksDetailed');
  const end = worker.indexOf('__name(empListMergedArrearTasksDetailed', start);
  assert.ok(start > 0 && end > start, 'detailed read function should exist');
  const fn = worker.slice(start, end);
  assert.doesNotMatch(fn, /empEnsureSchema\s*\(/);
  assert.doesNotMatch(fn, /CREATE TABLE|ALTER TABLE|CREATE INDEX/);
});

test('overview arrears module has a bounded loading and retry path', () => {
  assert.match(ownerJs, /ARREARS_FETCH_TIMEOUT_MS\s*=\s*10000/);
  assert.match(ownerJs, /ARREARS_SLOW_LOADING_MS\s*=\s*3000/);
  assert.match(ownerJs, /retryOwnerOverviewArrears/);
  assert.match(ownerJs, /欠款数据读取失败/);
  assert.doesNotMatch(ownerJs, /3\s*\*\s*60\s*\*\s*1000|180000/);
});

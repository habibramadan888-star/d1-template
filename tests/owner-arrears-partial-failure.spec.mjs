import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ownerJs = readFileSync('deploy-worker/public/index-51-main.js', 'utf8');

test('owner arrears loads existing and ttlock sources with isolated failures', () => {
  assert.match(ownerJs, /Promise\.allSettled/);
  assert.match(ownerJs, /loadExistingArrearsForOwner/);
  assert.match(ownerJs, /loadTtlockArrearsForOwner/);
  assert.match(ownerJs, /existing_arrears_record/);
  assert.match(ownerJs, /ttlock_expired_unpaid/);
  assert.match(ownerJs, /ALL_ARREARS_SOURCES_FAILED/);
});

test('partial source failure renders available data with a business warning', () => {
  assert.match(ownerJs, /ownerArrearsSourceNotice/);
  assert.match(ownerJs, /data-owner-arrears-source-warning/);
  assert.match(ownerJs, /系统已有欠款暂不可用/);
  assert.match(ownerJs, /通通锁数据暂不可用/);
  assert.match(ownerJs, /已显示可读取的数据/);
});

test('abort and missing fields do not create permanent loading', () => {
  assert.match(ownerJs, /loadSeq!==state\.arrearsLoadSeq/);
  assert.match(ownerJs, /isAbortLikeError/);
  assert.match(ownerJs, /state\.arrearsStatus='timeout'/);
  assert.match(ownerJs, /state\.arrearsLoading=false/);
});

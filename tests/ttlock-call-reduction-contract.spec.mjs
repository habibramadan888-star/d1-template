import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync('deploy-worker/src/index.js','utf8');
const employee=fs.readFileSync('deploy-worker/public/employee-v3.html','utf8');

test('TTLock token and snapshot caches are bounded and scoped',()=>{
  assert.match(worker,/TTLOCK_READ_CACHE_MAX_AGE_MS=5\*60\*1000/);
  assert.match(worker,/TTLOCK_STRICT_CACHE_MAX_AGE_MS=60\*1000/);
  assert.match(worker,/ttlock:snapshot:v2:/);
  assert.match(worker,/expiresIn=Math\.max\(3600,Number\(tokenData\.expires_in\|\|7776000\)\)/);
  assert.match(worker,/TTLOCK_TOKEN_SAFETY_MARGIN_SECONDS/);
});

test('preview and staging live TTLock fetches fail closed',()=>{
  assert.match(worker,/host===TTLOCK_CANONICAL_PRODUCTION_HOST/);
  assert.match(worker,/TTLOCK_LIVE_FETCH_DISABLED_IN_STAGING/);
  assert.match(worker,/TTLOCK_LIVE_FETCH_DISABLED_IN_PREVIEW/);
});

test('request reuse and global single-flight are wired',()=>{
  assert.match(worker,/context\.ttlockSnapshotPromise\)\{/);
  assert.match(worker,/ttlockSnapshotFlights\.has\(flightKey\)/);
  assert.match(worker,/request_context:opts\.request_context/);
  assert.match(worker,/request_context=ttlockRequestContext\(request,env,user,"employee_entry_validate"/);
  assert.match(worker,/request_context=ttlockRequestContext\(request,env,user,"employee_entry_upload"/);
});

test('all TTLock consumers route through the canonical snapshot gateway',()=>{
  const direct=[...worker.matchAll(/loadLockCards\(env\)/g)].map(m=>m.index);
  assert.equal(direct.length,0,'no consumer should bypass the snapshot gateway');
  assert.match(worker,/getCanonicalTTLockSnapshot\(env,user\?\.corpid\|\|env\.CORPID\|\|"default"/);
});

test('employee Bed Transfer context requests are frontend deduplicated',()=>{
  assert.match(employee,/status==='loading'&&state\.bedTransferContext\.promise/);
  assert.match(employee,/state\.bedTransferContext\.promise=requestPromise/);
});

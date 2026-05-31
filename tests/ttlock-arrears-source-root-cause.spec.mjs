import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("backend arrears reader owns TTLock expired-unpaid source instead of client placeholder", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /async function empLoadTtlockExpiredUnpaidForArrears/);
  assert.match(worker, /loadLockCards\(env\)/);
  assert.match(worker, /ttlock_expired_unpaid_count:ttlockCount/);
  assert.match(worker, /ttlock_missing_rent_count/);
  assert.doesNotMatch(worker, /client_deferred/);
});

test("TTLock source errors are classified without exposing secrets", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /TTLOCK_SECRET_MISSING/);
  assert.match(worker, /TTLOCK_TOKEN_EXPIRED/);
  assert.match(worker, /TTLOCK_API_TIMEOUT/);
  assert.match(worker, /TTLOCK_AUTH_FAILED/);
  assert.doesNotMatch(worker, /console\.log\([^)]*(TTLOCK_CLIENT_SECRET|TTLOCK_PASSWORD|access_token)/i);
});

test("production cutover remains no-go", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");

  assert.match(gate, /COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview prefers backend TTLock source status before showing unavailable warning", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /backendTtlockRows/);
  assert.match(js, /backendTtlockStatus/);
  assert.match(js, /backendTtlockStatus\?\.ok===true/);
  assert.match(js, /ttlockStatusOk=backendTtlockStatus\?\.ok===true\|\|ttlockOk/);
  assert.match(js, /const ttlockRows=\(backendTtlockStatus\?\.ok===true\)\?backendTtlockRows:clientTtlockRows/);
});

test("TTLock source can fail without hiding system arrears", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /Promise\.allSettled/);
  assert.match(js, /if\(!existingOk&&!ttlockStatusOk\)/);
  assert.match(js, /existingArrearsRecords:existingRows/);
  assert.match(js, /ttlockExpiredUnpaid:ttlockRows/);
});

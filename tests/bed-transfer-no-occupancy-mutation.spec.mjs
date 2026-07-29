import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf(`__name(${name}`, start);
  assert.notEqual(end, -1, `${name} marker must exist`);
  return source.slice(start, end);
}

test("Bed Transfer save API does not mutate occupancy, deposit, arrears, or TTLock tables", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = extractFunction(worker, "handleEmployeeBedTransferCreate");

  assert.doesNotMatch(handler, /UPDATE\s+transactions/i);
  assert.doesNotMatch(handler, /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+transactions/i);
  assert.doesNotMatch(handler, /UPDATE\s+arrear_tasks/i);
  assert.doesNotMatch(handler, /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+arrear_tasks/i);
  assert.doesNotMatch(handler, /UPDATE\s+deposit_ledger/i);
  assert.doesNotMatch(handler, /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+deposit_ledger/i);
  assert.doesNotMatch(handler, /loadLockCards|TTLOCK_API_ORIGIN|\/api\/lock\/cards/i);
});

test("Bed Transfer remains excluded from production cutover", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

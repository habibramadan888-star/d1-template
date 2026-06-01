import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer Entry Ledger save does not mutate occupancy, deposit, arrears, or TTLock state", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const start = worker.indexOf("async function handleEmployeeBedTransferCreate");
  const end = worker.indexOf("__name(handleEmployeeBedTransferCreate", start);
  const h = worker.slice(start, end);

  assert.match(h, /INSERT INTO entry_events/);
  assert.match(h, /INSERT INTO bed_transfer_events/);
  assert.doesNotMatch(h, /UPDATE\s+occup/i);
  assert.doesNotMatch(h, /UPDATE\s+deposit/i);
  assert.doesNotMatch(h, /UPDATE\s+arrear/i);
  assert.doesNotMatch(h, /UPDATE\s+ttlock/i);
  assert.doesNotMatch(h, /DELETE\s+FROM/i);
});

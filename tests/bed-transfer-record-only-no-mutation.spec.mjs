import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf(`__name(${name}`, start);
  assert.notEqual(end, -1, `${name} __name marker must exist`);
  return source.slice(start, end);
}

test("Bed Transfer record-only save does not mutate business state tables", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = extractFunction(worker, "handleEmployeeBedTransferCreate");

  assert.match(handler, /INSERT INTO bed_transfer_events/);
  assert.match(handler, /INSERT INTO entry_events/);
  assert.doesNotMatch(handler, /UPDATE\s+occup/i);
  assert.doesNotMatch(handler, /UPDATE\s+deposit/i);
  assert.doesNotMatch(handler, /UPDATE\s+arrear/i);
  assert.doesNotMatch(handler, /UPDATE\s+ttlock/i);
  assert.doesNotMatch(handler, /DELETE\s+FROM/i);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

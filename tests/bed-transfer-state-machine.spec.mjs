import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer state machine defines safe review lifecycle", async () => {
  const doc = await readFile("BED_TRANSFER_STATE_MACHINE.md", "utf8");

  for (const status of ["draft", "validated", "pending_review", "completed", "cancelled", "failed"]) {
    assert.match(doc, new RegExp(`\\| ${status} \\|`));
  }
  assert.match(doc, /draft -> validated -> completed/);
  assert.match(doc, /draft -> pending_review -> completed \/ cancelled/);
  assert.match(doc, /New bed occupied/);
  assert.match(doc, /Deposit missing/);
  assert.match(doc, /TTLock missing/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

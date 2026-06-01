import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer state machine defines record-only lifecycle", async () => {
  const doc = await readFile("BED_TRANSFER_STATE_MACHINE.md", "utf8");

  for (const status of ["draft", "validated", "recorded", "recorded_with_notes", "rolled_back", "voided", "failed"]) {
    assert.match(doc, new RegExp(`\\| ${status} \\|`));
  }
  assert.match(doc, /draft -> validated -> recorded/);
  assert.match(doc, /draft -> recorded_with_notes -> recorded \/ rolled_back/);
  assert.match(doc, /Owner approval\/rejection is not part of the Bed Transfer workflow/);
  assert.match(doc, /New bed occupied/);
  assert.match(doc, /Deposit missing/);
  assert.match(doc, /TTLock missing/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

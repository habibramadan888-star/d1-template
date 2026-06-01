import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer traceability model supports customer timeline queries", async () => {
  const doc = await readFile("BED_TRANSFER_TRACEABILITY_MODEL.md", "utf8");

  assert.match(doc, /Which beds a customer has occupied/);
  assert.match(doc, /From which bed to which bed/);
  assert.match(doc, /Transfer date and effective date/);
  assert.match(doc, /Deposit carried at transfer time/);
  assert.match(doc, /Arrears carried at transfer time/);
  assert.match(doc, /TTLock state before and after transfer/);
  assert.match(doc, /operator: Abdul/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

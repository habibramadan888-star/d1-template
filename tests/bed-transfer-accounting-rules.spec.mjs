import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer accounting rules keep liabilities and revenue separate", async () => {
  const doc = await readFile("BED_TRANSFER_ACCOUNTING_RULES.md", "utf8");

  assert.match(doc, /Deposit liability follows customer/);
  assert.match(doc, /Not automatic during bed transfer/);
  assert.match(doc, /Current paid\/active rent period follows customer/);
  assert.match(doc, /Review item when old\/new bed rent differs/);
  assert.match(doc, /Only revenue if employee explicitly selects fee/);
  assert.match(doc, /Existing arrears remain attached to customer\/task chain/);
  assert.match(doc, /Not a new tenant and not a checkout/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

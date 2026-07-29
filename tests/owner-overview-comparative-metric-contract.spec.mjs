import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("comparative metric contract covers accountant-grade metric separation", async () => {
  const doc = await readFile("OWNER_OVERVIEW_COMPARATIVE_METRIC_CONTRACT.md", "utf8");

  for (const metric of [
    "gross_received",
    "rent_received",
    "net_cashflow",
    "arrears_recovered",
    "deposit_received",
    "deposit_refund",
    "new_tenants",
    "checkouts",
    "bed_transfers",
    "broken_promise_count"
  ]) {
    assert.match(doc, new RegExp(metric));
  }

  assert.match(doc, /same elapsed days/);
  assert.match(doc, /no_data/);
});

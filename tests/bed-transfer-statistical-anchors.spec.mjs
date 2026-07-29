import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer statistical anchors are defined separately from occupancy counts", async () => {
  const doc = await readFile("BED_TRANSFER_STATISTICAL_ANCHORS.md", "utf8");

  for (const anchor of [
    "transfer_count_month",
    "transfer_count_quarter",
    "transfer_reason_distribution",
    "from_bed_transfer_count",
    "to_bed_transfer_count",
    "customer_transfer_count",
    "employee_transfer_count",
    "transfer_with_arrears_count",
    "transfer_with_deposit_snapshot_count",
    "transfer_with_ttlock_snapshot_count",
    "average_days_before_transfer",
    "transfer_then_checkout_rate",
    "transfer_then_arrears_rate"
  ]) {
    assert.match(doc, new RegExp(anchor));
  }
  assert.match(doc, /not new tenants/);
  assert.match(doc, /not checkouts/);
  assert.match(doc, /event-ledger records, not owner approval tasks/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

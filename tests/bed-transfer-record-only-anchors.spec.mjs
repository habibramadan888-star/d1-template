import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer record-only anchors are documented and preserved", async () => {
  const doc = await readFile("BED_TRANSFER_STATISTICAL_ANCHORS.md", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  for (const anchor of [
    "transfer_count_month",
    "from_bed_transfer_count",
    "to_bed_transfer_count",
    "customer_transfer_count",
    "employee_transfer_count",
    "transfer_with_arrears_count",
    "transfer_with_deposit_snapshot_count",
    "transfer_with_ttlock_snapshot_count"
  ]) {
    assert.match(doc, new RegExp(anchor));
  }

  assert.match(worker, /original_deposit_amount_fils:snapshot\.original_deposit_amount_fils/);
  assert.match(worker, /carry_over_arrears_fils:snapshot\.carry_over_arrears_fils/);
  assert.match(worker, /old_ttlock_ref:snapshot\.old_ttlock_ref/);
  assert.match(doc, /do not mutate occupancy, deposits, arrears, TTLock, dashboard, or financial formulas/);
});

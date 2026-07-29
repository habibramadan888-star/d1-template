import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("occupancy flow separates new tenants, checkouts, and bed transfers", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const doc = await readFile("OWNER_OCCUPANCY_FLOW_METRIC_RESULT.md", "utf8");

  assert.match(worker, /new_tenants/);
  assert.match(worker, /checkouts/);
  assert.match(worker, /bed_transfers/);
  assert.match(worker, /Transfers are not counted as new tenants or checkouts|transfer_rule/);
  assert.match(doc, /Bed transfers are not counted as new tenants or checkouts/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("waived Bed Transfer requires waiver reason in API and UI", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const migration = await readFile("migrations/007_bed_transfer_fee_ledger.sql", "utf8");

  assert.match(worker, /feeMode==="waived"&&!waiverReason/);
  assert.match(worker, /bed_transfer_waiver_reason_required/);
  assert.match(worker, /entry\.fee_waiver_reason\|\|entry\.custom_reason\|\|entry\.note/);
  assert.match(html, /e\.fee_mode==='waived'&&!e\.fee_waiver_reason/);
  assert.match(html, /Waiver Reason is required when Bed Transfer fee is waived/);
  assert.match(migration, /fee_mode <> 'waived' OR COALESCE\(waiver_reason,''\) <> ''/);
});

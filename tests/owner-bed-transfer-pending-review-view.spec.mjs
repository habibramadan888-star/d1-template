import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner has a read-only Bed Transfer pending review API", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /async function handleOwnerBedTransfers/);
  assert.match(worker, /\/api\/owner\/bed-transfers/);
  assert.match(worker, /pending_review/);
  assert.match(worker, /production_cutover:\"PRODUCTION_NO_GO\"/);
});

test("owner overview renders pending Bed Transfer review requests", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /data-owner-bed-transfer-pending-review=\"true\"/);
  assert.match(js, /Bed Transfer Review/);
  assert.match(js, /Review only: no occupancy, deposit, arrears, or TTLock mutation/);
});

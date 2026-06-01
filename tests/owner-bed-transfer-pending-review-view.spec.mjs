import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner has a read-only Bed Transfer record API", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /async function handleOwnerBedTransfers/);
  assert.match(worker, /\/api\/owner\/bed-transfers/);
  assert.match(worker, /status IN \('recorded','pending_review'\)/);
  assert.match(worker, /record_only:true/);
  assert.match(worker, /production_cutover:\"PRODUCTION_NO_GO\"/);
});

test("owner overview renders Bed Transfer records without review actions", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /data-owner-bed-transfer-records=\"true\"/);
  assert.match(js, /Bed Transfer Records \/ 换床记录/);
  assert.match(js, /Recorded events/);
  assert.doesNotMatch(js, /data-owner-bed-transfer-pending-review=\"true\"/);
  assert.doesNotMatch(js, /Approve Transfer/);
  assert.doesNotMatch(js, /Reject Transfer/);
});

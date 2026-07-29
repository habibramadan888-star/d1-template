import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner Bed Transfer view is record-only and read-only", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(worker, /async function handleOwnerBedTransfers/);
  assert.match(worker, /record_only:true/);
  assert.match(worker, /production_cutover:"PRODUCTION_NO_GO"/);
  assert.match(js, /data-owner-bed-transfer-records="true"/);
  assert.match(js, /Bed Transfer Records \/ 换床记录/);
  assert.doesNotMatch(js, /Bed Transfer Review/);
  assert.doesNotMatch(js, /data-owner-bed-transfer-pending-review/);
});

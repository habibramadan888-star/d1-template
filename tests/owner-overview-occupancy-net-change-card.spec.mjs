import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview replaces occupancy net with cloud arrears collection", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(ui, /CLOUD ARREARS COLLECTION/);
  assert.match(ui, /data-owner-cloud-arrears-card/);
  assert.match(ui, /showOwnerCloudArrearsModal/);
  assert.doesNotMatch(ui, /OCCUPANCY NET/);
  assert.doesNotMatch(ui, /入住净变化/);
  assert.match(worker, /ownerOverviewIsCloudArrearsRow/);
  assert.match(worker, /cloud_arrears_collection/);
  assert.match(worker, /cloud_arrears_details/);
});

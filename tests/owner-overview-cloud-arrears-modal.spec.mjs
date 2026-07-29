import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview cloud arrears modal exposes searchable readonly details", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(ui, /function showOwnerCloudArrearsModal/);
  assert.match(ui, /Cloud Arrears Details/);
  assert.match(ui, /欠款代收明细/);
  assert.match(ui, /Search bed \/ 搜索床位/);
  assert.match(ui, /amount_desc/);
  assert.match(ui, /data-owner-cloud-arrears-card/);
  assert.match(ui, /event\.key==='Escape'/);
  assert.match(ui, /event\.target===overlay/);
  assert.match(worker, /cloud_arrears_collection:\{total_remaining:0,open_count:0,partial_count:0,details:\[\]\}/);
  assert.match(worker, /repayment_history/);
  assert.match(worker, /if\(source\.includes\("ttlock"\)/);
});

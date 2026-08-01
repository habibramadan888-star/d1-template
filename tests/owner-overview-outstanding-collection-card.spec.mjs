import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview outstanding card is sourced from current receivables SOT", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /current_receivables_sot:historyReceivables/);
  assert.match(worker, /FROM arrear_tasks/);
  assert.match(worker, /mode:"direct_cloud_projection"/);
  assert.match(ui, /function ownerOverviewConsoleSotRows\(\)/);
  assert.match(ui, /const outstandingAmount=outstandingRows\.reduce/);
  assert.match(ui, /const outstandingCount=outstandingRows\.length/);
  assert.match(ui, /const rows=ownerOverviewConsoleSotRows\(\)/);
  assert.doesNotMatch(ui, /outstandingAmount=.*cloudArrears\.outstanding_amount/);
  assert.match(ui, /OUTSTANDING COLLECTION/);
});

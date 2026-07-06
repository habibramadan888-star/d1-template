import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview outstanding card is sourced from current receivables SOT", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /current_receivables_sot:currentSot\?/);
  assert.match(worker, /rows:\(currentSot\.all_rows\|\|\[\]\)\.slice\(0,500\)/);
  assert.match(ui, /function ownerOverviewConsoleSotRows\(\)/);
  assert.match(ui, /const outstandingAmount=hasConsoleSot\?Number\(consoleSummary\.outstanding_amount_fils\|\|consoleSummary\.total_amount_fils\|\|0\)\/100:0/);
  assert.match(ui, /const outstandingCount=hasConsoleSot\?Number\(consoleSummary\.action_count\?\?consoleSummary\.total_count\?\?0\):0/);
  assert.match(ui, /const rows=ownerOverviewConsoleSotRows\(\)/);
  assert.doesNotMatch(ui, /outstandingAmount=.*cloudArrears\.outstanding_amount/);
  assert.match(ui, /OUTSTANDING COLLECTION/);
});

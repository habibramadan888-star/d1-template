import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner outstanding collection uses only expired occupied TTLock cards", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const rows = ui.match(/function ownerOverviewConsoleSotRows\(\)\{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(rows, /sot\.overdue/);
  assert.match(rows, /source_type\|\|''\)==='ttlock_expired_unpaid'/);
  assert.doesNotMatch(rows, /sot\.rows/);
  assert.doesNotMatch(rows, /sot\.all_rows/);
  assert.match(ui, /const outstandingRows=ownerOverviewConsoleSotRows\(\)/);
  assert.match(ui, /outstandingRows\.reduce\(\(sum,row\)=>sum\+ownerOverviewReceivableAmount\(row\),0\)/);
  assert.match(ui, /const outstandingCount=outstandingRows\.length/);
  assert.doesNotMatch(ui, /const outstandingCount=hasConsoleSot\?Number\(consoleSummary\.action_count/);
});

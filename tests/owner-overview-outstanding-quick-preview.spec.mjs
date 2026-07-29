import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("outstanding collection preview uses current receivables rows", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ui, /'OUTSTANDING COLLECTION':'outstanding'/);
  assert.match(ui, /function ownerOverviewShowOutstandingPreview/);
  assert.match(ui, /const rows=ownerOverviewConsoleSotRows\(\)/);
  assert.match(ui, /ownerOverviewReceivableAmount\(row\)/);
  assert.match(ui, /ownerOverviewPreviewArrearStatus\(row\)/);
  assert.match(ui, /rows\.reduce\(\(sum,row\)=>sum\+ownerOverviewReceivableAmount\(row\),0\)/);
  assert.match(ui, /showOwnerOverviewPreviewModal\('Outstanding Collection'/);
});

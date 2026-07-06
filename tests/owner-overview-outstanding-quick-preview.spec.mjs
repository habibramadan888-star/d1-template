import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("outstanding collection preview uses active arrears rows", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ui, /'OUTSTANDING COLLECTION':'outstanding'/);
  assert.match(ui, /function ownerOverviewShowOutstandingPreview/);
  assert.match(ui, /const rows=ownerArrearsActiveRows\(\)/);
  assert.match(ui, /ownerOverviewPreviewArrearStatus\(row\)/);
  assert.match(ui, /rows\.reduce\(\(sum,row\)=>sum\+Number\(row\.remain\|\|0\),0\)/);
  assert.match(ui, /showOwnerOverviewPreviewModal\('Outstanding Collection'/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("current period received preview lists session date and total", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ui, /'CURRENT PERIOD RECEIVED':'current-period'/);
  assert.match(ui, /function ownerOverviewShowCurrentPeriodPreview/);
  assert.match(ui, /Array\.isArray\(period\.sessions\)\?period\.sessions:\[\]/);
  assert.match(ui, /ownerOverviewPreviewRow\(String\(row\.date\|\|'-'\),fmtMoney\(row\.gross\|\|0\)/);
  assert.match(ui, /showOwnerOverviewPreviewModal\('Current Period Received'/);
});

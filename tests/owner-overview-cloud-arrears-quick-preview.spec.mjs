import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("cloud arrears preview lists bed remaining amount and due date", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ui, /'CLOUD ARREARS COLLECTION':'cloud-arrears'/);
  assert.match(ui, /function ownerOverviewShowCloudArrearsPreview/);
  assert.match(ui, /const collection=ownerOverviewCloudArrearsCollection\(\)/);
  assert.match(ui, /row\.bed\|\|'-',fmtMoney\(row\.remaining_arrears\|\|0\)/);
  assert.match(ui, /`due \$\{row\.due_date\|\|row\.promise_date\|\|'-'\}`/);
  assert.match(ui, /showOwnerOverviewPreviewModal\('Cloud Arrears Collection'/);
});

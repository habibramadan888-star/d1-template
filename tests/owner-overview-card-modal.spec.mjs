import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview cards open readonly quick preview modal", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ui, /function showOwnerOverviewPreviewModal/);
  assert.match(ui, /ownerOverviewPreviewModal/);
  assert.match(ui, /data-owner-overview-preview="\$\{previewKind\}"/);
  assert.match(ui, /showOwnerOverviewCardPreview\(kind\)/);
  assert.match(ui, /event\.key==='Escape'/);
  assert.match(ui, /event\.target===overlay/);
  assert.match(ui, /No items/);
});

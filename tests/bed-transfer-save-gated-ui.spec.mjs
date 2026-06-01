import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Bed Transfer save remains gated and cannot create fake production records", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /const BED_TRANSFER_WRITE_ENABLED=false/);
  assert.match(html, /BED_TRANSFER_WRITE_DISABLED_MESSAGE/);
  assert.match(html, /Bed transfer write is not enabled/);
  assert.match(html, /if\(isBedTransferWriteGated\(\)\)/);
  assert.match(html, /return;\s*\}\s*let e;/);
});

test("Bed Transfer export path blocks TF drafts while gated", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /state\.drafts\.some\(e=>e\.type==='TF'\)/);
  assert.match(html, /showStatus\(BED_TRANSFER_WRITE_DISABLED_MESSAGE,'warn'\)/);
  assert.match(html, /toast\(BED_TRANSFER_WRITE_DISABLED_MESSAGE,6000\)/);
});

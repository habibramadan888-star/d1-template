import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Bed Transfer save path is disabled by the phase 1 safety gate", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /const BED_TRANSFER_WRITE_ENABLED=false/);
  assert.match(html, /async function submitBedTransferEvent\(\)/);
  assert.match(html, /apiFetch\('\/api\/employee\/bed-transfers'/);
  assert.match(html, /if\(isBedTransferWriteGated\('TF'\)\)/);
});

test("Bed Transfer is recorded separately, not added to handover drafts", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(
    html,
    /if\(\$\(\'entryType\'\)\.value===\'TF\'\)\{\s*await submitBedTransferEvent\(\);\s*return;\s*\}/
  );
  assert.match(html, /Bed Transfer records are saved separately/);
  assert.match(html, /Bed transfer recorded \/ 换床记录已保存/);
  assert.match(html, /state\.drafts\.some\(e=>e\.type==='TF'(?:&&e\.sync_status!==\'SYNCED\')?\)/);
});

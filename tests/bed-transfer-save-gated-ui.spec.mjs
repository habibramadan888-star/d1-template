import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Bed Transfer save path is no longer a disabled fake write gate", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /const BED_TRANSFER_WRITE_ENABLED=true/);
  assert.match(html, /async function submitBedTransferEvent\(\)/);
  assert.match(html, /apiFetch\('\/api\/employee\/bed-transfers'/);
  assert.doesNotMatch(html, /const BED_TRANSFER_WRITE_ENABLED=false/);
});

test("Bed Transfer is submitted directly for owner review, not added to handover drafts", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(
    html,
    /if\(\$\(\'entryType\'\)\.value===\'TF\'\)\{\s*await submitBedTransferEvent\(\);\s*return;\s*\}/
  );
  assert.match(html, /Bed Transfer requests submit directly for owner review/);
  assert.match(html, /state\.drafts\.some\(e=>e\.type==='TF'\)/);
});

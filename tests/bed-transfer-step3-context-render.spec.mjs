import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Bed Transfer Step 3 uses dedicated system context", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /function renderBedTransferSystemContext/);
  assert.match(html, /data-bed-transfer-step3-context="true"/);
  assert.match(html, /Current occupant/);
  assert.match(html, /Original check-in date/);
  assert.match(html, /Rent period/);
  assert.match(html, /Deposit/);
  assert.match(html, /Current arrears/);
  assert.match(html, /TTLock record/);
  assert.match(html, /New bed status/);
  assert.match(html, /New bed rent/);
  assert.match(html, /Rent difference review/);
});

test("generic context is bypassed for Bed Transfer", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /if\(\$\(\'entryType\'\)\?\.value===\'TF\'\)/);
  assert.match(html, /renderBedTransferSystemContext\(\)/);
});

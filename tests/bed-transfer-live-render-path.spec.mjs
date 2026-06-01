import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Bed Transfer live render path mounts the dedicated form into Step 2", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /id="bedTransferStep2Mount"/);
  assert.match(html, /data-bed-transfer-step2="true"/);
  assert.match(html, /function ensureBedTransferStep2Mount/);
  assert.match(html, /mount\.appendChild\(fields\)/);
  assert.match(html, /visible\(\['genericBedFieldWrap'\],type!=='TF'\)/);
  assert.match(html, /visible\(\['transferFields'\],type==='TF'\)/);
});

test("Bed Transfer live path keeps production cutover blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

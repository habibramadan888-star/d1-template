import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee Export tab and visible Export page are removed", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.doesNotMatch(html, /data-view="export"/);
  assert.doesNotMatch(html, /id="view-export"/);
  assert.doesNotMatch(html, /<span class="tab-cn">导出<\/span><span class="en">EXPORT<\/span>/);
  assert.match(html, /id="employeeExportBuffer" class="hidden employee-export-buffer"/);
});

test("legacy employee export route redirects to Follow-up", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /path === "\/employee\/export"/);
  assert.match(worker, /redirectToPath\(request, "\/employee#arrears"\)/);
});

test("owner-side arrears WhatsApp export remains intact", async () => {
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ownerJs, /function exportArrearsWhatsApp/);
  assert.match(ownerJs, /function buildArrearsWhatsAppText/);
  assert.match(ownerJs, /ownerArrearsExportRows/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

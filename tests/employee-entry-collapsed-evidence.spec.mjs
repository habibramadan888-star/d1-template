import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";

test("entry system evidence sections are default-collapsed details panels", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /\.entry-evidence-collapse/);
  assert.match(html, /data-entry-evidence-default-collapsed="true"/);
  assert.match(html, /function employeeEvidenceShell\(titleEn,titleZh,bodyHtml\)/);
  assert.match(html, /<details class="entry-evidence-collapse"/);
  assert.doesNotMatch(html, /<details class="entry-evidence-collapse" open/);
});

test("verify context and bed transfer evidence are rendered through collapsed shell", async () => {
  const html = await readFile(employeePath, "utf8");
  const finalRenderContext = html.slice(html.lastIndexOf("function renderContext()"));
  const finalBedTransfer = html.slice(html.lastIndexOf("function renderBedTransferSystemContext()"));

  assert.match(finalRenderContext, /employeeEvidenceShell\('Verify System Context','系统核对信息',body\)/);
  assert.match(finalBedTransfer, /employeeEvidenceShell\('Bed Transfer Evidence','换床核对信息',body\)/);
  assert.match(finalRenderContext, /Historical Arrears Evidence/);
  assert.match(finalRenderContext, /Deposit Context/);
  assert.match(finalRenderContext, /Date Anchors/);
  assert.match(finalRenderContext, /System Rent Context/);
  assert.match(finalBedTransfer, /Card Evidence/);
});

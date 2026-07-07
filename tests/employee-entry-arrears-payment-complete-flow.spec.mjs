import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("arrears payment selection uses cloud arrears and not browser event objects", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /function selectEmployeeCloudArrears\(taskOrRef\)/);
  assert.match(html, /selectEmployeeCloudArrears\(btn\.getAttribute\('data-select-arrears-task'\)\|\|''\)/);
  assert.match(html, /const task=taskOverride&&typeof taskOverride==='object'&&employeeTaskRef\(taskOverride\)\?taskOverride:selectedTask\(\)/);
  assert.match(html, /\$\(\'linkedTaskId\'\)\.value=employeeTaskRef\(task\)/);
  assert.match(html, /state\.selectedArrearsTaskRef=ref/);
});

test("arrears payment hides rent-period and monthly-rent fields", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /function employeeApplyArrearsPaymentLayout\(type\)/);
  assert.match(html, /\['listPrice','periodStart','periodEnd','periodDays','periodDue','due','paid','entryClr'\]/);
  assert.match(html, /\$\(\'periodStep\'\)\?\.classList\.add\('hidden'\)/);
  assert.match(html, /\$\(\'periodDue\'\)\.value=''/);
  assert.match(html, /Arrears Payment uses cloud arrears only\. It does not use rent period or monthly rent/);
});

test("arrears payment shows repayment-specific amounts and settlement status", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /function renderArrearsPaymentPanel\(\)/);
  assert.match(html, /Selected Cloud Arrears/);
  assert.match(html, /Original Arrears/);
  assert.match(html, /Already Paid/);
  assert.match(html, /Remaining Before/);
  assert.match(html, /This Payment/);
  assert.match(html, /Remaining After/);
  assert.match(html, /Settlement Status/);
  assert.match(html, /const status=after<=0\?'settled':'partial'/);
});

test("arrears payment payload keeps arrears ref and settlement fields", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /arrears_ref:type==='AP'\?\$\(\'linkedTaskId\'\)\.value:''/);
  assert.match(html, /original_arrears_id:type==='AP'\?\$\(\'linkedTaskId\'\)\.value:''/);
  assert.match(html, /payment_amount:type==='AP'\?amt:0/);
  assert.match(html, /remaining_arrears_after_payment:type==='AP'\?apRemaining:0/);
  assert.match(html, /settlement_status:type==='AP'\?\(apRemaining<=0\?'settled':'partial'\):''/);
});

test("arrears payment keeps Add to Session controls visible after selected summary", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /const type=\$\(\'entryType\'\)\?\.value\|\|''/);
  assert.match(html, /const apPanel=\$\(\'arrearsPaymentCorePanel\'\)/);
  assert.match(html, /const legacyFlowEnd=type==='AP'/);
  assert.match(html, /const flowEnd=templateMount\|\|legacyFlowEnd/);
  assert.match(html, /\?\(apPanel\|\|fieldWrap\('amount'\)/);
  assert.match(html, /if\(flowEnd&&mount\.previousElementSibling!==flowEnd\)flowEnd\.insertAdjacentElement\('afterend',mount\)/);
  assert.match(html, /mount\.appendChild\(validation\)/);
  assert.match(html, /mount\.appendChild\(actionRow\)/);
  assert.match(html, /renderEmployeeButtonLabel\('Add to Session'/);
});

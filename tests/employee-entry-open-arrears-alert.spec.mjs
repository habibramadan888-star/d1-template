import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";

test("open arrears alert is rendered in the required input area, not reference", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /function employeeEnsureOpenArrearsMount\(\)/);
  assert.match(html, /id='openArrearsCoreAlert'|id="openArrearsCoreAlert"/);
  assert.match(html, /dataset\.openArrearsAlert='true'/);
  assert.match(html, /Open Arrears Alert/);
  assert.match(html, /No Open Arrears/);
  assert.match(html, /Collect Arrears First/);
  assert.match(html, /Remaining \$\{fmtMoney\(m\.remaining\)\} AED/);
  assert.match(html, /Original Date/);
  assert.match(html, /Original Type/);
  assert.match(html, /Original Amount/);
  assert.match(html, /Already Paid/);
  assert.match(html, /Due Date \/ Promise Date/);
  assert.match(html, /Original Note/);
});

test("arrears payment can select an open arrears task from the core alert", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /data-select-arrears-task/);
  assert.match(html, /Select Arrears/);
  assert.match(html, /setEntryType\('AP'\)/);
  assert.match(html, /populateTaskSelect\(\)/);
  assert.match(html, /selectEmployeeCloudArrears\(btn\.getAttribute\('data-select-arrears-task'\)\|\|''\)/);
  assert.match(html, /function selectEmployeeCloudArrears\(taskOrRef\)/);
  assert.match(html, /const task=typeof taskOrRef==='string'\?findEmployeeTaskByRef\(taskOrRef\):taskOrRef/);
});

test("add to session controls remain in the required input flow", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /function employeePrioritizeEntryInputs\(\)/);
  assert.match(html, /employeeRequiredActionMount/);
  assert.match(html, /Required Input Actions/);
  assert.match(html, /flowEnd\.insertAdjacentElement\('afterend',mount\)/);
  assert.match(html, /mount\.appendChild\(validation\)/);
  assert.match(html, /mount\.appendChild\(actionRow\)/);
  assert.match(html, /employeePrioritizeEntryInputs\(\)/);
  assert.match(html, /employeeRenderOpenArrearsAlert\(\)/);
});

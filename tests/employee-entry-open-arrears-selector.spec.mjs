import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("open arrears selector uses cloud arrears ref, not task_id only", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /function employeeTaskRef\(t\)/);
  assert.match(html, /t\?\.task_id\|\|t\?\.arrears_ref\|\|t\?\.original_arrears_id\|\|t\?\.id/);
  assert.match(html, /function findEmployeeTaskByRef\(ref\)/);
  assert.match(html, /employeeTaskRef\(t\)/);
  assert.match(html, /<option value="\$\{esc\(employeeTaskRef\(t\)\)\}"/);
  assert.match(html, /selectedTask\(\)\{\s*return findEmployeeTaskByRef/);
});

test("select arrears alert writes selected cloud arrears into current AP form state", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /data-select-arrears-task="\$\{esc\(m\.ref\)\}"/);
  assert.match(html, /function selectEmployeeCloudArrears\(taskOrRef\)/);
  assert.match(html, /selectEmployeeCloudArrears\(btn\.getAttribute\('data-select-arrears-task'\)\|\|''\)/);
  assert.match(html, /\$\(\'linkedTaskId\'\)\.value=employeeTaskRef\(task\)/);
  assert.match(html, /applyLinkedTask\(task\)/);
  assert.match(html, /state\.selectedArrearsTaskRef=ref/);
  assert.match(html, /Selected Cloud Arrears/);
});

test("linkedTaskId change event cannot be mistaken for a cloud arrears task", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /\$\(\'linkedTaskId\'\)\.addEventListener\('change',applyLinkedTask\)/);
  assert.match(html, /const task=taskOverride&&typeof taskOverride==='object'&&employeeTaskRef\(taskOverride\)\?taskOverride:selectedTask\(\)/);
});

test("arrears payment anchor includes before and after remaining balances", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /remaining_arrears_before_payment:type==='AP'\?apBefore:0/);
  assert.match(html, /remaining_arrears_after_payment:type==='AP'\?apRemaining:0/);
  assert.match(html, /remaining_arrears_before_payment:Math\.max\(0,original-already\)/);
  assert.match(html, /settlement_status:type==='AP'\?\(apRemaining<=0\?'settled':'partial'\):''/);
});

test("arrears payment explains settled or voided cloud arrears when no open item exists", async () => {
  const html = await readFile(htmlPath, "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /closed_tasks:closedTasks/);
  assert.match(html, /closedTasks:\[\]/);
  assert.match(html, /state\.closedTasks=data\.closed_tasks\|\|data\.closedTasks\|\|\[\]/);
  assert.match(html, /function employeeClosedArrearsForBed\(bed\)/);
  assert.match(html, /function employeeClosedArrearsMessage\(bed\)/);
  assert.match(html, /Last arrears was settled or voided/);
});

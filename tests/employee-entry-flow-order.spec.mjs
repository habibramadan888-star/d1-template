import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";

test("employee Entry required input flow is ordered before reference sections", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /function employeeEnsureOpenArrearsMount\(\)/);
  assert.match(html, /const step2=employeeFindEntryStep\(2\)/);
  assert.match(html, /step2\.insertAdjacentElement\('afterend',box\)/);

  assert.match(html, /function employeePrioritizeEntryInputs\(\)/);
  assert.match(html, /const legacyFlowEnd=type==='AP'/);
  assert.match(html, /let flowEnd=templateMount\|\|legacyFlowEnd;/);
  assert.match(html, /if\(exceptionVisible&&exceptionStep&&flowEnd!==exceptionStep\)/);
  assert.match(html, /flowEnd\.insertAdjacentElement\('afterend',mount\)/);
  assert.match(html, /mount\.appendChild\(validation\)/);
  assert.match(html, /mount\.appendChild\(actionRow\)/);
  assert.match(html, /mount\.insertAdjacentElement\('afterend',step3\)/);
  assert.match(html, /step3\.insertAdjacentElement\('afterend',step8\)/);
});

test("visible step labels follow the required-input sequence", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /function employeeRenumberRequiredFlowTitles\(\)/);
  assert.match(html, /employeeSetStepTitle\(\$\(\'paymentStep\'\),'3','Step 3 \\u00b7 Payment Method'/);
  assert.match(html, /employeeSetStepTitle\(\$\(\'amount\'\)\?\.closest\('\.step'\),'4','Step 4 \\u00b7 Enter Amount'/);
  assert.match(html, /employeeSetStepTitle\(\$\(\'periodStep\'\),'5','Step 5 \\u00b7 Confirm Period'/);
  assert.match(html, /Reference \/ Verify System Context/);
  assert.match(html, /step3Marker\.textContent='Ref'/);
  assert.match(html, /step8Marker\.textContent='Review'/);
});

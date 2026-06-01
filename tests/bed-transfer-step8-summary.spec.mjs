import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.lastIndexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("Bed Transfer Step 8 uses a dedicated transfer summary before generic entry fields", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const renderSummary = extractFunction(html, "renderSummary");

  const tfBranch = renderSummary.slice(renderSummary.indexOf("if(type==='TF')"), renderSummary.indexOf("const period="));
  assert.match(tfBranch, /data-bed-transfer-step8-summary="true"/);
  assert.match(tfBranch, /Event \/ 事件/);
  assert.match(tfBranch, /Transfer \/ 换床/);
  assert.match(tfBranch, /Fee \/ 费用/);
  assert.match(tfBranch, /Review flags \/ 需核对项/);
  assert.match(tfBranch, /Accounting effect \/ 会计影响/);
  assert.match(tfBranch, /No occupancy, deposit, arrears, or TTLock mutation/);
  assert.match(tfBranch, /return;/);
});

test("Bed Transfer Step 8 branch does not show generic payment or arrears fields", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const renderSummary = extractFunction(html, "renderSummary");
  const tfBranch = renderSummary.slice(renderSummary.indexOf("if(type==='TF')"), renderSummary.indexOf("const period="));

  assert.doesNotMatch(tfBranch, /PAYMENT METHOD|付款方式|浠樻/);
  assert.doesNotMatch(tfBranch, /DUE\/PAID|应收|搴旀敹/);
  assert.doesNotMatch(tfBranch, /Billing period|账期|璐︽湡/);
  assert.doesNotMatch(tfBranch, /Deposit balance|押金余额|鎶奸噾浣欓/);
  assert.doesNotMatch(tfBranch, /Arrears task|欠款任务|娆犳/);
});

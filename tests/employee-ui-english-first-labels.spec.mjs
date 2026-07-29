import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("employee follow-up status select uses English-first labels", async () => {
  const html = await readFile(htmlPath, "utf8");
  const card = extractFunction(html, "followupCard");

  for (const label of [
    "Pending Follow-up",
    "Contacted",
    "Promise to Pay",
    "Unable to Contact",
    "Escalate to Owner"
  ]) {
    assert.match(html, new RegExp(label));
    assert.match(card, new RegExp("esc\\(s\\.en\\).*esc\\(s\\.cn\\)"));
  }
  assert.doesNotMatch(card, /pending_followup \/ system status/);
  assert.doesNotMatch(card, />\$\{esc\(currentStatus\)\} \/ system status</);
});

test("employee raw follow-up enums are mapped before display", async () => {
  const html = await readFile(htmlPath, "utf8");
  const meta = extractFunction(html, "employeeFollowupStatusMeta");
  const label = extractFunction(html, "employeeFollowupStatusLabel");

  assert.match(html, /EMPLOYEE_FOLLOWUP_STATUS_OPTIONS/);
  assert.match(html, /pending_followup/);
  assert.match(html, /promise_to_pay/);
  assert.match(html, /needs_review/);
  assert.match(meta, /aliases\.includes\(lower\)/);
  assert.match(label, /\$\{meta\.en\} \/ \$\{meta\.cn\}/);
});

test("employee primary action labels remain English-first in System cards", async () => {
  const html = await readFile(htmlPath, "utf8");
  const card = extractFunction(html, "followupCard");

  assert.match(card, /renderEmployeeButtonLabel\('Save Follow-up','保存跟进'\)/);
  assert.match(card, /renderEmployeeButtonLabel\('Go Collect Rent','去收租'\)/);
  assert.match(card, /Expand Details \/ \\u5c55\\u5f00\\u8be6\\u60c5/);
  assert.match(card, /Status \/ \\u72b6\\u6001/);
});

test("employee Entry hierarchy renders English as the primary label", async () => {
  const html = await readFile(htmlPath, "utf8");

  for (const copy of [
    '<span class="en">Entry</span><span class="tab-cn"',
    '<span class="en">Follow-up</span><span class="tab-cn"',
    '<span class="en">System</span><span class="tab-cn"',
    "employeeUiPair('Current Session Summary'",
    "employeeUiPair('Add Entry'",
    "['Step 1 · Select Event Type'",
    "['Cash Handover'",
    "renderEmployeeButtonLabel('Upload Session'",
    "renderEmployeeButtonLabel('Reload Cards'"
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(html, /Current Session Summary<\/span>/);
  assert.doesNotMatch(html, /Add Entry<\/span>/);
  assert.doesNotMatch(html, /<span class="tab-cn">[^<]+<\/span><span class="en">/);
});

test("employee Entry visible text audit covers screenshot problem areas", async () => {
  const html = await readFile(htmlPath, "utf8");

  for (const copy of [
    "Bed Check",
    "Historical Arrears",
    "Date Anchors",
    "System Rent",
    "Blocked:",
    "Bed is required",
    "Amount must be greater than 0",
    "No Records",
    "Select a type, fill the form, then add to session",
    "Expected / Included",
    "Rent Period",
    "Arrears Task"
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const badCopy of [
    "阻断：必须填写床位",
    "阻断：AMT 必须大于 0",
    "现金结余 CASH HANDOVER",
    "已选事件<span class=\"label-en\">SELECTED EVENT",
    "<span>收租</span><small>RENT</small>"
  ]) {
    assert.doesNotMatch(html, new RegExp(badCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("employee buttons use English-first helper and do not render Chinese-first upload", async () => {
  const html = await readFile(htmlPath, "utf8");

  for (const copy of [
    "function renderEmployeeButtonLabel(en,cn)",
    "renderEmployeeButtonLabel('Upload Session'",
    "renderEmployeeButtonLabel('Preview'",
    "renderEmployeeButtonLabel('WhatsApp Export'",
    "renderEmployeeButtonLabel('Reset'",
    "renderEmployeeButtonLabel('Add to Session'",
    "renderEmployeeButtonLabel('New Session'",
    "renderEmployeeButtonLabel('Reload Cards'",
    "renderEmployeeButtonLabel('Save Follow-up'",
    "renderEmployeeButtonLabel('Go Collect Rent'",
    "renderEmployeeButtonLabel('Cash'",
    "renderEmployeeButtonLabel('Bank'",
    '<span class="employee-btn-main">Upload Session</span><span class="label-en">确认本票并上传云端</span>'
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const badCopy of [
    "确认本票并上传云端<span class=\"label-en\">UPLOAD SESSION</span>",
    "导出交接<span class=\"label-en\">EXPORT HANDOVER</span>",
    "预览<span class=\"label-en\">PREVIEW</span>",
    "清空<span class=\"label-en\">RESET</span>",
    "正在登录<span class=\"label-en\">SIGNING IN</span>",
    "Save Follow-up /",
    "Go Collect Rent /",
    "现金<span>CASH</span>",
    "银行<span>BANK</span>"
  ]) {
    assert.doesNotMatch(html, new RegExp(badCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("employee payment method buttons are English-first", async () => {
  const html = await readFile(htmlPath, "utf8");

  for (const copy of [
    '<button type="button" class="pay-option active" data-pay="C"><span class="employee-btn-main">Cash</span><span class="label-en">现金</span></button>',
    '<button type="button" class="pay-option" data-pay="B"><span class="employee-btn-main">Bank</span><span class="label-en">银行</span></button>',
    "cashPay.innerHTML=renderEmployeeButtonLabel('Cash'",
    "bankPay.innerHTML=renderEmployeeButtonLabel('Bank'"
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(html, /<button[^>]+data-pay="C"[^>]*>\s*现金\s*<span>\s*CASH\s*<\/span>/);
  assert.doesNotMatch(html, /<button[^>]+data-pay="B"[^>]*>\s*银行\s*<span>\s*BANK\s*<\/span>/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

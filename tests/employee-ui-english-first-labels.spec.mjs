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

  assert.match(card, /Save Follow-up \/ \\u4fdd\\u5b58\\u8ddf\\u8fdb/);
  assert.match(card, /Go Collect Rent \/ \\u53bb\\u6536\\u79df/);
  assert.match(card, /Expand Details \/ \\u5c55\\u5f00\\u8be6\\u60c5/);
  assert.match(card, /Status \/ \\u72b6\\u6001/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});


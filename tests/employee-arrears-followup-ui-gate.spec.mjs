import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractAsyncFunction(source, name) {
  const start = source.lastIndexOf(`async function ${name}(`);
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

test("employee directive follow-up uses gated directive endpoint and handles 409 honestly", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const save = extractAsyncFunction(html, "saveEmployeeDirectiveFollowup");

  assert.match(save, /\/api\/employee\/arrears\/directives\/\$\{encodeURIComponent\(taskId\)\}\/followup/);
  assert.match(save, /promised_payment_date/);
  assert.match(save, /followup_note/);
  assert.match(save, /production_write_approval_required/);
  assert.match(save, /真实反馈写入未启用；当前不会写入生产/);
  assert.doesNotMatch(save, /\/api\/arrear_tasks\/update/);
  assert.doesNotMatch(save, /promised_amount|promise_amount|close_status|arrear_amount/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

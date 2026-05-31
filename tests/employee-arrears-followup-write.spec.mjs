import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}(`);
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

test("employee follow-up API requires date and idempotency key", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const fn = extractFunction(worker, "handleEmployeeArrearsDirectiveFollowup");

  assert.match(worker, /employeeDirectiveFollowup\s*=\s*path\.match/);
  assert.match(worker, /api\\\/employee\\\/arrears\\\/directives/);
  assert.match(worker, /handleEmployeeArrearsDirectiveFollowup/);
  assert.match(fn, /idempotency_key_required/);
  assert.match(fn, /promised_payment_date_required/);
  assert.match(fn, /followup_note/);
});

test("employee follow-up cannot submit amount or close task and writes are approval gated", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const fn = extractFunction(worker, "handleEmployeeArrearsDirectiveFollowup");

  assert.match(fn, /promised_amount_not_allowed/);
  assert.doesNotMatch(fn, /arrear_amount=\?/);
  assert.doesNotMatch(fn, /close_status=/);
  assert.match(fn, /if\(!arrearsDirectiveWriteApproved\(env\)\)return arrearsDirectiveApprovalRequired/);
  assert.match(fn, /directive_status='followed_up'/);
  assert.match(fn, /employee\.arrears\.directive\.followup/);
});

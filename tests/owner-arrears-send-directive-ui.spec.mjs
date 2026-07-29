import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const start = source.lastIndexOf(`function ${name}(`);
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

test("send directive UI uses the approved persisted dispatch contract without requested date input", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const controls = extractLastFunction(js, "renderOwnerArrearsControls");
  const send = extractLastFunction(js, "sendArrearDirectives");

  assert.doesNotMatch(controls, /arrearDirectiveDue/);
  assert.doesNotMatch(send, /arrearDirectiveDue|prompt\(/);
  assert.match(send, /请先选择要下发的欠款/);
  assert.match(send, /apiFetch\('\/api\/boss\/arrears\/directives'/);
  assert.match(send, /Idempotency-Key/);
  assert.doesNotMatch(send, /\/api\/arrear_tasks\/directive/);
});

test("send directive performs the gated write and refreshes canonical arrears state", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const send = extractLastFunction(js, "sendArrearDirectives");

  assert.match(send, /method:'POST'/);
  assert.match(send, /assigned_employee_id/);
  assert.match(send, /approval_required/);
  assert.match(send, /loadArrearsForOwner/);
});

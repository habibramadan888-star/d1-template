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

test("owner batch control labels selected rows as real dispatch when write gate is approved", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const updateButton = extractLastFunction(js, "updateArrearDirectiveButtonState");
  const controls = extractLastFunction(js, "renderOwnerArrearsControls");

  assert.match(updateButton, /真实下发员工端/);
  assert.match(updateButton, /checkedCount/);
  assert.match(controls, /真实下发员工端/);
});

test("owner real dispatch action calls the persisted directive write API through the write gate", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const send = extractLastFunction(js, "sendArrearDirectives");

  assert.match(send, /apiFetch\('\/api\/boss\/arrears\/directives'/);
  assert.match(send, /method:'POST'/);
  assert.match(send, /Idempotency-Key/);
  assert.match(send, /assigned_employee_id/);
  assert.match(send, /approval_required/);
  assert.match(send, /created_count/);
  assert.match(send, /skipped_already_assigned_count/);
  assert.match(send, /blocked_count/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

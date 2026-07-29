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

test("owner send directive action calls the gated real dispatch endpoint", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const send = extractLastFunction(js, "sendArrearDirectives");

  assert.match(send, /apiFetch\('\/api\/boss\/arrears\/directives'/);
  assert.match(send, /method:'POST'/);
  assert.match(send, /Idempotency-Key/);
  assert.match(send, /approval_required/);
  assert.match(send, /当前未写入员工端/);
  assert.doesNotMatch(send, /\/api\/arrear_tasks\/directive/);
  assert.doesNotMatch(send, /arrearDirectiveDue|prompt\(/);
});

test("readonly admin write guard remains in place", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const send = extractLastFunction(js, "sendArrearDirectives");
  const controls = extractLastFunction(js, "renderOwnerArrearsControls");

  assert.match(send, /if\(!isOwnerWriteRole\(\)\)return/);
  assert.match(controls, /isOwnerWriteRole\(\)\?/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

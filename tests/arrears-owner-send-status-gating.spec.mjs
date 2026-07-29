import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const asyncNeedle = `async function ${name}(`;
  const plainNeedle = `function ${name}(`;
  const start = Math.max(source.lastIndexOf(asyncNeedle), source.lastIndexOf(plainNeedle));
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

test("owner send action cannot show real success while production write gate is off", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const send = extractLastFunction(js, "sendArrearDirectives");

  assert.match(send, /真实下发未启用/);
  assert.match(send, /dry-run/);
  assert.match(send, /未写入员工端/);
  assert.doesNotMatch(send, /已下发成功|Directive sent/);
});

test("owner send dry-run uses selected rows and never calls write APIs", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const send = extractLastFunction(js, "sendArrearDirectives");

  assert.match(send, /ownerArrearsSelectedRows\(\)/);
  assert.match(send, /buildArrearsWhatsAppText\(rows\)/);
  assert.match(send, /showArrearsWhatsAppFallback/);
  assert.doesNotMatch(send, /apiFetch\(|method:\s*['"]POST['"]|\/api\/arrear_tasks\/directive|\/api\/boss\/arrears\/directives/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

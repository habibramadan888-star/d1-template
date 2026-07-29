import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const signature = `function ${name}(`;
  const start = source.lastIndexOf(signature);
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

test("directive note input defaults blank when no saved note exists", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");
  const normalize = extractLastFunction(html, "normalizeEmployeeDirective");

  assert.match(normalize, /employeeDirectiveEditableNote/);
  assert.match(card, /employeeDirectiveEditableNote\(d\.followup_note\)/);
  assert.match(card, /placeholder="Note \/ 备注"/);
});

test("QA smoke text is filtered from default employee note input", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const demoFilter = extractLastFunction(html, "isDirectiveDemoNote");

  assert.match(demoFilter, /QA\\s\*smoke/);
  assert.match(demoFilter, /production-linked minimal validation/);
  assert.doesNotMatch(html, /QA smoke：客户承诺测试日期付款，仅用于 production-linked 最小验证/);
});

test("saved note model remains available for persisted-state checks", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /serverOriginalFollowupNote:followupNote/);
  assert.match(html, /employeeDirectiveOriginalValues/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

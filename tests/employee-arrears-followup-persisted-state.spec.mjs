import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name, asyncKeyword = false) {
  const signature = `${asyncKeyword ? "async " : ""}function ${name}(`;
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

test("employee directives keep server original feedback values for persisted-state checks", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const normalize = extractLastFunction(html, "normalizeEmployeeDirective");

  assert.match(normalize, /serverOriginalPromisedDate/);
  assert.match(normalize, /serverOriginalFollowupNote/);
  assert.match(html, /function employeeDirectiveHasPersistedFeedback/);
  assert.match(html, /function employeeDirectiveOriginalValues/);
});

test("saved feedback with unchanged inputs does not enter production-write gate path", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const save = extractLastFunction(html, "saveEmployeeDirectiveFollowup", true);

  assert.match(save, /hasPersisted&&!dirty/);
  assert.match(save, /updateEmployeeDirectivePersistedState\(taskId\)/);
  assert.match(save, /return;\s*}\s*if\(!promised\)/s);
  assert.match(save, /production_write_approval_required/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

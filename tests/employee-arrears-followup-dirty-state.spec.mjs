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

test("dirty state compares current inputs against persisted server values", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const dirty = extractLastFunction(html, "employeeDirectiveIsDirty");

  assert.match(dirty, /employeeDirectiveCurrentValues\(d\.task_id\)/);
  assert.match(dirty, /employeeDirectiveOriginalValues\(d\)/);
  assert.match(dirty, /current\.promised!==original\.promised/);
  assert.match(dirty, /current\.note!==original\.note/);
});

test("input changes update persisted/dirty state instead of blindly marking unsaved", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const bind = extractLastFunction(html, "bindEmployeeDirectiveActions");
  const update = extractLastFunction(html, "updateEmployeeDirectivePersistedState");

  assert.match(bind, /closest\('\[data-directive-task-id\]'\)/);
  assert.match(bind, /updateEmployeeDirectivePersistedState\(taskId\)/);
  assert.match(update, /directiveDirty/);
  assert.match(update, /hasPersisted&&!dirty/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

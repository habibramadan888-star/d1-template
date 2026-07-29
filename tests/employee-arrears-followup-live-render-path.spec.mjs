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

test("employee directive card stores persisted server values for live render path", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /serverOriginalPromisedDate:promisedPaymentDate\.trim\(\)/);
  assert.match(html, /serverOriginalFollowupNote:followupNote\.trim\(\)/);
  assert.match(html, /data-directive-task-id=/);
  assert.match(html, /data-directive-edit/);
});

test("final live binding refreshes persisted and dirty state after render", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const bind = extractLastFunction(html, "bindEmployeeDirectiveActions");

  assert.match(bind, /updateEmployeeDirectivePersistedState\(taskId\)/);
  assert.match(bind, /\(state\.employeeDirectives\|\|\[\]\)\.forEach/);
  assert.match(bind, /data-save-directive-follow/);
});

test("final save handler treats saved unchanged feedback as local no-op", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const save = extractLastFunction(html, "saveEmployeeDirectiveFollowup");

  const noOpIndex = save.indexOf("if(hasPersisted&&!dirty)");
  const apiIndex = save.indexOf("apiFetch(");
  assert.ok(noOpIndex > -1, "saved unchanged branch must exist");
  assert.ok(apiIndex > -1, "write path must still exist for changed input");
  assert.ok(noOpIndex < apiIndex, "saved unchanged branch must return before apiFetch");
  assert.match(save, /updateEmployeeDirectivePersistedState\(taskId\)/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

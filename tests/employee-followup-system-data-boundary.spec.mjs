import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
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

test("Follow-up keeps the boss directive data source only", async () => {
  const html = await readFile(htmlPath, "utf8");
  const loadDirectives = extractFunction(html, "loadEmployeeArrearsDirectives");

  assert.match(loadDirectives, /\/api\/employee\/arrears\/directives/);
  assert.doesNotMatch(loadDirectives, /\/api\/arrear_tasks/);
});

test("System keeps the existing read-only System Reminders data source", async () => {
  const html = await readFile(htmlPath, "utf8");
  const loadTasks = extractFunction(html, "loadTasks");

  assert.match(loadTasks, /\/api\/arrear_tasks/);
  assert.match(loadTasks, /populateTaskSelect\(\)/);
  assert.match(loadTasks, /renderTasks\(\)/);
  assert.doesNotMatch(loadTasks, /\/api\/employee\/arrears\/directives/);
});

test("Entry, Follow-up, and System containers are isolated", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /<section id="view-entry"/);
  assert.match(html, /<section id="view-arrears" class="hidden employee-followup-view employee-panel">/);
  assert.match(html, /<section id="view-system" class="hidden employee-system-view employee-panel">/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

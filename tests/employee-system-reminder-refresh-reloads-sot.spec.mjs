import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("refresh reloads SOT reminders and no longer rebuilds System from local TTLock cards", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const refresh = extractFunction(html, "refreshFollowup");
  const showView = extractFunction(html, "showEmployeeView");

  assert.match(refresh, /loadEmployeeArrearsDirectives\(false\)/);
  assert.match(refresh, /loadEmployeeSystemReminders\(false\)/);
  assert.doesNotMatch(refresh, /loadLock\(\)/);
  assert.doesNotMatch(refresh, /loadTasks\(/);
  assert.match(showView, /if\(next==='system'\)loadEmployeeSystemReminders\(true\)/);
});


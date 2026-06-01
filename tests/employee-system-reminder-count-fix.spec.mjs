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

test("materialized TTLock arrears keep TTLock source in employee reminders", async () => {
  const html = await readFile(htmlPath, "utf8");
  const due = extractFunction(html, "dueFromLockCards");
  const history = extractFunction(html, "historyFollowupItems");

  assert.match(due, /source_type:'ttlock_expired_unpaid'/);
  assert.match(history, /const sourceType=normalizeEmployeeReminderSourceType\(t\)/);
  assert.match(history, /source:sourceType==='ttlock_expired_unpaid'\?'ttlock'/);
  assert.match(history, /source_type:sourceType/);
});

test("System Reminders are not derived from boss assigned directive count", async () => {
  const html = await readFile(htmlPath, "utf8");
  const render = extractFunction(html, "renderTasks");

  assert.match(render, /const items=currentFollowupItems\(\)/);
  assert.doesNotMatch(render, /state\.employeeDirectives\.filter/);
  assert.doesNotMatch(render, /employeeDirectives\.length/);
});

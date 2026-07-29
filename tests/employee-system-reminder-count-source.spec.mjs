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

test("system reminder source model separates TTLock from existing arrears", async () => {
  const html = await readFile(htmlPath, "utf8");
  const normalize = extractFunction(html, "normalizeEmployeeReminderSourceType");
  const ttlock = extractFunction(html, "isEmployeeTtlockReminder");
  const arrears = extractFunction(html, "isEmployeeSystemArrearsReminder");

  assert.match(normalize, /raw\.includes\('ttlock'\)/);
  assert.match(normalize, /'existing_arrears_record'/);
  assert.match(ttlock, /'ttlock_expired_unpaid'/);
  assert.match(arrears, /&&!isEmployeeTtlockReminder\(item\)/);
});

test("rendered System Reminders KPIs count by normalized active source_type", async () => {
  const html = await readFile(htmlPath, "utf8");
  const render = extractFunction(html, "renderTasks");

  assert.match(render, /items\.filter\(isEmployeeSystemArrearsReminder\)/);
  assert.match(render, /items\.filter\(isEmployeeTtlockReminder\)/);
  assert.doesNotMatch(render, /x=>x\.source==='history'\|\|x\.source==='history_unmatched'/);
  assert.doesNotMatch(render, /x=>x\.source==='ttlock'/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

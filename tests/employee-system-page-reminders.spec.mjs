import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} must exist`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} must exist after ${startMarker}`);
  return source.slice(start, end);
}

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

test("System page owns the System Reminders container and refresh action", async () => {
  const html = await readFile(htmlPath, "utf8");
  const system = extractBetween(html, 'id="view-system"', "</main>");

  assert.match(system, /System \/ 系统/);
  assert.match(system, /System reminders \/ 系统提醒/);
  assert.match(system, /id="taskList"/);
  assert.match(system, /id="btnRefreshTasks"/);
});

test("System reminder renderer preserves all existing reminder families", async () => {
  const html = await readFile(htmlPath, "utf8");
  const renderTasks = extractFunction(html, "renderTasks");

  assert.match(renderTasks, /System Reminders/);
  assert.match(renderTasks, /TTLOCK OVERDUE/);
  assert.match(renderTasks, /ARREARS/);
  assert.match(renderTasks, /AMOUNT/);
  assert.match(renderTasks, /isEmployeeTtlockReminder/);
  assert.match(renderTasks, /isEmployeeSystemArrearsReminder/);
});

test("System reminder source sanitizers remain available", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /function stripTtlockAccountPhoneForEmployee/);
  assert.match(html, /stripTtlockAccountPhoneForEmployee\(item\.lock_remark/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

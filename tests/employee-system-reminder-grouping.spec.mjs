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

test("System reminders render grouped sections by SOT bucket", async () => {
  const html = await readFile(htmlPath, "utf8");
  const group = extractFunction(html, "groupEmployeeSystemReminders");
  const renderGroups = extractFunction(html, "renderEmployeeSystemReminderGroups");
  const renderTasks = extractFunction(html, "renderTasks");

  assert.match(group, /key:'overdue'/);
  assert.match(group, /key:'due_today'/);
  assert.match(group, /key:'due_soon'/);
  assert.match(group, /key:'required'/);
  assert.match(group, /normalizeEmployeeReminderBucket\(item\)/);
  assert.match(renderGroups, /<details class="system-reminder-group/);
  assert.match(renderGroups, /data-system-reminder-group/);
  assert.match(renderGroups, /system-reminder-group-count/);
  assert.match(renderTasks, /renderEmployeeSystemReminderGroups\(items\)/);
  assert.doesNotMatch(renderTasks, /items\.map\(followupCard\)\.join\(''\)/);
});

test("Overdue opens by default and due soon collapses by default", async () => {
  const html = await readFile(htmlPath, "utf8");
  const group = extractFunction(html, "groupEmployeeSystemReminders");

  assert.match(group, /key:'overdue'[\s\S]*?open:true/);
  assert.match(group, /key:'due_soon'[\s\S]*?open:false/);
});

test("System reminder groups sort by status-specific urgency", async () => {
  const html = await readFile(htmlPath, "utf8");
  const sortValue = extractFunction(html, "employeeSystemReminderSortValue");

  assert.match(sortValue, /bucket==='overdue'/);
  assert.match(sortValue, /-Number\(item\.overdue_days\|\|0\)/);
  assert.match(sortValue, /bucket==='due_soon'/);
  assert.match(sortValue, /daysBetween\(today\(\),due\)/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});


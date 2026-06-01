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

test("Follow-up view contains only the boss assigned task inbox", async () => {
  const html = await readFile(htmlPath, "utf8");
  const followup = extractBetween(html, 'id="view-arrears"', 'id="view-system"');

  assert.match(followup, /Boss assigned tasks/);
  assert.match(followup, /bossDirectiveList/);
  assert.doesNotMatch(followup, /taskList/);
  assert.doesNotMatch(followup, /System Reminders/);
  assert.doesNotMatch(followup, /followup-dashboard/);
});

test("System reminder rendering no longer refreshes boss assigned tasks", async () => {
  const html = await readFile(htmlPath, "utf8");
  const renderTasks = extractFunction(html, "renderTasks");

  assert.match(renderTasks, /taskList/);
  assert.doesNotMatch(renderTasks, /renderEmployeeDirectiveInbox\(/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

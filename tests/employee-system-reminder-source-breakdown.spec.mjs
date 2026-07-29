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

test("employee System API and UI expose explicit console SOT source breakdown", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const handler = extractFunction(worker, "handleEmployeeSystemReminders");
  const render = extractFunction(html, "renderTasks");
  const loader = extractFunction(html, "loadEmployeeSystemReminders");

  assert.match(handler, /source_breakdown:sourceBreakdown/);
  assert.match(handler, /overdue_count/);
  assert.match(handler, /due_today_count/);
  assert.match(handler, /due_soon_count/);
  assert.match(handler, /ttlock_overdue_count/);
  assert.match(handler, /existing_arrears_count/);
  assert.match(handler, /action_count/);
  assert.match(loader, /source_breakdown:data\.source_breakdown/);
  assert.match(render, /OVERDUE/);
  assert.match(render, /DUE TODAY/);
  assert.match(render, /DUE SOON/);
  assert.match(render, /控制台通通锁 SOT/);
});

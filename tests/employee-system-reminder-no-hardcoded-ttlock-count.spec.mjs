import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee System reminders do not hardcode TTLock overdue count", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.doesNotMatch(html, /ttlock[^;\n]{0,80}41/i);
  assert.doesNotMatch(html, /41[^;\n]{0,80}ttlock/i);
  assert.doesNotMatch(worker, /ttlock[^;\n]{0,80}41/i);
  assert.doesNotMatch(worker, /41[^;\n]{0,80}ttlock/i);
  assert.match(html, /state\.systemReminderItems/);
});


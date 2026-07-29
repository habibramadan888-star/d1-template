import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const htmlPath = "deploy-worker/public/employee-v3.html";
const workerPath = "deploy-worker/src/index.js";

test("employee session upload exposes staged progress and timing hooks", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /function employeeUploadTimingEnabled\(\)/);
  assert.match(html, /function employeeUploadTimingLog\(label,data\)/);
  assert.match(html, /正在上传 \$\{i\+1\}\/\$\{uploadList\.length\}/);
  assert.match(html, /正在确认 \$\{i\+1\}\/\$\{uploadList\.length\}/);
  assert.match(html, /上传完成/);
  assert.match(html, /X-Employee-Entry-Timing/);
});

test("upload completion does not block on follow-up task refresh", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /setTimeout\(\(\)=>loadTasks\(false\),0\)/);
  assert.doesNotMatch(html, /if\(!failed\.length\)await loadTasks\(false\)/);
});

test("worker returns optional server timing without logging secrets", async () => {
  const worker = await readFile(workerPath, "utf8");

  assert.match(worker, /X-Employee-Entry-Timing/);
  assert.match(worker, /d1_write_ms/);
  assert.match(worker, /total_ms/);
  assert.doesNotMatch(worker, /console\.log\(.*password|console\.log\(.*token|console\.log\(.*cookie/i);
});

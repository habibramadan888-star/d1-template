import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractAsyncFunction(source, name) {
  const start = source.indexOf(`async function ${name}(`);
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

test("employee directive inbox reads the dedicated directive API", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const load = extractAsyncFunction(html, "loadEmployeeArrearsDirectives");

  assert.match(load, /\/api\/employee\/arrears\/directives/);
  assert.match(load, /method:\s*['"]GET['"]/);
  assert.match(load, /data\.directives\|\|data\.tasks/);
  assert.doesNotMatch(load, /\/api\/arrear_tasks/);
});

test("employee directive inbox has empty and auth failure states", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /暂无老板下发任务/);
  assert.match(html, /无法读取老板下发任务/);
  assert.match(html, /老板下发任务读取失败/);
});

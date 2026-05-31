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

test("employee follow-up page separates boss directives from system reminders", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /id="bossDirectiveList"/);
  assert.match(html, /老板下发任务/);
  assert.match(html, /系统提醒/);
  assert.match(html, /\/api\/employee\/arrears\/directives/);
  assert.match(html, /\/api\/arrear_tasks/);
});

test("boss directive inbox does not depend on old arrear task update source", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const readBlock = extractAsyncFunction(html, "loadEmployeeArrearsDirectives");

  assert.match(readBlock, /\/api\/employee\/arrears\/directives/);
  assert.doesNotMatch(readBlock, /\/api\/arrear_tasks/);
});

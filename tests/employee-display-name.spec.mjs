import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee display name prefers identity fields and never role staff", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const fn = html.match(/function employeeDisplayName\(user\)\{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(fn, /display_name/);
  assert.match(fn, /username/);
  assert.match(fn, /employee_id/);
  assert.match(fn, /userid/);
  assert.doesNotMatch(fn, /user\?\.role/);
  assert.match(fn, /\['staff','employee'\]\.includes\(v\.toLowerCase\(\)\)/);
});

test("employee header label no longer says employee id plus staff", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.doesNotMatch(html, /<span class="employee-identity-label">当前员工<\/span>/);
  assert.match(html, /aria-label="员工姓名"/);
  assert.doesNotMatch(html, /员工编号 <input id="operatorId"/);
  assert.match(html, /\.operator input\{[^}]*text-align:center/);
});

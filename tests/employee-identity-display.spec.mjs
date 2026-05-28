import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee identity display prefers name or userid over role staff", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /function employeeDisplayName\(user\)/);
  assert.match(
    html,
    /user\?\.display_name[\s\S]*user\?\.employee_name[\s\S]*user\?\.name[\s\S]*user\?\.username[\s\S]*user\?\.userid[\s\S]*user\?\.role/
  );
  assert.match(html, /当前员工 <input id="operatorId"/);
  assert.match(html, /employee_name:me\.employee_name\|\|me\.name\|\|me\.username\|\|me\.userid/);
  assert.doesNotMatch(html, /员工编号 <input id="operatorId"/);
});

test("employee display fix does not change permission authority", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /fetchCurrentAuthUser/);
  assert.match(html, /isEmployeeAuthRole\(me\.role\)/);
  assert.match(html, /isOwnerAuthRole\(me\.role\)/);
  assert.match(html, /\/api\/me/);
});

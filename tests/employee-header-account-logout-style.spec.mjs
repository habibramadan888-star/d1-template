import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee name and logout use one shared header button style", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /\.employee-identity-card,\r?\n\.employee-logout\{/);
  assert.match(html, /min-width:112px/);
  assert.match(html, /min-height:38px/);
  assert.match(html, /justify-content:center/);
  assert.match(html, /background:rgba\(255,255,255,\.76\)/);
  assert.match(html, /color:#142033/);
  assert.doesNotMatch(html, /background:linear-gradient\(180deg,#ef4444,#b91c1c\)/);
});

test("header keeps one staff identity display and one explicit logout button", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /id="employeeIdentityName"/);
  assert.match(html, /id="btnEmployeeLogoutTop"/);
  assert.match(html, /Logout<span class="label-en">退出<\/span>/);
  assert.match(html, /\.employee-user-button\{\s*display:none!important;/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

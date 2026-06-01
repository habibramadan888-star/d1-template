import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee header separates identity display from logout action", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /id="employeeIdentityCard"/);
  assert.match(html, /id="employeeIdentityName"/);
  assert.match(html, /id="btnEmployeeLogoutTop"/);
  assert.match(html, /Logout<span class="label-en">退出<\/span>/);
});

test("legacy account name button is hidden so Abdul is not shown twice", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /\.operator\[hidden\]\{display:none!important\}/);
  assert.match(html, /\.employee-user-button\{\s*display:none!important;/);
  assert.match(html, /\.employee-user-menu\{\s*display:none!important;/);
  assert.match(html, /employeeIdentityName'\)\)\$\('employeeIdentityName'\)\.textContent=display/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee header exposes one identity control and one matching logout control", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /class="employee-identity-card"/);
  assert.match(html, /class="employee-logout" id="btnEmployeeLogoutTop"/);
  assert.match(html, /\.employee-identity-card,\s*\.employee-logout\{/);
  assert.match(html, /employee-user-button\{\s*display:none!important/);
  assert.doesNotMatch(html, /<span class="pill">员工<\/span>/);
});

test("employee primary tabs are Entry and Follow-up only", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /data-view="entry"/);
  assert.match(html, /data-view="arrears"/);
  assert.doesNotMatch(html, /data-view="export"/);
});

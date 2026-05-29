import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner logout routes to root entry", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /async function logout\(\)/);
  assert.match(js, /\/auth\/logout/);
  assert.match(js, /clearLegacyAuthStorage\(\)/);
  assert.match(js, /const UNIFIED_LOGIN_DESTINATION='\/'/);
  assert.match(js, /redirectToUnifiedLogin\('signed_out'\)/);
});

test("employee session failure routes to root entry", async () => {
  const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(employee, /const UNIFIED_LOGIN_DESTINATION='\/'/);
  assert.match(employee, /redirectToUnifiedLogin\('employee_session_required'\)/);
  assert.match(employee, /redirectToUnifiedLogin\('employee_session_check_failed'\)/);
});

test("portal clear session removes legacy auth state", async () => {
  const portal = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.match(portal, /\/auth\/logout/);
  for (const key of [
    "homelink:cloud_token",
    "homelink:role",
    "owner:role",
    "empv3:user",
    "empv3:operator"
  ]) {
    assert.match(portal, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

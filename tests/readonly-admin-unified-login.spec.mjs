import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ADMIN_DESTINATION,
  OWNER_DESTINATION,
  PRODUCTION_CUTOVER_STATUS,
  canWriteOwnerData,
  getCommercialLaunchStatusForUnifiedLogin,
  resolveUnifiedPostLoginRoute
} from "../modules/auth/unified-login-routing.mjs";

const LOGIN_HTML_PATH = "deploy-worker/public/portal.html";

async function readLoginHtml() {
  return readFile(LOGIN_HTML_PATH, "utf8");
}

test("root portal accepts admin username through owner auth endpoint", async () => {
  const html = await readLoginHtml();

  assert.match(html, /data-portal="admin"/);
  assert.match(html, /accountInput\.value="admin"/);
  assert.match(html, /requestJson\("\/auth\/login"/);
  assert.match(html, /JSON\.stringify\(\{username:account\|\|browserUsername\.value,password\}\)/);
  assert.match(html, /requestJson\("\/auth\/employee-login"/);
  assert.match(html, /JSON\.stringify\(\{employee_id:account,pin:password\}\)/);
});

test("readonly_admin role routes to admin read-only destination", () => {
  const decision = resolveUnifiedPostLoginRoute({
    meClaim: { role: "readonly_admin", userid: "admin", canWrite: false },
    loginResponse: { role: "staff" },
    frontendRole: "staff"
  });

  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.ok, true);
  assert.equal(decision.destination, ADMIN_DESTINATION);
  assert.equal(decision.roleGroup, "admin");
});

test("readonly_admin cannot write owner data", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.equal(canWriteOwnerData({ role: "readonly_admin" }), false);
  assert.match(
    worker,
    /if \(path === "\/api\/customers" && method === "POST"\) \{\n      if \(!requireManager\(user\)\) return forbidden\(\);/
  );
  assert.match(ownerJs, /function denyReadonlyAdminWrite\(\)/);
  assert.match(ownerJs, /readonly-admin/);
});

test("employee and owner login routing remain supported", () => {
  assert.equal(
    resolveUnifiedPostLoginRoute({ meClaim: { role: "staff" } }).destination,
    "/employee"
  );
  assert.equal(
    resolveUnifiedPostLoginRoute({ meClaim: { role: "manager" } }).destination,
    OWNER_DESTINATION
  );
});

test("wrong password still shows username/password error", async () => {
  const html = await readLoginHtml();

  assert.match(html, /用户名或密码错误/);
});

test("production cutover remains PRODUCTION_NO_GO", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});

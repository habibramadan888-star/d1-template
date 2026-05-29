import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OWNER_DESTINATION,
  PRODUCTION_CUTOVER_STATUS,
  canWriteOwnerData,
  getCommercialLaunchStatusForUnifiedLogin,
  resolveUnifiedPostLoginRoute
} from "../modules/auth/unified-login-routing.mjs";

const LOGIN_HTML_PATH = "deploy-worker/public/unified-login.html";

async function readLoginHtml() {
  return readFile(LOGIN_HTML_PATH, "utf8");
}

test("unified-login accepts admin username through owner auth endpoint", async () => {
  const html = await readLoginHtml();

  assert.match(html, /OWNER_ACCOUNT_IDS = new Set\(\["owner", "manager", "admin"/);
  assert.match(html, /function shouldUseOwnerLogin\(account\)/);
  assert.match(html, /if \(shouldUseOwnerLogin\(id\)\) \{/);
  assert.match(html, /requestJson\("\/auth\/login"/);
  assert.match(html, /JSON\.stringify\(\{ password \}\)/);
  assert.match(html, /requestJson\("\/auth\/employee-login"/);
  assert.match(html, /JSON\.stringify\(\{ employee_id: id, pin: password \}\)/);
});

test("readonly_admin role routes to owner destination", () => {
  const decision = resolveUnifiedPostLoginRoute({
    meClaim: { role: "readonly_admin", userid: "admin", canWrite: false },
    loginResponse: { role: "staff" },
    frontendRole: "staff"
  });

  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.ok, true);
  assert.equal(decision.destination, OWNER_DESTINATION);
  assert.equal(decision.roleGroup, "owner");
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
    "/employee-v3.html"
  );
  assert.equal(
    resolveUnifiedPostLoginRoute({ meClaim: { role: "manager" } }).destination,
    OWNER_DESTINATION
  );
});

test("wrong password still shows username/password error", async () => {
  const html = await readLoginHtml();

  assert.match(html, /setStatus\("用户名或密码错误", "error"\)/);
});

test("production cutover remains PRODUCTION_NO_GO", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});

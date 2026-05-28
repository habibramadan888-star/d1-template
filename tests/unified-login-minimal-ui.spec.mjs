import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OWNER_DESTINATION,
  PRODUCTION_CUTOVER_STATUS,
  getCommercialLaunchStatusForUnifiedLogin,
  resolveUnifiedPostLoginRoute
} from "../modules/auth/unified-login-routing.mjs";

const LOGIN_HTML_PATH = "deploy-worker/public/unified-login.html";

async function readLoginHtml() {
  return readFile(LOGIN_HTML_PATH, "utf8");
}

test("unified-login still loads a single minimal login form", async () => {
  const html = await readLoginHtml();

  assert.match(html, /<main class="login-overlay unified-login-shell"/);
  assert.match(html, /<form id="loginForm">/);
  assert.match(html, /id="accountId"/);
  assert.match(html, /id="secret"/);
  assert.match(html, /id="loginButton"/);
  assert.match(html, /Homelink 登录/);
  assert.match(html, /员工 \/ 老板 \/ 管理员统一入口/);
  assert.match(html, /员工请输入编号和 PIN；老板可留空编号。/);
});

test("unified-login visible copy removes technical QA and production notes", async () => {
  const html = await readLoginHtml();

  assert.doesNotMatch(html, /One login for every internal role/);
  assert.doesNotMatch(html, /server role/i);
  assert.doesNotMatch(html, /PRODUCTION_NO_GO/);
  assert.doesNotMatch(html, /DB = homelink/i);
  assert.doesNotMatch(html, /write-style QA/i);
  assert.doesNotMatch(html, /Production cutover/i);
  assert.doesNotMatch(html, /route by role/i);
});

test("unified-login keeps employee role routing through server authority", () => {
  const decision = resolveUnifiedPostLoginRoute({
    meClaim: { role: "employee" },
    frontendRole: "owner",
    loginResponse: { role: "owner" }
  });

  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.destination, "/employee-v3.html");
  assert.equal(decision.ignoredFrontendRole, "owner");
});

test("unified-login keeps owner manager role routing through server authority", () => {
  for (const role of ["owner", "manager", "admin"]) {
    const decision = resolveUnifiedPostLoginRoute({ meClaim: { role } });

    assert.equal(decision.authority, "/api/me");
    assert.equal(decision.destination, OWNER_DESTINATION);
  }
});

test("unified-login still supports explicit clear session action", async () => {
  const html = await readLoginHtml();

  assert.match(html, /id="logoutButton"/);
  assert.match(html, /id="clearSessionButton"/);
  assert.match(html, /async function clearSession\(\)/);
  assert.match(html, /\/auth\/logout/);
  assert.match(html, /localStorage\.removeItem\("homelink:cloud_token"\)/);
});

test("production cutover remains PRODUCTION_NO_GO", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});

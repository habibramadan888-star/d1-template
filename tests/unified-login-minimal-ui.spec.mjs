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

function visibleLoginHtml(html) {
  return html.slice(html.indexOf("<main"), html.indexOf("<script>"));
}

test("unified-login still loads a single minimal login form", async () => {
  const html = await readLoginHtml();
  const visible = visibleLoginHtml(html);

  assert.match(visible, /<main class="login-overlay unified-login-shell"/);
  assert.match(visible, /<form id="loginForm">/);
  assert.match(visible, /id="accountId"/);
  assert.match(visible, /placeholder="用户名"/);
  assert.match(visible, /id="secret"/);
  assert.match(visible, /placeholder="密码"/);
  assert.match(visible, /id="loginButton"/);
  assert.match(visible, /Homelink 登录/);
  assert.match(visible, /清除会话/);
});

test("unified-login visible copy removes technical QA and production notes", async () => {
  const html = await readLoginHtml();
  const visible = visibleLoginHtml(html);

  assert.doesNotMatch(visible, /One login for every internal role/);
  assert.doesNotMatch(visible, /server role/i);
  assert.doesNotMatch(visible, /PRODUCTION_NO_GO/);
  assert.doesNotMatch(visible, /DB = homelink/i);
  assert.doesNotMatch(visible, /write-style QA/i);
  assert.doesNotMatch(visible, /Production cutover/i);
  assert.doesNotMatch(visible, /route by role/i);
  assert.doesNotMatch(visible, /employee-v3\.html|index\.html/);
  assert.doesNotMatch(visible, /员工请输入|老板可留空|管理员|统一入口/);
  assert.doesNotMatch(visible, /class="hint"|class="signed-in"|boundary/);
});

test("unified-login keeps employee role routing through server authority", () => {
  const decision = resolveUnifiedPostLoginRoute({
    meClaim: { role: "employee" },
    frontendRole: "owner",
    loginResponse: { role: "owner" }
  });

  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.destination, "/employee");
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
  assert.match(html, /async function clearSession\(\)/);
  assert.match(html, /\/auth\/logout/);
  assert.match(html, /"homelink:cloud_token"/);
  assert.match(html, /localStorage\.removeItem\(key\)/);
});

test("production cutover remains PRODUCTION_NO_GO", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("unified login uses employee-login-equivalent card and background", async () => {
  const html = await readFile("deploy-worker/public/unified-login.html", "utf8");

  assert.match(html, /class="login-overlay unified-login-shell"/);
  assert.match(
    html,
    /radial-gradient\(circle at 70% 20%,rgba\(9,166,79,\.22\),transparent 28rem\),rgba\(237,247,242,\.78\)/
  );
  assert.match(html, /backdrop-filter:blur\(30px\) saturate\(170%\)/);
  assert.match(html, /width:min\(420px,96vw\)/);
  assert.match(html, /border-radius:32px/);
  assert.match(html, /padding:28px/);
  assert.match(html, /0 32px 90px rgba\(15,23,42,\.18\)/);
  assert.match(html, /class="login-card employee-login-match"/);
});

test("unified login uses employee-login-equivalent logo and typography", async () => {
  const html = await readFile("deploy-worker/public/unified-login.html", "utf8");

  assert.match(html, /class="badge"><div>HOME<small>LINK\.<\/small><\/div><\/div>/);
  assert.match(
    html,
    /class="login-title">Homelink 登录<small>员工 \/ 老板 \/ 管理员统一入口<\/small>/
  );
  assert.match(html, /\.login-title\{\s*color:#111827;\s*font-size:26px;\s*font-weight:820;/);
  assert.match(html, /\.login-title small\{/);
  assert.match(html, /letter-spacing:\.12em/);
});

test("unified login uses employee-login-equivalent input class and tokens", async () => {
  const html = await readFile("deploy-worker/public/unified-login.html", "utf8");

  assert.match(html, /class="field"/);
  assert.match(html, /min-height:54px/);
  assert.match(html, /border:1\.5px solid rgba\(148,163,184,\.38\)/);
  assert.match(html, /border-radius:16px/);
  assert.match(html, /box-shadow:0 0 0 5px rgba\(9,166,79,\.13\)/);
});

test("unified login uses employee-login-equivalent button and helper card", async () => {
  const html = await readFile("deploy-worker/public/unified-login.html", "utf8");

  assert.match(html, /class="btn primary" id="loginButton"/);
  assert.match(html, /background:linear-gradient\(180deg,#20bf6b 0%,#078d42 100%\)/);
  assert.match(html, /border-radius:17px/);
  assert.match(html, /<button class="btn primary" id="loginButton" type="submit">登录<\/button>/);
  assert.match(html, /class="hint"/);
  assert.match(html, /border:1px dashed #d7e3dd/);
});

test("unified login keeps server-authority role routing", async () => {
  const html = await readFile("deploy-worker/public/unified-login.html", "utf8");

  assert.match(html, /\/auth\/employee-login/);
  assert.match(html, /\/auth\/login/);
  assert.match(html, /\/api\/me/);
  assert.match(html, /Do not trust the login response role/);
  assert.match(html, /employee-v3\.html/);
  assert.match(html, /index\.html/);
});

test("unified login does not add owner or employee specific login pages", async () => {
  const html = await readFile("deploy-worker/public/unified-login.html", "utf8");

  assert.doesNotMatch(html, /owner login page|employee login page|boss login page/i);
  assert.doesNotMatch(html, /老板端登录页|员工端登录页/);
});

test("production cutover remains documented as no-go", async () => {
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");

  assert.match(readiness, /PRODUCTION_NO_GO/);
});

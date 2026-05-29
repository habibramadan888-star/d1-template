import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("old user-visible login routes redirect to root portal", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  for (const route of [
    "/employee.html",
    "/login",
    "/staff-login",
    "/employee-login",
    "/owner-login",
    "/admin-login",
    "/unified-login.html"
  ]) {
    assert.match(worker, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(worker, /function redirectToRootEntry\(request, portal = ""\)/);
});

test("employee-v3 old PIN login overlay is not user-visible", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /<div class="login-overlay hidden" id="loginOverlay" aria-hidden="true">/);
  assert.match(html, /redirectToUnifiedLogin\('employee_session_required'\)/);
  assert.doesNotMatch(html, /classList\.remove\('hidden'\)/);
});

test("legacy employee.html static asset redirects without showing PIN login", async () => {
  const html = await readFile("deploy-worker/public/employee.html", "utf8");

  assert.match(html, /\/\?portal=employee/);
  assert.match(html, /location\.replace\("\/\?portal=employee"\)/);
  assert.doesNotMatch(html, /ENTER EMPLOYEE CODE/);
  assert.doesNotMatch(html, /\/api\/employee\/entry/);
});

test("owner legacy login function cannot authenticate or route users", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const fn = js.match(/async function submitCode\(\)\{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(fn, /redirectToUnifiedLogin\('legacy_owner_login_disabled'\)/);
  assert.doesNotMatch(fn, /\/auth\/login/);
  assert.doesNotMatch(fn, /employee-v3\.html/);
});

test("production cutover remains PRODUCTION_NO_GO", async () => {
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");
  assert.match(readiness, /PRODUCTION_NO_GO/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("unauthenticated employee-v3 redirects to root portal instead of showing old PIN UI", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /<div class="login-overlay hidden" id="loginOverlay" aria-hidden="true">/);
  assert.match(html, /function redirectToUnifiedLogin/);
  assert.match(html, /employee_session_required/);
  assert.doesNotMatch(html, /loginOverlay'\)\.classList\.remove\('hidden'\)/);
});

test("unauthenticated owner index redirects to root portal instead of old owner login", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /const UNIFIED_LOGIN_DESTINATION='\/'/);
  assert.match(js, /function showOwnerLoginFallback/);
  assert.match(js, /redirectToUnifiedLogin\('owner_session_required'\)/);
  assert.doesNotMatch(js, /setOwnerAuthMessage\(message,'ENTER EMPLOYEE CODE'\)/);
});

test("authenticated roles route to the correct business destination", async () => {
  const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const owner = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(employee, /if\(isOwnerAuthRole\(me\.role\)\)\{\s*location\.replace\('\/owner'\)/);
  assert.match(owner, /if\(isEmployeeAppRole\(me\.role\)\)\{\s*location\.replace\('\/employee'\)/);
  assert.match(owner, /if\(isOwnerAppRole\(me\.role\)\)/);
});

test("production cutover remains PRODUCTION_NO_GO", async () => {
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");

  assert.match(readiness, /PRODUCTION_NO_GO/);
});

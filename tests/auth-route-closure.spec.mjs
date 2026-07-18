import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("root remains the only formal login entry", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const portal = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.match(worker, /path === "\/" \|\| path === "\/home"/);
  assert.match(worker, /fetchStaticAsset\(request, env, "\/portal"\)/);
  assert.match(portal, /data-portal="employee"/);
  assert.match(portal, /data-portal="owner"/);
  assert.match(portal, /data-portal="admin"/);
});

test("legacy login and html paths are intercepted before static assets", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /Compatibility-only paths are intercepted before static assets/);
  assert.match(worker, /path === "\/login" \|\| path === "\/unified-login\.html"/);
  assert.match(worker, /redirectToRootEntry\(request\)/);
  assert.match(
    worker,
    /path === "\/employee-login" \|\| path === "\/staff-login" \|\| path === "\/employee\.html"/
  );
  assert.match(worker, /redirectToRootEntry\(request, "employee"\)/);
  assert.match(worker, /path === "\/owner-login"/);
  assert.match(worker, /redirectToRootEntry\(request, "owner"\)/);
  assert.match(worker, /path === "\/admin-login"/);
  assert.match(worker, /redirectToRootEntry\(request, "admin"\)/);
  assert.match(worker, /path === "\/employee-v3\.html" \|\| path === "\/employee-v2\.html"/);
  assert.match(worker, /redirectToPath\(request, "\/employee"\)/);
  assert.match(
    worker,
    /path === "\/index\.html" \|\| path === "\/index-51\.html" \|\| path === "\/owner\.html"/
  );
  assert.match(worker, /redirectToPath\(request, "\/owner"\)/);
});

test("unauthenticated business routes return to the root portal while Employee preserves its safe deep link", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(
    worker,
    /if \(path !== "\/employee" && path !== "\/owner" && path !== "\/admin"\) return null/
  );
  assert.match(worker, /const claim = await readRouteClaim\(request, env\)/);
  assert.match(worker, /if \(!claim\) return path === "\/employee" \? redirectToEmployeeLogin\(request, env\) : redirectToRootEntry\(request\)/);
  assert.match(worker, /target\.searchParams\.set\("return_to", employeeLoginReturnTo\(request, env\)\)/);
});

test("old employee and owner login panels cannot become visible normal flow", async () => {
  const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(employee, /<div class="login-overlay hidden" id="loginOverlay" aria-hidden="true">/);
  assert.match(employee, /const UNIFIED_LOGIN_DESTINATION='\/'/);
  assert.doesNotMatch(employee, /classList\.remove\('hidden'\)/);

  assert.match(ownerJs, /function showOwnerLoginFallback/);
  assert.match(ownerJs, /redirectToUnifiedLogin\('owner_session_required'\)/);
  assert.match(ownerJs, /redirectToUnifiedLogin\('legacy_owner_login_disabled'\)/);
});

test("logout and clear session routes return only to root portal", async () => {
  const portal = await readFile("deploy-worker/public/portal.html", "utf8");
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(portal, /\/api\/logout/);
  assert.match(portal, /location\.replace\(target\)/);
  assert.match(ownerJs, /const UNIFIED_LOGIN_DESTINATION='\/'/);
  assert.match(ownerJs, /redirectToUnifiedLogin\('signed_out'\)/);
  assert.match(employee, /const UNIFIED_LOGIN_DESTINATION='\/'/);
  assert.match(employee, /redirectToUnifiedLogin\('employee_session_required'\)/);
});

test("production cutover remains no-go", async () => {
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");

  assert.match(readiness, /PRODUCTION_NO_GO/);
});

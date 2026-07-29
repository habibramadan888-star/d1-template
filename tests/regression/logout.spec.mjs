import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { apiRequest, expectStandard, loginEmployee } from "../helpers/api-test-utils.mjs";

async function canReachWorker() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await apiRequest("/api/me", { signal: controller.signal });
    return [200, 401, 403].includes(response.status);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

test("logout endpoint revokes the active session and clears the session cookie", async (t) => {
  if (!(await canReachWorker())) {
    t.skip("local Worker is not running");
    return;
  }

  const cookie = await loginEmployee();

  await expectStandard(await apiRequest("/api/me", { cookie }), {
    label: "authenticated /api/me before logout",
    status: 200,
    code: 0
  });

  const logoutResponse = await apiRequest("/api/logout", {
    method: "POST",
    cookie
  });
  const payload = await expectStandard(logoutResponse, {
    label: "POST /api/logout",
    status: 200,
    code: 0
  });
  assert.equal(payload.data?.success, true);

  const setCookie =
    typeof logoutResponse.headers.getSetCookie === "function"
      ? logoutResponse.headers.getSetCookie().join("\n")
      : logoutResponse.headers.get("set-cookie") || "";
  assert.match(setCookie, /Max-Age=0|Expires=Thu, 01 Jan 1970/i);

  await expectStandard(await apiRequest("/api/me", { cookie }), {
    label: "authenticated /api/me after logout",
    status: 401,
    code: 1001
  });
});

test("logout wiring is available in Worker and both role UIs", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const ownerHtml = await readFile("deploy-worker/public/index-51.html", "utf8");

  assert.match(worker, /"\/api\/logout"/);
  assert.match(worker, /UPDATE active_sessions SET revoked=1 WHERE sid=\?/);
  assert.match(worker, /Set-Cookie/);
  assert.match(worker, /clearSessionCookie\(\)/);

  assert.match(employee, /id="employeeUserButton"/);
  assert.match(employee, /id="btnEmployeeLogout"/);
  assert.match(employee, /function employeeLogout\(\)/);
  assert.match(employee, /\/api\/logout/);
  assert.doesNotMatch(employee, /document\.querySelector\('\.pill\.main'\)\.innerHTML/);

  assert.match(ownerJs, /\/api\/logout/);
  assert.match(ownerHtml, /owner-logout-btn/);
  assert.match(ownerHtml, /LOGOUT/);
});

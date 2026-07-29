import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ADMIN_DESTINATION,
  EMPLOYEE_DESTINATION,
  OWNER_DESTINATION,
  PRODUCTION_CUTOVER_STATUS,
  UNIFIED_LOGIN_PATH,
  getCommercialLaunchStatusForUnifiedLogin,
  resolveUnifiedPostLoginRoute
} from "../modules/auth/unified-login-routing.mjs";

test("root is the only formal login entry", async () => {
  const portal = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.equal(UNIFIED_LOGIN_PATH, "/");
  assert.match(portal, /data-portal="employee"/);
  assert.match(portal, /data-portal="owner"/);
  assert.match(portal, /data-portal="admin"/);
  assert.doesNotMatch(portal, /PRODUCTION_NO_GO|DB = homelink|server role/i);
});

test("employee and owner legacy html paths are business aliases, not login entries", () => {
  assert.equal(EMPLOYEE_DESTINATION, "/employee");
  assert.equal(OWNER_DESTINATION, "/owner");
  assert.equal(ADMIN_DESTINATION, "/admin");
});

test("employee role routes to employee business path", () => {
  const decision = resolveUnifiedPostLoginRoute({ meClaim: { role: "staff" } });

  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.destination, EMPLOYEE_DESTINATION);
});

test("owner manager roles route to owner business path", () => {
  for (const role of ["owner", "manager", "admin"]) {
    const decision = resolveUnifiedPostLoginRoute({ meClaim: { role } });

    assert.equal(decision.authority, "/api/me");
    assert.equal(decision.destination, OWNER_DESTINATION);
  }
});

test("readonly admin routes to admin read-only path", () => {
  for (const role of ["readonly_admin", "admin_readonly"]) {
    const decision = resolveUnifiedPostLoginRoute({ meClaim: { role } });

    assert.equal(decision.authority, "/api/me");
    assert.equal(decision.roleGroup, "admin");
    assert.equal(decision.destination, ADMIN_DESTINATION);
  }
});

test("frontend role tamper remains ignored", () => {
  const decision = resolveUnifiedPostLoginRoute({
    meClaim: { role: "staff" },
    frontendRole: "manager",
    loginResponse: { role: "manager" }
  });

  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.destination, EMPLOYEE_DESTINATION);
  assert.equal(decision.ignoredFrontendRole, "manager");
});

test("production cutover remains PRODUCTION_NO_GO", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});

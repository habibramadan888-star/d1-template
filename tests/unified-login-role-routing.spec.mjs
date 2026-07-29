import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EMPLOYEE_DESTINATION,
  OWNER_DESTINATION,
  PRODUCTION_CUTOVER_STATUS,
  UNIFIED_LOGIN_PATH,
  canAccessOwnerProtectedResources,
  canSubmitEmployeeWorkflow,
  getCommercialLaunchStatusForUnifiedLogin,
  getUnifiedLoginDestination,
  getUnifiedLoginErrorMessage,
  resolveUnifiedPostLoginRoute,
  shouldRedirectUnauthenticatedToUnifiedLogin
} from "../modules/auth/unified-login-routing.mjs";

test("employee login routes to employee destination", () => {
  const decision = resolveUnifiedPostLoginRoute({ meClaim: { role: "staff" } });

  assert.equal(decision.ok, true);
  assert.equal(decision.roleGroup, "employee");
  assert.equal(decision.destination, EMPLOYEE_DESTINATION);
});

test("owner login routes to owner destination", () => {
  const decision = resolveUnifiedPostLoginRoute({ meClaim: { role: "manager" } });

  assert.equal(decision.ok, true);
  assert.equal(decision.roleGroup, "owner");
  assert.equal(decision.destination, OWNER_DESTINATION);
});

test("unknown role is denied", () => {
  const decision = getUnifiedLoginDestination({ role: "contractor" });

  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "UNKNOWN_ROLE");
  assert.equal(decision.destination, null);
});

test("unauthenticated access redirects to login", () => {
  assert.equal(shouldRedirectUnauthenticatedToUnifiedLogin({ meStatus: 401 }), true);
  assert.equal(shouldRedirectUnauthenticatedToUnifiedLogin({ hasAuthClaim: false }), true);
  assert.equal(UNIFIED_LOGIN_PATH, "/");
});

test("invalid login shows clear error", () => {
  assert.match(getUnifiedLoginErrorMessage("invalid_credentials"), /Login failed/);
  assert.match(getUnifiedLoginErrorMessage("invalid_employee_pin"), /Login failed/);
});

test("frontend role tamper is ignored", () => {
  const decision = resolveUnifiedPostLoginRoute({
    meClaim: { role: "staff" },
    loginResponse: { role: "manager" },
    frontendRole: "manager"
  });

  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.ignoredLoginRole, "manager");
  assert.equal(decision.ignoredFrontendRole, "manager");
  assert.equal(decision.destination, EMPLOYEE_DESTINATION);
});

test("/api/me remains routing authority", () => {
  const decision = resolveUnifiedPostLoginRoute({
    meClaim: { role: "manager" },
    loginResponse: { role: "staff" }
  });

  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.destination, OWNER_DESTINATION);
});

test("employee cannot access owner protected resources", () => {
  assert.equal(canAccessOwnerProtectedResources({ role: "staff" }), false);
  assert.equal(canAccessOwnerProtectedResources({ role: "manager" }), true);
});

test("owner cannot submit employee-only workflow unless explicitly allowed", () => {
  assert.equal(canSubmitEmployeeWorkflow({ role: "manager" }), false);
  assert.equal(
    canSubmitEmployeeWorkflow({ role: "manager" }, { explicitEmployeeWorkflowGrant: true }),
    true
  );
  assert.equal(canSubmitEmployeeWorkflow({ role: "staff" }), true);
});

test("production status remains no-go", async () => {
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");

  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
  assert.match(readiness, /PRODUCTION_NO_GO/);
});

test("root portal asset uses /api/me as authority and preserves canonical destinations", async () => {
  const html = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.match(html, /\/api\/me/);
  assert.match(html, /\/auth\/login/);
  assert.match(html, /\/auth\/employee-login/);
  assert.match(html, /"\/employee"/);
  assert.match(html, /"\/owner"/);
  assert.match(html, /"\/admin"/);
  assert.doesNotMatch(html, /tenant_id\s*=/i);
  assert.doesNotMatch(html, /property_id\s*=/i);
});

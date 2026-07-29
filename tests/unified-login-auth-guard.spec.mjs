import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EMPLOYEE_DESTINATION,
  OWNER_DESTINATION,
  canAccessOwnerProtectedResources,
  canSubmitEmployeeWorkflow,
  resolveEmployeeSessionHandoff,
  resolveOwnerSessionHandoff
} from "../modules/auth/unified-login-routing.mjs";

test("owner protected resources require owner-class /api/me claim", () => {
  assert.equal(canAccessOwnerProtectedResources({ role: "manager" }), true);
  assert.equal(canAccessOwnerProtectedResources({ role: "owner" }), true);
  assert.equal(canAccessOwnerProtectedResources({ role: "admin" }), true);
  assert.equal(canAccessOwnerProtectedResources({ role: "employee" }), false);
});

test("employee session is redirected away from owner dashboard", () => {
  const decision = resolveOwnerSessionHandoff({
    meStatus: 200,
    meClaim: { role: "employee" }
  });

  assert.equal(decision.action, "REDIRECT");
  assert.equal(decision.destination, EMPLOYEE_DESTINATION);
  assert.equal(decision.authority, "/api/me");
});

test("owner session is redirected away from employee-only workflow by default", () => {
  const decision = resolveEmployeeSessionHandoff({
    meStatus: 200,
    meClaim: { role: "owner" }
  });

  assert.equal(canSubmitEmployeeWorkflow({ role: "owner" }), false);
  assert.equal(decision.action, "REDIRECT");
  assert.equal(decision.destination, OWNER_DESTINATION);
});

test("explicit employee workflow grant is required for owner-class submit", () => {
  assert.equal(
    canSubmitEmployeeWorkflow({ role: "owner" }, { explicitEmployeeWorkflowGrant: true }),
    true
  );
  assert.equal(canSubmitEmployeeWorkflow({ role: "owner" }), false);
});

test("auth guard implementation keeps /api/me as authority", async () => {
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const employeeHtml = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(ownerJs, /fetchCurrentAuthUser/);
  assert.match(ownerJs, /\/api\/me/);
  assert.match(employeeHtml, /fetchCurrentAuthUser/);
  assert.match(employeeHtml, /\/api\/me/);
  assert.doesNotMatch(ownerJs, /tenant_id\s*=/i);
});

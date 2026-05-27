import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EMPLOYEE_DESTINATION,
  OWNER_DESTINATION,
  PRODUCTION_CUTOVER_STATUS,
  canAccessOwnerProtectedResources,
  canSubmitEmployeeWorkflow,
  getCommercialLaunchStatusForUnifiedLogin,
  resolveEmployeeSessionHandoff,
  resolveOwnerSessionHandoff
} from "../modules/auth/unified-login-routing.mjs";

test("owner unified login creates reusable session", () => {
  const decision = resolveOwnerSessionHandoff({
    meStatus: 200,
    meClaim: { role: "manager", userid: "owner" }
  });

  assert.equal(decision.action, "ENTER_OWNER_APP");
  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.showSecondLogin, false);
});

test("index.html detects valid owner session via /api/me", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /resumeUnifiedOwnerSession/);
  assert.match(js, /fetchCurrentAuthUser/);
  assert.match(js, /\/api\/me/);
  assert.match(js, /enterAs\(toOwnerSpaRole\(me\.role\)\)/);
});

test("owner is not shown second login after valid unified login", () => {
  const decision = resolveOwnerSessionHandoff({
    meStatus: 200,
    meClaim: { role: "owner" }
  });

  assert.equal(decision.action, "ENTER_OWNER_APP");
  assert.equal(decision.roleForApp, "manager");
  assert.equal(decision.showSecondLogin, false);
});

test("employee unified login creates reusable session", () => {
  const decision = resolveEmployeeSessionHandoff({
    meStatus: 200,
    meClaim: { role: "staff", userid: "employee" }
  });

  assert.equal(decision.action, "ENTER_EMPLOYEE_APP");
  assert.equal(decision.authority, "/api/me");
  assert.equal(decision.showSecondLogin, false);
});

test("employee-v3.html detects valid employee session if supported", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /fetchCurrentAuthUser/);
  assert.match(html, /\/api\/me/);
  assert.match(html, /isEmployeeAuthRole\(me\.role\)/);
  assert.match(html, /applyEmployeeUser\(\{userid:me\.userid/);
});

test("employee cannot enter owner dashboard", () => {
  const decision = resolveOwnerSessionHandoff({
    meStatus: 200,
    meClaim: { role: "staff" }
  });

  assert.equal(canAccessOwnerProtectedResources({ role: "staff" }), false);
  assert.equal(decision.action, "REDIRECT");
  assert.equal(decision.destination, EMPLOYEE_DESTINATION);
});

test("owner cannot accidentally submit employee-only workflow", () => {
  const decision = resolveEmployeeSessionHandoff({
    meStatus: 200,
    meClaim: { role: "manager" }
  });

  assert.equal(canSubmitEmployeeWorkflow({ role: "manager" }), false);
  assert.equal(decision.action, "REDIRECT");
  assert.equal(decision.destination, OWNER_DESTINATION);
});

test("invalid or expired session shows login", () => {
  const owner = resolveOwnerSessionHandoff({ meStatus: 401 });
  const employee = resolveEmployeeSessionHandoff({ meStatus: 401 });

  assert.equal(owner.action, "SHOW_LOGIN");
  assert.equal(owner.showSecondLogin, true);
  assert.equal(employee.action, "SHOW_PIN_LOGIN");
  assert.equal(employee.showSecondLogin, true);
});

test("/api/me remains authority", () => {
  const decision = resolveOwnerSessionHandoff({
    meStatus: 200,
    meClaim: { role: "manager" }
  });

  assert.equal(decision.authority, "/api/me");
});

test("frontend role tamper ignored", () => {
  const decision = resolveOwnerSessionHandoff({
    meStatus: 200,
    meClaim: { role: "staff" },
    frontendRole: "manager"
  });

  assert.equal(decision.action, "REDIRECT");
  assert.equal(decision.destination, EMPLOYEE_DESTINATION);
  assert.equal(decision.authority, "/api/me");
});

test("production cutover remains PRODUCTION_NO_GO", async () => {
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");

  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
  assert.match(readiness, /PRODUCTION_NO_GO/);
});

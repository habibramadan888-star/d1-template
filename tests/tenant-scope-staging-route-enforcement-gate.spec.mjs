import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildTenantScopeRouteScenario,
  resolveTenantScopeRouteEnforcementMode,
  TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG
} from "../modules/tenant/scope.mjs";
import {
  createTenantScopeRouteGateRows,
  summarizeTenantScopeRouteGateRows
} from "../scripts/gate-tenant-scope-staging-route-enforcement.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/tenant-scope/local-staging.json", import.meta.url), "utf8")
);
const stagingFlagOn = {
  APP_ENV: "staging",
  [TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG]: "true"
};

test("production env disables route enforcement gate even when flag is true", () => {
  const mode = resolveTenantScopeRouteEnforcementMode({
    APP_ENV: "production",
    [TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG]: "true"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.productionDisabled, true);
  assert.equal(mode.routeMutationAllowed, false);
});

test("staging flag false keeps legacy mode", () => {
  const mode = resolveTenantScopeRouteEnforcementMode({
    APP_ENV: "staging",
    [TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG]: "false"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.mode, "LEGACY");
});

test("staging flag true enables route enforcement gate mode without mutation", () => {
  const mode = resolveTenantScopeRouteEnforcementMode(stagingFlagOn);

  assert.equal(mode.enabled, true);
  assert.equal(mode.mode, "TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE");
  assert.equal(mode.dashboardMutationAllowed, false);
  assert.equal(mode.routeMutationAllowed, false);
});

test("route gate passes owner and employee allow/deny matrix", () => {
  const rows = createTenantScopeRouteGateRows(fixture, stagingFlagOn);
  const summary = summarizeTenantScopeRouteGateRows(rows);

  assert.equal(summary.overall, "PASS");
  assert.equal(summary.blockedCount, 0);
  assert.equal(rows.length, 11);
});

test("owner cannot use same legacy corpid to access another company route", () => {
  const rows = createTenantScopeRouteGateRows(fixture, stagingFlagOn);
  const deniedHistory = rows.find((row) => row.Scenario === "owner A denied company B history");
  const deniedVoid = rows.find((row) => row.Scenario === "owner A denied company B void");

  assert.equal(deniedHistory.Result, "PASS");
  assert.equal(deniedHistory["Actual Allowed"], "no");
  assert.equal(deniedVoid.Result, "PASS");
  assert.equal(deniedVoid["Actual Allowed"], "no");
});

test("employee routes are property scoped and owner routes remain denied", () => {
  const rows = createTenantScopeRouteGateRows(fixture, stagingFlagOn);
  const allowedEntry = rows.find((row) => row.Scenario === "employee A own property entry");
  const deniedEntry = rows.find((row) => row.Scenario === "employee A denied other property entry");
  const deniedDashboard = rows.find((row) => row.Scenario === "employee A denied owner dashboard");

  assert.equal(allowedEntry["Actual Allowed"], "yes");
  assert.equal(deniedEntry["Actual Allowed"], "no");
  assert.equal(deniedDashboard["Actual Allowed"], "no");
});

test("route scenario blocks if expected decision does not match actual decision", () => {
  const row = buildTenantScopeRouteScenario({
    name: "bad expectation",
    route: "/api/history",
    env: stagingFlagOn,
    actor: fixture.actors.ownerA,
    memberships: fixture.memberships,
    target: { company_id: "company_b", property_id: "property_b_1" },
    action: "HISTORY_READ",
    expectedAllowed: true
  });

  assert.equal(row.Result, "BLOCKED");
});

test("flag-off rollback mode denies gate scenarios rather than mutating routes", () => {
  const row = buildTenantScopeRouteScenario({
    name: "flag off rollback",
    route: "/api/history",
    env: {
      APP_ENV: "staging",
      [TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG]: "false"
    },
    actor: fixture.actors.ownerA,
    memberships: fixture.memberships,
    target: { company_id: "company_a", property_id: "property_a_1" },
    action: "HISTORY_READ",
    expectedAllowed: false
  });

  assert.equal(row.Result, "PASS");
  assert.equal(row.Mode, "LEGACY");
  assert.equal(row["Actual Allowed"], "no");
});

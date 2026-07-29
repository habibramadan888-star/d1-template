import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG,
  TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG,
  resolveTenantScopeDashboardHistoryQueryMode,
  resolveTenantScopeRouteEnforcementMode
} from "../modules/tenant/scope.mjs";
import { createTenantScopeStagingWiringReadinessReport } from "../scripts/gate-tenant-scope-staging-wiring-readiness.mjs";

test("production env disables tenant scope route and query wiring flags", () => {
  const routeMode = resolveTenantScopeRouteEnforcementMode({
    APP_ENV: "production",
    [TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG]: "true"
  });
  const queryMode = resolveTenantScopeDashboardHistoryQueryMode({
    APP_ENV: "production",
    [TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG]: "true"
  });

  assert.equal(routeMode.enabled, false);
  assert.equal(routeMode.productionDisabled, true);
  assert.equal(routeMode.routeMutationAllowed, false);
  assert.equal(queryMode.enabled, false);
  assert.equal(queryMode.productionDisabled, true);
  assert.equal(queryMode.queryMutationAllowed, false);
});

test("staging flag false leaves route and query behavior in legacy mode", () => {
  const routeMode = resolveTenantScopeRouteEnforcementMode({
    APP_ENV: "staging",
    [TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG]: "false"
  });
  const queryMode = resolveTenantScopeDashboardHistoryQueryMode({
    APP_ENV: "staging",
    [TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG]: "false"
  });

  assert.equal(routeMode.enabled, false);
  assert.equal(routeMode.mode, "LEGACY");
  assert.equal(queryMode.enabled, false);
  assert.equal(queryMode.mode, "LEGACY");
});

test("wiring readiness gate passes candidate routes and records manual items", async () => {
  const result = await createTenantScopeStagingWiringReadinessReport();

  assert.equal(result.overall, "PASS");
  assert.equal(result.summary.blockedCount, 0);
  assert.equal(result.summary.candidateCount, 6);
  assert.equal(result.summary.manualRequiredCount, 3);
  assert.equal(result.summary.productionNoGoCount, 1);
  assert.equal(result.routeSummary.overall, "PASS");
  assert.equal(result.querySummary.overall, "PASS");
});

test("approved route candidates are staging-only wiring rehearsal candidates", async () => {
  const result = await createTenantScopeStagingWiringReadinessReport();
  const candidates = result.rows.filter(
    (row) => row.Status === "READY_FOR_STAGING_WIRING_REHEARSAL"
  );
  const routes = candidates.map((row) => row["Route / Area"]);

  assert.deepEqual(routes, [
    "/api/employee/entry POST",
    "/api/staging/handover/commit POST",
    "/api/delete_session POST",
    "/api/rent_config POST",
    "/api/history GET",
    "owner dashboard active totals"
  ]);
  assert.equal(
    candidates.every((row) => row["Live Mutation"] === "no"),
    true
  );
});

test("auth claim and legacy fallback wiring remains manual-required", async () => {
  const result = await createTenantScopeStagingWiringReadinessReport();
  const manualAreas = result.rows
    .filter((row) => row.Status === "MANUAL_REQUIRED")
    .map((row) => row["Route / Area"]);

  assert.deepEqual(manualAreas, [
    "/auth/login and /auth/employee-login",
    "active_sessions membership claims",
    "legacy CORPID fallback removal"
  ]);
});

test("production switch remains no-go in the wiring gate", async () => {
  const result = await createTenantScopeStagingWiringReadinessReport();
  const production = result.rows.find(
    (row) => row["Route / Area"] === "production route/query switch"
  );

  assert.equal(production.Status, "PRODUCTION_NO_GO");
  assert.equal(production["Live Mutation"], "no");
  assert.equal(production["Gate Result"], "PRODUCTION_NO_GO");
});

test("wiring readiness gate source does not call production or D1", () => {
  const source = readFileSync(
    new URL("../scripts/gate-tenant-scope-staging-wiring-readiness.mjs", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /wrangler/i);
  assert.doesNotMatch(source, /d1\s+execute/i);
  assert.doesNotMatch(source, /UPDATE\s+/i);
  assert.doesNotMatch(source, /INSERT\s+/i);
  assert.doesNotMatch(source, /DELETE\s+/i);
});

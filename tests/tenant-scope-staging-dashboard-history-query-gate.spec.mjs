import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildTenantScopeQueryComparison,
  resolveTenantScopeDashboardHistoryQueryMode,
  TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG
} from "../modules/tenant/scope.mjs";
import {
  createTenantScopeDashboardHistoryQueryRows,
  summarizeTenantScopeDashboardHistoryQueryRows
} from "../scripts/gate-tenant-scope-dashboard-history-query.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/tenant-scope/local-staging.json", import.meta.url), "utf8")
);
const stagingFlagOn = {
  APP_ENV: "staging",
  [TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG]: "true"
};

test("production env disables dashboard/history query gate even when flag is true", () => {
  const mode = resolveTenantScopeDashboardHistoryQueryMode({
    APP_ENV: "production",
    [TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG]: "true"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.productionDisabled, true);
  assert.equal(mode.queryMutationAllowed, false);
});

test("staging flag false keeps legacy query mode", () => {
  const mode = resolveTenantScopeDashboardHistoryQueryMode({
    APP_ENV: "staging",
    [TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG]: "false"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.mode, "LEGACY");
  assert.equal(mode.dashboardMutationAllowed, false);
});

test("staging flag true enables query gate mode without live dashboard mutation", () => {
  const mode = resolveTenantScopeDashboardHistoryQueryMode(stagingFlagOn);

  assert.equal(mode.enabled, true);
  assert.equal(mode.mode, "TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE");
  assert.equal(mode.dashboardMutationAllowed, false);
  assert.equal(mode.queryMutationAllowed, false);
});

test("owner A history query removes company B rows from legacy corpid results", () => {
  const row = buildTenantScopeQueryComparison({
    name: "owner A history query",
    query: "history by legacy corpid",
    env: stagingFlagOn,
    actor: fixture.actors.ownerA,
    memberships: fixture.memberships,
    rows: fixture.rows,
    action: "HISTORY_READ"
  });

  assert.equal(row.Result, "PASS");
  assert.match(row["Legacy Rows"], /arrear_b_1/);
  assert.doesNotMatch(row["Scoped Rows"], /arrear_b_1/);
  assert.equal(row["Cross-Tenant Removed"], "arrear_b_1");
});

test("owner B dashboard query keeps only company B rows", () => {
  const row = buildTenantScopeQueryComparison({
    name: "owner B dashboard query",
    query: "dashboard active totals by legacy corpid",
    env: stagingFlagOn,
    actor: fixture.actors.ownerB,
    memberships: fixture.memberships,
    rows: fixture.rows,
    action: "DASHBOARD_READ"
  });

  assert.equal(row.Result, "PASS");
  assert.equal(row["Scoped Rows"], "arrear_b_1");
  assert.match(row["Cross-Tenant Removed"], /session_a_1/);
  assert.match(row["Cross-Tenant Removed"], /transaction_a_2/);
});

test("dashboard/history query gate passes approved owner scenarios", () => {
  const rows = createTenantScopeDashboardHistoryQueryRows(fixture, stagingFlagOn);
  const summary = summarizeTenantScopeDashboardHistoryQueryRows(rows);

  assert.equal(summary.overall, "PASS");
  assert.equal(summary.blockedCount, 0);
  assert.equal(rows.length, 4);
  assert.equal(summary.crossTenantRemovedCount, 6);
});

test("same-tenant row removal blocks query gate", () => {
  const row = buildTenantScopeQueryComparison({
    name: "owner A with inactive memberships",
    query: "history by legacy corpid",
    env: stagingFlagOn,
    actor: fixture.actors.ownerA,
    memberships: [],
    rows: fixture.rows,
    action: "HISTORY_READ"
  });

  assert.equal(row.Result, "BLOCKED");
  assert.match(row["Removed Rows"], /session_a_1/);
});

test("flag-off rollback mode leaves legacy rows and does not mutate dashboard", () => {
  const row = buildTenantScopeQueryComparison({
    name: "flag off rollback",
    query: "history by legacy corpid",
    env: {
      APP_ENV: "staging",
      [TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG]: "false"
    },
    actor: fixture.actors.ownerA,
    memberships: fixture.memberships,
    rows: fixture.rows,
    action: "HISTORY_READ"
  });

  assert.equal(row.Result, "PASS");
  assert.equal(row.Mode, "LEGACY");
  assert.equal(row["Removed Rows"], "none");
});

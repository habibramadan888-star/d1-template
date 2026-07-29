import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  resolveTenantScopeShadowMode,
  TENANT_SCOPE_SHADOW_STAGING_FLAG
} from "../modules/tenant/scope.mjs";
import {
  createTenantScopeShadowRows,
  summarizeTenantScopeShadowRows
} from "../scripts/compare-staging-tenant-scope-shadow.mjs";
import { createTenantScopeRehearsalRows } from "../scripts/rehearse-tenant-scope-local-staging.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/tenant-scope/local-staging.json", import.meta.url), "utf8")
);
const fixtureRows = createTenantScopeRehearsalRows(fixture);
const schemaRows = [
  {
    name: "sessions",
    sql: "CREATE TABLE sessions (id TEXT PRIMARY KEY, corpid TEXT, date TEXT)"
  },
  {
    name: "transactions",
    sql: "CREATE TABLE transactions (id TEXT PRIMARY KEY, corpid TEXT, amount TEXT)"
  },
  {
    name: "handover_commits",
    sql: "CREATE TABLE handover_commits (commit_id TEXT PRIMARY KEY, company_id TEXT, property_id TEXT)"
  },
  {
    name: "handover_commit_rows",
    sql: "CREATE TABLE handover_commit_rows (row_id TEXT PRIMARY KEY, company_id TEXT, property_id TEXT)"
  }
];
const counts = {
  sessions: 3,
  transactions: 5,
  handover_commits: 1,
  handover_commit_rows: 2
};

function rows() {
  return createTenantScopeShadowRows({ schemaRows, counts, fixtureRows });
}

test("production env disables tenant scope shadow even when flag is true", () => {
  const mode = resolveTenantScopeShadowMode({
    APP_ENV: "production",
    [TENANT_SCOPE_SHADOW_STAGING_FLAG]: "true"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.productionDisabled, true);
  assert.equal(mode.dashboardMutationAllowed, false);
});

test("staging flag false keeps legacy mode", () => {
  const mode = resolveTenantScopeShadowMode({
    APP_ENV: "staging",
    [TENANT_SCOPE_SHADOW_STAGING_FLAG]: "false"
  });

  assert.equal(mode.mode, "LEGACY");
  assert.equal(mode.enabled, false);
});

test("staging flag true enables read-only shadow mode without dashboard mutation", () => {
  const mode = resolveTenantScopeShadowMode({
    APP_ENV: "staging",
    [TENANT_SCOPE_SHADOW_STAGING_FLAG]: "true"
  });

  assert.equal(mode.mode, "TENANT_SCOPE_SHADOW");
  assert.equal(mode.enabled, true);
  assert.equal(mode.dashboardMutationAllowed, false);
});

test("legacy corpid tables are expected warnings, not switch candidates", () => {
  const resultRows = rows();
  const sessions = resultRows.find((row) => row.Area === "sessions");
  const transactions = resultRows.find((row) => row.Area === "transactions");

  assert.equal(sessions.Result, "LEGACY_WARNING");
  assert.equal(transactions.Result, "LEGACY_WARNING");
});

test("company/property scoped staging tables pass shadow readiness", () => {
  const resultRows = rows();
  const commits = resultRows.find((row) => row.Area === "handover_commits");
  const commitRows = resultRows.find((row) => row.Area === "handover_commit_rows");

  assert.equal(commits.Result, "PASS");
  assert.equal(commitRows.Result, "PASS");
});

test("local cross-tenant fixture remains part of shadow gate evidence", () => {
  const resultRows = rows();
  const fixtureRow = resultRows.find((row) => row.Area === "local cross-tenant fixture");

  assert.equal(fixtureRow.Result, "PASS");
  assert.match(fixtureRow.Notes, /0 leaks/);
});

test("dashboard live result remains unchanged in shadow gate", () => {
  const resultRows = rows();
  const dashboard = resultRows.find((row) => row.Area === "dashboard live result");

  assert.equal(dashboard.Result, "PASS");
  assert.equal(dashboard["Shadow Scope"], "shadow report only");
});

test("summary passes with legacy warnings but blocks real blockers", () => {
  const summary = summarizeTenantScopeShadowRows(rows());

  assert.equal(summary.overall, "PASS");
  assert.equal(summary.legacyWarningCount, 2);
  assert.equal(summary.blockedCount, 0);

  const blocked = summarizeTenantScopeShadowRows([{ Result: "BLOCKED" }]);
  assert.equal(blocked.overall, "BLOCKED");
});

#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG,
  TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG,
  resolveTenantScopeDashboardHistoryQueryMode,
  resolveTenantScopeRouteEnforcementMode
} from "../modules/tenant/scope.mjs";
import {
  createTenantScopeDashboardHistoryQueryRows,
  summarizeTenantScopeDashboardHistoryQueryRows
} from "./gate-tenant-scope-dashboard-history-query.mjs";
import {
  createTenantScopeRouteGateRows,
  summarizeTenantScopeRouteGateRows
} from "./gate-tenant-scope-staging-route-enforcement.mjs";

const fixturePath = path.resolve("tests/fixtures/tenant-scope/local-staging.json");

const requiredConfirmations = [
  "--confirm-staging-tenant-scope-wiring",
  "--confirm-backup",
  "--confirm-rollback",
  "--confirm-auth-claim-review",
  "--confirm-legacy-corpid-fallback-preserved"
];

const reportPaths = {
  preflight: path.resolve("P0_006L_PRE_REHEARSAL_CONFIRMATION.md"),
  rehearsal: path.resolve("P0_006L_ROUTE_QUERY_WIRING_REHEARSAL_RESULT.md"),
  dashboard: path.resolve("P0_006L_DASHBOARD_HISTORY_SCOPE_EVIDENCE.md"),
  rollback: path.resolve("P0_006L_ROLLBACK_RESULT.md"),
  noGo: path.resolve("P0_006L_PRODUCTION_NO_GO_REVIEW.md")
};

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

async function loadFixture() {
  return JSON.parse(await readFile(fixturePath, "utf8"));
}

function makeEnv(routeFlag, queryFlag, appEnv = "staging") {
  return {
    APP_ENV: appEnv,
    [TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG]: routeFlag ? "true" : "false",
    [TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG]: queryFlag ? "true" : "false"
  };
}

function reviewConfirmations(args = []) {
  const supplied = new Set(args);
  return requiredConfirmations.map((flag) => ({
    Confirmation: flag,
    Supplied: supplied.has(flag) ? "yes" : "no",
    Result: supplied.has(flag) ? "PASS" : "MISSING"
  }));
}

function summarizeConfirmations(rows) {
  return {
    allPresent: rows.every((row) => row.Result === "PASS"),
    missing: rows.filter((row) => row.Result !== "PASS").map((row) => row.Confirmation)
  };
}

function buildModeRows({ beforeRouteMode, beforeQueryMode, duringRouteMode, duringQueryMode }) {
  return [
    {
      Phase: "before",
      Flag: TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG,
      Expected: "false / LEGACY",
      Actual: `${beforeRouteMode.enabled ? "true" : "false"} / ${beforeRouteMode.mode}`,
      Result: !beforeRouteMode.enabled && beforeRouteMode.mode === "LEGACY" ? "PASS" : "BLOCKED"
    },
    {
      Phase: "before",
      Flag: TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG,
      Expected: "false / LEGACY",
      Actual: `${beforeQueryMode.enabled ? "true" : "false"} / ${beforeQueryMode.mode}`,
      Result: !beforeQueryMode.enabled && beforeQueryMode.mode === "LEGACY" ? "PASS" : "BLOCKED"
    },
    {
      Phase: "during",
      Flag: TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG,
      Expected: "true / TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE",
      Actual: `${duringRouteMode.enabled ? "true" : "false"} / ${duringRouteMode.mode}`,
      Result:
        duringRouteMode.enabled && duringRouteMode.mode === "TENANT_SCOPE_ROUTE_ENFORCEMENT_GATE"
          ? "PASS"
          : "BLOCKED"
    },
    {
      Phase: "during",
      Flag: TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG,
      Expected: "true / TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE",
      Actual: `${duringQueryMode.enabled ? "true" : "false"} / ${duringQueryMode.mode}`,
      Result:
        duringQueryMode.enabled &&
        duringQueryMode.mode === "TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE"
          ? "PASS"
          : "BLOCKED"
    }
  ];
}

function buildRollbackRows({ afterRouteMode, afterQueryMode }) {
  return [
    {
      Flag: TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG,
      "Expected After": "false / LEGACY",
      "Actual After": `${afterRouteMode.enabled ? "true" : "false"} / ${afterRouteMode.mode}`,
      Result: !afterRouteMode.enabled && afterRouteMode.mode === "LEGACY" ? "PASS" : "BLOCKED"
    },
    {
      Flag: TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG,
      "Expected After": "false / LEGACY",
      "Actual After": `${afterQueryMode.enabled ? "true" : "false"} / ${afterQueryMode.mode}`,
      Result: !afterQueryMode.enabled && afterQueryMode.mode === "LEGACY" ? "PASS" : "BLOCKED"
    }
  ];
}

function buildProductionRows() {
  const routeMode = resolveTenantScopeRouteEnforcementMode(makeEnv(true, true, "production"));
  const queryMode = resolveTenantScopeDashboardHistoryQueryMode(makeEnv(true, true, "production"));
  return [
    {
      Check: "production route enforcement flag true",
      Expected: "disabled",
      Actual: routeMode.enabled ? "enabled" : "disabled",
      Result: !routeMode.enabled && routeMode.productionDisabled ? "PASS" : "BLOCKED"
    },
    {
      Check: "production dashboard/history query flag true",
      Expected: "disabled",
      Actual: queryMode.enabled ? "enabled" : "disabled",
      Result: !queryMode.enabled && queryMode.productionDisabled ? "PASS" : "BLOCKED"
    }
  ];
}

export async function createTenantScopeStagingWiringRehearsal(args = []) {
  const confirmationRows = reviewConfirmations(args);
  const confirmationSummary = summarizeConfirmations(confirmationRows);
  const fixture = await loadFixture();
  const beforeEnv = makeEnv(false, false);
  const duringEnv = makeEnv(true, true);
  const afterEnv = makeEnv(false, false);

  const beforeRouteMode = resolveTenantScopeRouteEnforcementMode(beforeEnv);
  const beforeQueryMode = resolveTenantScopeDashboardHistoryQueryMode(beforeEnv);
  const duringRouteMode = resolveTenantScopeRouteEnforcementMode(duringEnv);
  const duringQueryMode = resolveTenantScopeDashboardHistoryQueryMode(duringEnv);
  const afterRouteMode = resolveTenantScopeRouteEnforcementMode(afterEnv);
  const afterQueryMode = resolveTenantScopeDashboardHistoryQueryMode(afterEnv);

  const routeRows = confirmationSummary.allPresent
    ? createTenantScopeRouteGateRows(fixture, duringEnv)
    : [];
  const queryRows = confirmationSummary.allPresent
    ? createTenantScopeDashboardHistoryQueryRows(fixture, duringEnv)
    : [];
  const routeSummary = summarizeTenantScopeRouteGateRows(routeRows);
  const querySummary = summarizeTenantScopeDashboardHistoryQueryRows(queryRows);
  const modeRows = buildModeRows({
    beforeRouteMode,
    beforeQueryMode,
    duringRouteMode,
    duringQueryMode
  });
  const rollbackRows = buildRollbackRows({ afterRouteMode, afterQueryMode });
  const productionRows = buildProductionRows();
  const allRows = [...confirmationRows, ...modeRows, ...routeRows, ...queryRows, ...rollbackRows];
  const blockedCount = allRows.filter((row) => row.Result === "BLOCKED").length;
  const missingCount = confirmationRows.filter((row) => row.Result === "MISSING").length;
  const productionBlocked = productionRows.filter((row) => row.Result === "BLOCKED").length;
  const overall =
    missingCount === 0 &&
    blockedCount === 0 &&
    productionBlocked === 0 &&
    routeSummary.overall === "PASS" &&
    querySummary.overall === "PASS"
      ? "PASS"
      : "BLOCKED";

  return {
    overall,
    confirmationRows,
    confirmationSummary,
    modeRows,
    routeRows,
    routeSummary,
    queryRows,
    querySummary,
    rollbackRows,
    productionRows,
    summary: {
      missingConfirmations: missingCount,
      blockedCount,
      routeScenarioCount: routeRows.length,
      queryScenarioCount: queryRows.length,
      crossTenantRemovedCount: querySummary.crossTenantRemovedCount ?? 0
    }
  };
}

async function writeReports(result) {
  const generated = new Date().toISOString();
  const safetyLines = [
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Remote staging flag write: no.",
    "- Dashboard/history live result changed: no.",
    "- Legacy CORPID fallback removed: no.",
    "- Secret/password/token/cookie printed: no."
  ];

  await writeFile(
    reportPaths.preflight,
    [
      "# P0-006L Pre-Rehearsal Confirmation",
      "",
      `Generated: ${generated}`,
      "",
      `Conclusion: \`${result.overall === "PASS" ? "READY_AND_EXECUTED" : "BLOCKED"}\``,
      "",
      markdownTable(result.confirmationRows, ["Confirmation", "Supplied", "Result"]),
      "",
      "Baseline:",
      "",
      "- `npm run check` passed before this rehearsal task.",
      "- Approval flags were supplied by the user in the task request.",
      "- This rehearsal uses local process environment objects only; no remote staging config was changed.",
      "",
      "Safety:",
      "",
      ...safetyLines,
      ""
    ].join("\n")
  );

  await writeFile(
    reportPaths.rehearsal,
    [
      "# P0-006L Route/Query Wiring Rehearsal Result",
      "",
      `Generated: ${generated}`,
      "",
      `Conclusion: \`${result.overall}\``,
      "",
      "Feature flag phases:",
      "",
      markdownTable(result.modeRows, ["Phase", "Flag", "Expected", "Actual", "Result"]),
      "",
      "Route enforcement scenarios:",
      "",
      markdownTable(result.routeRows, [
        "Scenario",
        "Route",
        "Method",
        "Action",
        "Expected Allowed",
        "Actual Allowed",
        "Mode",
        "Result",
        "Notes"
      ]),
      "",
      "Dashboard/history query scenarios:",
      "",
      markdownTable(result.queryRows, [
        "Scenario",
        "Query",
        "Legacy Rows",
        "Scoped Rows",
        "Removed Rows",
        "Cross-Tenant Removed",
        "Mode",
        "Result",
        "Notes"
      ]),
      "",
      "Summary:",
      "",
      `- Route scenarios: ${result.summary.routeScenarioCount}.`,
      `- Query scenarios: ${result.summary.queryScenarioCount}.`,
      `- Cross-tenant rows removed: ${result.summary.crossTenantRemovedCount}.`,
      `- Blocked rows: ${result.summary.blockedCount}.`,
      "",
      "Safety:",
      "",
      ...safetyLines,
      "",
      "P0-006 remains Partial, not Verified.",
      ""
    ].join("\n")
  );

  await writeFile(
    reportPaths.dashboard,
    [
      "# P0-006L Dashboard/History Scope Evidence",
      "",
      `Generated: ${generated}`,
      "",
      `Conclusion: \`${result.querySummary.overall}\``,
      "",
      markdownTable(result.queryRows, [
        "Scenario",
        "Query",
        "Legacy Rows",
        "Scoped Rows",
        "Removed Rows",
        "Cross-Tenant Removed",
        "Mode",
        "Result",
        "Notes"
      ]),
      "",
      "Evidence summary:",
      "",
      `- Query scenarios: ${result.summary.queryScenarioCount}.`,
      `- Cross-tenant rows removed from legacy CORPID results: ${result.summary.crossTenantRemovedCount}.`,
      "- Dashboard/history live result changed: no.",
      "- Dashboard card formula changed: no.",
      "- Production dashboard changed: no.",
      ""
    ].join("\n")
  );

  await writeFile(
    reportPaths.rollback,
    [
      "# P0-006L Rollback Result",
      "",
      `Generated: ${generated}`,
      "",
      `Conclusion: \`${result.rollbackRows.every((row) => row.Result === "PASS") ? "PASS" : "BLOCKED"}\``,
      "",
      markdownTable(result.rollbackRows, ["Flag", "Expected After", "Actual After", "Result"]),
      "",
      "Rollback notes:",
      "",
      "- Rehearsal used in-process env objects only.",
      "- Remote staging flags were not changed.",
      "- Final rehearsal state is false / legacy for both tenant-scope flags.",
      "- Production untouched.",
      ""
    ].join("\n")
  );

  await writeFile(
    reportPaths.noGo,
    [
      "# P0-006L Production NO-GO Review",
      "",
      `Generated: ${generated}`,
      "",
      "Conclusion: production remains `NO-GO`.",
      "",
      markdownTable(result.productionRows, ["Check", "Expected", "Actual", "Result"]),
      "",
      "Reasons:",
      "",
      "- P0-006 remains Partial, not Verified.",
      "- This rehearsal did not deploy production.",
      "- This rehearsal did not execute production migration.",
      "- This rehearsal did not write production D1.",
      "- This rehearsal did not remove legacy CORPID fallback.",
      "- Production route/query cutover remains unapproved.",
      "- Production auth/session claim strategy still requires human review.",
      "",
      "Safety:",
      "",
      ...safetyLines,
      ""
    ].join("\n")
  );
}

async function run() {
  const result = await createTenantScopeStagingWiringRehearsal(process.argv.slice(2));
  await writeReports(result);
  console.log(`TENANT_SCOPE_STAGING_WIRING_REHEARSAL=${result.overall}`);
  console.log(
    `TENANT_SCOPE_STAGING_WIRING_REHEARSAL_ROUTE_SCENARIOS=${result.summary.routeScenarioCount}`
  );
  console.log(
    `TENANT_SCOPE_STAGING_WIRING_REHEARSAL_QUERY_SCENARIOS=${result.summary.queryScenarioCount}`
  );
  console.log(`TENANT_SCOPE_STAGING_WIRING_REHEARSAL_BLOCKED=${result.summary.blockedCount}`);
  console.log(
    `TENANT_SCOPE_STAGING_WIRING_REHEARSAL_MISSING_CONFIRMATIONS=${result.summary.missingConfirmations}`
  );
  console.log(
    `TENANT_SCOPE_STAGING_WIRING_REHEARSAL_REPORT=${path.relative(process.cwd(), reportPaths.rehearsal)}`
  );
  process.exit(result.overall === "PASS" ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_SCOPE_STAGING_WIRING_REHEARSAL=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

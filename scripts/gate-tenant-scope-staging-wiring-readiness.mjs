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
const reportPath = path.resolve("TENANT_SCOPE_STAGING_WIRING_READINESS_GATE_RESULT.md");

const routeEnv = {
  APP_ENV: "staging",
  [TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG]: "true"
};

const queryEnv = {
  APP_ENV: "staging",
  [TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG]: "true"
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

function summarizeRows(rows) {
  return {
    candidateCount: rows.filter((row) => row.Status === "READY_FOR_STAGING_WIRING_REHEARSAL")
      .length,
    manualRequiredCount: rows.filter((row) => row.Status === "MANUAL_REQUIRED").length,
    productionNoGoCount: rows.filter((row) => row.Status === "PRODUCTION_NO_GO").length,
    blockedCount: rows.filter((row) => row.Status === "BLOCKED").length
  };
}

function makeCandidateRows({ routeSummary, querySummary, routeMode, queryMode }) {
  const routeGatePass = routeSummary.overall === "PASS" && routeMode.enabled === true;
  const queryGatePass = querySummary.overall === "PASS" && queryMode.enabled === true;
  const routeStatus = routeGatePass ? "READY_FOR_STAGING_WIRING_REHEARSAL" : "BLOCKED";
  const queryStatus = queryGatePass ? "READY_FOR_STAGING_WIRING_REHEARSAL" : "BLOCKED";

  return [
    {
      "Route / Area": "/api/employee/entry POST",
      "Wiring Type": "route enforcement",
      "Required Flag": TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG,
      "Source Gate": "tenant-scope-route-enforcement",
      "Gate Result": routeSummary.overall,
      "Live Mutation": "no",
      Status: routeStatus,
      Notes:
        "Employee write can enter a staging wiring rehearsal only behind route scope enforcement."
    },
    {
      "Route / Area": "/api/staging/handover/commit POST",
      "Wiring Type": "route enforcement",
      "Required Flag": TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG,
      "Source Gate": "tenant-scope-route-enforcement",
      "Gate Result": routeSummary.overall,
      "Live Mutation": "no",
      Status: routeStatus,
      Notes:
        "Staging handover submit can rehearse tenant scope enforcement; production remains disabled."
    },
    {
      "Route / Area": "/api/delete_session POST",
      "Wiring Type": "route enforcement",
      "Required Flag": TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG,
      "Source Gate": "tenant-scope-route-enforcement",
      "Gate Result": routeSummary.overall,
      "Live Mutation": "no",
      Status: routeStatus,
      Notes: "Void path must enforce owner membership before any future live scope switch."
    },
    {
      "Route / Area": "/api/rent_config POST",
      "Wiring Type": "route enforcement",
      "Required Flag": TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG,
      "Source Gate": "tenant-scope-route-enforcement",
      "Gate Result": routeSummary.overall,
      "Live Mutation": "no",
      Status: routeStatus,
      Notes:
        "Rent config write is a staging rehearsal candidate; effective-date modeling remains separate."
    },
    {
      "Route / Area": "/api/history GET",
      "Wiring Type": "dashboard/history query scope",
      "Required Flag": TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG,
      "Source Gate": "tenant-scope-dashboard-history-query",
      "Gate Result": querySummary.overall,
      "Live Mutation": "no",
      Status: queryStatus,
      Notes:
        "History read can rehearse scoped query output while preserving legacy dashboard behavior."
    },
    {
      "Route / Area": "owner dashboard active totals",
      "Wiring Type": "dashboard/history query scope",
      "Required Flag": TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG,
      "Source Gate": "tenant-scope-dashboard-history-query",
      "Gate Result": querySummary.overall,
      "Live Mutation": "no",
      Status: queryStatus,
      Notes:
        "Dashboard active rows can be shadow-scoped; live card formula must not change in this gate."
    },
    {
      "Route / Area": "/auth/login and /auth/employee-login",
      "Wiring Type": "auth claim source",
      "Required Flag": "n/a",
      "Source Gate": "manual review",
      "Gate Result": "not executed",
      "Live Mutation": "no",
      Status: "MANUAL_REQUIRED",
      Notes: "Session claim shape and membership source need human review before live auth wiring."
    },
    {
      "Route / Area": "active_sessions membership claims",
      "Wiring Type": "auth/session compatibility",
      "Required Flag": "n/a",
      "Source Gate": "manual review",
      "Gate Result": "not executed",
      "Live Mutation": "no",
      Status: "MANUAL_REQUIRED",
      Notes:
        "Staging backfill scoped rows exist, but session claim propagation is not wired in this task."
    },
    {
      "Route / Area": "legacy CORPID fallback removal",
      "Wiring Type": "legacy compatibility",
      "Required Flag": "n/a",
      "Source Gate": "manual review",
      "Gate Result": "not executed",
      "Live Mutation": "no",
      Status: "MANUAL_REQUIRED",
      Notes:
        "Legacy CORPID fallback must remain until production migration, rollback, and support plan are approved."
    },
    {
      "Route / Area": "production route/query switch",
      "Wiring Type": "production cutover",
      "Required Flag": "n/a",
      "Source Gate": "commercial launch gate",
      "Gate Result": "PRODUCTION_NO_GO",
      "Live Mutation": "no",
      Status: "PRODUCTION_NO_GO",
      Notes: "Production deployment, migration, D1 write, and cutover remain forbidden."
    }
  ];
}

export async function createTenantScopeStagingWiringReadinessReport() {
  const fixture = await loadFixture();
  const routeRows = createTenantScopeRouteGateRows(fixture, routeEnv);
  const queryRows = createTenantScopeDashboardHistoryQueryRows(fixture, queryEnv);
  const routeSummary = summarizeTenantScopeRouteGateRows(routeRows);
  const querySummary = summarizeTenantScopeDashboardHistoryQueryRows(queryRows);
  const routeMode = resolveTenantScopeRouteEnforcementMode(routeEnv);
  const queryMode = resolveTenantScopeDashboardHistoryQueryMode(queryEnv);
  const rows = makeCandidateRows({ routeSummary, querySummary, routeMode, queryMode });
  const summary = summarizeRows(rows);
  const overall = summary.blockedCount === 0 ? "PASS" : "BLOCKED";

  return {
    overall,
    rows,
    routeSummary,
    querySummary,
    summary
  };
}

async function run() {
  const result = await createTenantScopeStagingWiringReadinessReport();
  const report = [
    "# Tenant Scope Staging Wiring Readiness Gate Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: staging/local-only tenant scope route and dashboard/history query wiring readiness. This script uses static fixtures and existing gate helpers only. It does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.",
    "",
    `Overall: \`${result.overall}\``,
    "",
    markdownTable(result.rows, [
      "Route / Area",
      "Wiring Type",
      "Required Flag",
      "Source Gate",
      "Gate Result",
      "Live Mutation",
      "Status",
      "Notes"
    ]),
    "",
    "Summary:",
    "",
    `- Ready for staging wiring rehearsal: ${result.summary.candidateCount}.`,
    `- Manual required items: ${result.summary.manualRequiredCount}.`,
    `- Production NO-GO items: ${result.summary.productionNoGoCount}.`,
    `- Blocked items: ${result.summary.blockedCount}.`,
    `- Route enforcement gate: ${result.routeSummary.overall}.`,
    `- Dashboard/history query gate: ${result.querySummary.overall}.`,
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Staging schema migration: no.",
    "- Staging backfill write: no.",
    "- Dashboard/history live result changed: no.",
    "- Legacy CORPID fallback removed: no.",
    "- Secret/password/token/cookie printed: no.",
    "",
    "Production meaning:",
    "",
    "- P0-006 remains Partial, not Verified.",
    "- This gate proves only local/staging wiring readiness for approved route/query candidates.",
    "- Any staging runtime wiring rehearsal still requires explicit human approval, feature flags, rollback, and no production action.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`TENANT_SCOPE_STAGING_WIRING_GATE=${result.overall}`);
  console.log(`TENANT_SCOPE_STAGING_WIRING_READY=${result.summary.candidateCount}`);
  console.log(`TENANT_SCOPE_STAGING_WIRING_MANUAL_REQUIRED=${result.summary.manualRequiredCount}`);
  console.log(`TENANT_SCOPE_STAGING_WIRING_PRODUCTION_NO_GO=${result.summary.productionNoGoCount}`);
  console.log(`TENANT_SCOPE_STAGING_WIRING_BLOCKED=${result.summary.blockedCount}`);
  console.log(`TENANT_SCOPE_STAGING_WIRING_REPORT=${path.relative(process.cwd(), reportPath)}`);
  process.exit(result.overall === "PASS" ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_SCOPE_STAGING_WIRING_GATE=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

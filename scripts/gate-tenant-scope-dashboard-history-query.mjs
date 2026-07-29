#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ACTIONS,
  buildTenantScopeQueryComparison,
  TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG
} from "../modules/tenant/scope.mjs";

const fixturePath = path.resolve("tests/fixtures/tenant-scope/local-staging.json");
const reportPath = path.resolve("TENANT_SCOPE_STAGING_DASHBOARD_HISTORY_QUERY_GATE_RESULT.md");

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

export function createTenantScopeDashboardHistoryQueryRows(
  fixture,
  env = {
    APP_ENV: "staging",
    [TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG]: "true"
  }
) {
  return [
    buildTenantScopeQueryComparison({
      name: "owner A history query removes company B rows",
      query: "history by legacy corpid",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      rows: fixture.rows,
      action: ACTIONS.HISTORY_READ
    }),
    buildTenantScopeQueryComparison({
      name: "owner B history query removes company A rows",
      query: "history by legacy corpid",
      env,
      actor: fixture.actors.ownerB,
      memberships: fixture.memberships,
      rows: fixture.rows,
      action: ACTIONS.HISTORY_READ
    }),
    buildTenantScopeQueryComparison({
      name: "owner A dashboard query removes company B rows",
      query: "dashboard active totals by legacy corpid",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      rows: fixture.rows,
      action: ACTIONS.DASHBOARD_READ
    }),
    buildTenantScopeQueryComparison({
      name: "owner B dashboard query removes company A rows",
      query: "dashboard active totals by legacy corpid",
      env,
      actor: fixture.actors.ownerB,
      memberships: fixture.memberships,
      rows: fixture.rows,
      action: ACTIONS.DASHBOARD_READ
    })
  ];
}

export function summarizeTenantScopeDashboardHistoryQueryRows(rows) {
  const blocked = rows.filter((row) => row.Result === "BLOCKED");
  const crossTenantRemoved = rows.reduce((count, row) => {
    if (row["Cross-Tenant Removed"] === "none") return count;
    return count + row["Cross-Tenant Removed"].split(",").filter(Boolean).length;
  }, 0);
  return {
    overall: blocked.length ? "BLOCKED" : "PASS",
    blockedCount: blocked.length,
    crossTenantRemovedCount: crossTenantRemoved,
    scenarioCount: rows.length
  };
}

async function run() {
  const fixture = await loadFixture();
  const rows = createTenantScopeDashboardHistoryQueryRows(fixture);
  const summary = summarizeTenantScopeDashboardHistoryQueryRows(rows);
  const report = [
    "# Tenant Scope Staging Dashboard/History Query Gate Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: staging/local-only dashboard and history query gate using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.",
    "",
    `Feature flag: \`${TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING_FLAG}\``,
    `Overall: \`${summary.overall}\``,
    "",
    markdownTable(rows, [
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
    `- Scenario count: ${summary.scenarioCount}.`,
    `- Blocked scenarios: ${summary.blockedCount}.`,
    `- Cross-tenant rows removed from legacy CORPID result: ${summary.crossTenantRemovedCount}.`,
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Dashboard/history live result changed: no.",
    "- Production auth behavior changed: no.",
    "- Legacy CORPID fallback removed: no.",
    "- Secret/password/token/cookie printed: no.",
    "",
    "Production meaning:",
    "",
    "- P0-006 remains Partial, not Verified.",
    "- This gate proves only local/staging dashboard/history query scoping readiness.",
    "- Production remains blocked until migration, backfill, live query wiring, and human tenancy decisions are approved.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE=${summary.overall}`);
  console.log(`TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_SCENARIOS=${summary.scenarioCount}`);
  console.log(`TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_BLOCKED=${summary.blockedCount}`);
  console.log(
    `TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_CROSS_TENANT_REMOVED=${summary.crossTenantRemovedCount}`
  );
  console.log(
    `TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_REPORT=${path.relative(process.cwd(), reportPath)}`
  );
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_GATE=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

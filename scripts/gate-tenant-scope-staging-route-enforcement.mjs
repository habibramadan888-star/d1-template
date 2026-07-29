#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ACTIONS,
  buildTenantScopeRouteScenario,
  TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG
} from "../modules/tenant/scope.mjs";

const fixturePath = path.resolve("tests/fixtures/tenant-scope/local-staging.json");
const reportPath = path.resolve("TENANT_SCOPE_STAGING_ROUTE_ENFORCEMENT_GATE_RESULT.md");

function target(companyId, propertyId) {
  return { company_id: companyId, property_id: propertyId, corpid: "homelink" };
}

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

export function createTenantScopeRouteGateRows(
  fixture,
  env = {
    APP_ENV: "staging",
    [TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG]: "true"
  }
) {
  return [
    buildTenantScopeRouteScenario({
      name: "owner A history own property",
      route: "/api/history",
      method: "GET",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.HISTORY_READ,
      expectedAllowed: true
    }),
    buildTenantScopeRouteScenario({
      name: "owner A denied company B history",
      route: "/api/history",
      method: "GET",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      target: target("company_b", "property_b_1"),
      action: ACTIONS.HISTORY_READ,
      expectedAllowed: false
    }),
    buildTenantScopeRouteScenario({
      name: "employee A own property entry",
      route: "/api/employee/entry",
      method: "POST",
      env,
      actor: fixture.actors.employeeA1,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      expectedAllowed: true
    }),
    buildTenantScopeRouteScenario({
      name: "employee A denied other property entry",
      route: "/api/employee/entry",
      method: "POST",
      env,
      actor: fixture.actors.employeeA1,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_2"),
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      expectedAllowed: false
    }),
    buildTenantScopeRouteScenario({
      name: "employee A denied owner dashboard",
      route: "/api/history",
      method: "GET",
      env,
      actor: fixture.actors.employeeA1,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.DASHBOARD_READ,
      expectedAllowed: false
    }),
    buildTenantScopeRouteScenario({
      name: "owner A rent config write own company",
      route: "/api/rent_config",
      method: "POST",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.RENT_CONFIG_WRITE,
      expectedAllowed: true
    }),
    buildTenantScopeRouteScenario({
      name: "employee A denied rent config write",
      route: "/api/rent_config",
      method: "POST",
      env,
      actor: fixture.actors.employeeA1,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.RENT_CONFIG_WRITE,
      expectedAllowed: false
    }),
    buildTenantScopeRouteScenario({
      name: "owner A void own session",
      route: "/api/delete_session",
      method: "POST",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.VOID_SESSION,
      expectedAllowed: true
    }),
    buildTenantScopeRouteScenario({
      name: "owner A denied company B void",
      route: "/api/delete_session",
      method: "POST",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      target: target("company_b", "property_b_1"),
      action: ACTIONS.VOID_SESSION,
      expectedAllowed: false
    }),
    buildTenantScopeRouteScenario({
      name: "employee A staging handover own property",
      route: "/api/staging/handover/commit",
      method: "POST",
      env,
      actor: fixture.actors.employeeA1,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      expectedAllowed: true
    }),
    buildTenantScopeRouteScenario({
      name: "owner A denied staging handover submit",
      route: "/api/staging/handover/commit",
      method: "POST",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      expectedAllowed: false
    })
  ];
}

export function summarizeTenantScopeRouteGateRows(rows) {
  const blocked = rows.filter((row) => row.Result === "BLOCKED");
  return {
    overall: blocked.length ? "BLOCKED" : "PASS",
    blockedCount: blocked.length,
    scenarioCount: rows.length
  };
}

async function run() {
  const fixture = await loadFixture();
  const rows = createTenantScopeRouteGateRows(fixture);
  const summary = summarizeTenantScopeRouteGateRows(rows);
  const report = [
    "# Tenant Scope Staging Route Enforcement Gate Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: staging/local-only tenant scope route enforcement gate using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.",
    "",
    `Feature flag: \`${TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING_FLAG}\``,
    `Overall: \`${summary.overall}\``,
    "",
    markdownTable(rows, [
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
    "Summary:",
    "",
    `- Scenario count: ${summary.scenarioCount}.`,
    `- Blocked scenarios: ${summary.blockedCount}.`,
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Production auth behavior changed: no.",
    "- Legacy CORPID fallback removed: no.",
    "- Dashboard/history live result changed: no.",
    "- Secret/password/token/cookie printed: no.",
    "",
    "Production meaning:",
    "",
    "- P0-006 remains Partial, not Verified.",
    "- This gate proves only local/staging route enforcement policy readiness.",
    "- Production remains blocked until route wiring, migration, backfill, dashboard/history evidence, and human tenancy decisions are approved.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`TENANT_SCOPE_STAGING_ROUTE_ENFORCEMENT_GATE=${summary.overall}`);
  console.log(`TENANT_SCOPE_STAGING_ROUTE_ENFORCEMENT_SCENARIOS=${summary.scenarioCount}`);
  console.log(`TENANT_SCOPE_STAGING_ROUTE_ENFORCEMENT_BLOCKED=${summary.blockedCount}`);
  console.log(
    `TENANT_SCOPE_STAGING_ROUTE_ENFORCEMENT_REPORT=${path.relative(process.cwd(), reportPath)}`
  );
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(
      `TENANT_SCOPE_STAGING_ROUTE_ENFORCEMENT_GATE=BLOCKED: ${error?.message || error}`
    );
    process.exit(1);
  });
}

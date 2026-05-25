#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ACTIONS,
  buildTenantScopeScenario,
  summarizeTenantScopeScenarios
} from "../modules/tenant/scope.mjs";

const fixturePath = path.resolve("tests/fixtures/tenant-scope/local-staging.json");
const reportPath = path.resolve("TENANT_SCOPE_LOCAL_STAGING_REHEARSAL_RESULT.md");

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

export function createTenantScopeRehearsalRows(fixture, env = { APP_ENV: "staging" }) {
  return [
    buildTenantScopeScenario({
      name: "owner A dashboard own property",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.DASHBOARD_READ,
      rows: fixture.rows,
      expectedAllowed: true
    }),
    buildTenantScopeScenario({
      name: "owner A denied company B dashboard",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      target: target("company_b", "property_b_1"),
      action: ACTIONS.DASHBOARD_READ,
      rows: fixture.rows,
      expectedAllowed: false
    }),
    buildTenantScopeScenario({
      name: "employee A assigned property entry",
      env,
      actor: fixture.actors.employeeA1,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      rows: fixture.rows,
      expectedAllowed: true
    }),
    buildTenantScopeScenario({
      name: "employee A denied property A2 entry",
      env,
      actor: fixture.actors.employeeA1,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_2"),
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      rows: fixture.rows,
      expectedAllowed: false
    }),
    buildTenantScopeScenario({
      name: "employee A denied owner dashboard",
      env,
      actor: fixture.actors.employeeA1,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.DASHBOARD_READ,
      rows: fixture.rows,
      expectedAllowed: false
    }),
    buildTenantScopeScenario({
      name: "same bed and CID isolated by tenant",
      env,
      actor: fixture.actors.ownerA,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.HISTORY_READ,
      rows: fixture.rows,
      expectedAllowed: true
    }),
    buildTenantScopeScenario({
      name: "orphan session denied",
      env,
      actor: fixture.actors.orphan,
      memberships: fixture.memberships,
      target: target("company_a", "property_a_1"),
      action: ACTIONS.DASHBOARD_READ,
      rows: fixture.rows,
      expectedAllowed: false
    })
  ];
}

async function run() {
  const fixture = await loadFixture();
  const rows = createTenantScopeRehearsalRows(fixture);
  const summary = summarizeTenantScopeScenarios(rows);
  const report = [
    "# Tenant Scope Local/Staging Rehearsal Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: local/staging-only tenant/property scope rehearsal using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard output, or change auth behavior.",
    "",
    `Overall: \`${summary.overall}\``,
    "",
    markdownTable(rows, [
      "Scenario",
      "Action",
      "Expected Allowed",
      "Actual Allowed",
      "Visible Rows",
      "Leaked Rows",
      "Result",
      "Notes"
    ]),
    "",
    "Summary:",
    "",
    `- Scenario count: ${summary.scenarioCount}.`,
    `- Blocked scenarios: ${summary.blockedCount}.`,
    `- Data leak scenarios: ${summary.leakCount}.`,
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Production login behavior changed: no.",
    "- Legacy CORPID fallback removed: no.",
    "- Dashboard/history live result changed: no.",
    "- Secret/password/token/cookie printed: no.",
    "",
    "Production meaning:",
    "",
    "- P0-006 remains Partial, not Verified.",
    "- This rehearsal proves local/staging scope helpers and fixtures only.",
    "- Production remains blocked until migration, backfill, live route enforcement, and human tenancy decisions are approved.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`TENANT_SCOPE_LOCAL_STAGING_REHEARSAL=${summary.overall}`);
  console.log(`TENANT_SCOPE_LOCAL_STAGING_SCENARIOS=${summary.scenarioCount}`);
  console.log(`TENANT_SCOPE_LOCAL_STAGING_LEAKS=${summary.leakCount}`);
  console.log(`TENANT_SCOPE_LOCAL_STAGING_REPORT=${path.relative(process.cwd(), reportPath)}`);
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_SCOPE_LOCAL_STAGING_REHEARSAL=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

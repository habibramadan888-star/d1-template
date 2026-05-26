#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ACCESS_MATRIX_FLAG,
  createTenantScopeAccessMatrixGate,
  resolveAccessMatrixMode
} from "./rehearse-tenant-scope-access-matrix.mjs";

const reportPath = path.resolve("TENANT_SCOPE_STAGING_ACCESS_MATRIX_REHEARSAL_RESULT.md");

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

function mapResult(row) {
  if (row.Actual === "MANUAL_REQUIRED") return "MANUAL_REQUIRED";
  if (row.Actual === "LEGACY_WARNING") return "LEGACY_WARNING";
  if (row.Actual === "NOT_APPLICABLE") return "NOT_APPLICABLE";
  return row.Result === "PASS" ? "PASS" : "FAIL";
}

function toRehearsalRow(row) {
  return {
    Scenario: row.Scenario,
    Role: row.Role,
    Resource: row.Resource,
    Expected: row.Expected,
    Actual: row.Actual,
    Result: mapResult(row),
    Notes: row.Notes
  };
}

export function createTenantScopeStagingAccessMatrixRehearsal() {
  const gate = createTenantScopeAccessMatrixGate();
  const rows = gate.rows.map(toRehearsalRow);
  const failRows = rows.filter((row) => row.Result === "FAIL");
  const manualRequiredRows = rows.filter((row) => row.Result === "MANUAL_REQUIRED");
  const notApplicableRows = rows.filter((row) => row.Result === "NOT_APPLICABLE");
  const legacyWarningRows = rows.filter((row) => row.Result === "LEGACY_WARNING");
  const passRows = rows.filter((row) => row.Result === "PASS");
  const flagAfter = resolveAccessMatrixMode({
    APP_ENV: "staging",
    [ACCESS_MATRIX_FLAG]: "false"
  });

  return {
    overall: failRows.length ? "BLOCKED" : "PASS",
    rows,
    modeRows: gate.modeRows,
    summary: {
      totalScenarios: rows.length,
      passCount: passRows.length,
      manualRequiredCount: manualRequiredRows.length,
      failCount: failRows.length,
      notApplicableCount: notApplicableRows.length,
      legacyWarningCount: legacyWarningRows.length,
      missingCoverageCount: manualRequiredRows.length,
      crossTenantDenied: gate.summary.crossTenantDenied,
      crossPropertyDenied: gate.summary.crossPropertyDenied,
      frontendTamperIgnored: gate.summary.frontendTamperIgnored,
      legacyFallbackWarning: gate.summary.legacyFallbackWarning,
      finalFlagFalse: !flagAfter.enabled && flagAfter.mode === "LEGACY"
    }
  };
}

async function writeReport(result) {
  const report = [
    "# Tenant Scope Staging Access Matrix Rehearsal Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Overall: \`${result.overall}\``,
    "",
    "Scope: staging/local-only access matrix rehearsal using deterministic test claims and resource fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, remove legacy CORPID fallback, or print secrets.",
    "",
    "Feature flag phases:",
    "",
    markdownTable(result.modeRows, ["Phase", "Flag", "Expected", "Actual", "Result"]),
    "",
    "Rehearsal scenarios:",
    "",
    markdownTable(result.rows, [
      "Scenario",
      "Role",
      "Resource",
      "Expected",
      "Actual",
      "Result",
      "Notes"
    ]),
    "",
    "Summary:",
    "",
    `- Total scenarios: ${result.summary.totalScenarios}.`,
    `- PASS count: ${result.summary.passCount}.`,
    `- MANUAL_REQUIRED count: ${result.summary.manualRequiredCount}.`,
    `- FAIL count: ${result.summary.failCount}.`,
    `- NOT_APPLICABLE count: ${result.summary.notApplicableCount}.`,
    `- LEGACY_WARNING count: ${result.summary.legacyWarningCount}.`,
    `- Missing coverage count: ${result.summary.missingCoverageCount}.`,
    `- Cross-tenant denied: ${result.summary.crossTenantDenied ? "yes" : "no"}.`,
    `- Cross-property denied: ${result.summary.crossPropertyDenied ? "yes" : "no"}.`,
    `- Frontend tenant_id tamper ignored: ${result.summary.frontendTamperIgnored ? "yes" : "no"}.`,
    `- Legacy CORPID fallback warning preserved: ${result.summary.legacyFallbackWarning ? "yes" : "no"}.`,
    `- Final access matrix flag false / legacy: ${result.summary.finalFlagFalse ? "yes" : "no"}.`,
    "",
    result.summary.manualRequiredCount
      ? [
          "Manual-required rows:",
          "",
          "- Manual-required rows remain; review scenario table above."
        ].join("\n")
      : [
          "Coverage closure:",
          "",
          "- `audit_logs`: P0-006Q2 staging QA evidence rows close staging access matrix coverage.",
          "- `entry_events`: P0-006Q2 staging QA evidence rows close staging access matrix coverage.",
          "- Missing coverage count: 0."
        ].join("\n"),
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Remote feature flag changed: no.",
    "- Dashboard/history live result changed: no.",
    "- Live financial formula changed: no.",
    "- Legacy CORPID fallback removed: no.",
    "- Secret/password/token/cookie printed: no.",
    "",
    "Production meaning:",
    "",
    "- P0-006 remains Partial, not Verified.",
    "- Access matrix rehearsal success does not imply production readiness.",
    "- Production migration, production deploy, production backfill, live auth wiring, and production cutover remain unapproved.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
}

async function run() {
  const result = createTenantScopeStagingAccessMatrixRehearsal();
  await writeReport(result);
  console.log(`TENANT_SCOPE_STAGING_ACCESS_MATRIX_REHEARSAL=${result.overall}`);
  console.log(`TENANT_SCOPE_STAGING_ACCESS_MATRIX_SCENARIOS=${result.summary.totalScenarios}`);
  console.log(`TENANT_SCOPE_STAGING_ACCESS_MATRIX_PASS=${result.summary.passCount}`);
  console.log(
    `TENANT_SCOPE_STAGING_ACCESS_MATRIX_MANUAL_REQUIRED=${result.summary.manualRequiredCount}`
  );
  console.log(`TENANT_SCOPE_STAGING_ACCESS_MATRIX_FAIL=${result.summary.failCount}`);
  console.log(
    `TENANT_SCOPE_STAGING_ACCESS_MATRIX_NOT_APPLICABLE=${result.summary.notApplicableCount}`
  );
  console.log(
    `TENANT_SCOPE_STAGING_ACCESS_MATRIX_LEGACY_WARNING=${result.summary.legacyWarningCount}`
  );
  console.log(
    `TENANT_SCOPE_STAGING_ACCESS_MATRIX_CROSS_TENANT_DENIED=${result.summary.crossTenantDenied ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_STAGING_ACCESS_MATRIX_CROSS_PROPERTY_DENIED=${result.summary.crossPropertyDenied ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_STAGING_ACCESS_MATRIX_FRONTEND_TAMPER_IGNORED=${result.summary.frontendTamperIgnored ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_STAGING_ACCESS_MATRIX_FLAG_FINAL_FALSE=${result.summary.finalFlagFalse ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_STAGING_ACCESS_MATRIX_REPORT=${path.relative(process.cwd(), reportPath)}`
  );
  process.exit(result.overall === "PASS" ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(
      `TENANT_SCOPE_STAGING_ACCESS_MATRIX_REHEARSAL=BLOCKED: ${error?.message || error}`
    );
    process.exit(1);
  });
}

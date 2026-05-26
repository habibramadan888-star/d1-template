#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ALL_PROPERTY,
  assertTenantScopedAccess,
  buildTenantScopeClaim,
  claimToTenantScopeActor,
  claimToTenantScopeMemberships,
  classifyClaimScopeRisk,
  deriveTenantScopeFromLegacyUser,
  formatTenantScopeAudit,
  validateTenantScopeClaim
} from "../modules/auth/tenant-claims.mjs";
import { ACTIONS, authorizeTenantScope } from "../modules/tenant/scope.mjs";

const reportPath = path.resolve("TENANT_SCOPE_AUTH_CLAIM_REHEARSAL_RESULT.md");

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

function claimSummary(claim) {
  return [
    `sub=${claim.sub || "missing"}`,
    `role=${claim.role || "missing"}`,
    `tenant=${claim.tenant_id || "missing"}`,
    `corp=${claim.corp_id || "missing"}`,
    `properties=${claim.allowed_property_ids?.join(",") || "none"}`
  ].join("; ");
}

function scenario(name, claim, expected, result, notes) {
  return {
    Scenario: name,
    Claim: claimSummary(claim),
    Expected: expected,
    Result: result,
    Notes: notes
  };
}

export function createTenantScopeAuthClaimRehearsal() {
  const employee = buildTenantScopeClaim({
    userid: "employee_a_1",
    role: "staff",
    employee_id: "employee_a_1",
    tenant_id: "company_a",
    corpid: "homelink",
    allowed_property_ids: ["property_a_1"]
  });
  const owner = buildTenantScopeClaim({
    userid: "owner_a",
    role: "owner",
    owner_id: "owner_a",
    tenant_id: "company_a",
    corpid: "homelink",
    allowed_property_ids: [ALL_PROPERTY]
  });
  const manager = buildTenantScopeClaim({
    userid: "manager_a",
    role: "manager",
    manager_id: "manager_a",
    tenant_id: "company_a",
    allowed_property_ids: ["property_a_1"]
  });
  const legacyEmployee = deriveTenantScopeFromLegacyUser(
    {
      userid: "employee_legacy",
      role: "staff",
      employee_id: "employee_legacy",
      corpid: "homelink"
    },
    { allowed_property_ids: ["property_a_1"] }
  );
  const frontendTampered = buildTenantScopeClaim(
    {
      userid: "employee_a_1",
      role: "staff",
      employee_id: "employee_a_1",
      tenant_id: "company_a",
      allowed_property_ids: ["property_a_1"]
    },
    { frontEndTenantId: "company_b" }
  );

  const employeeValidation = validateTenantScopeClaim(employee, { appEnv: "staging" });
  const ownerValidation = validateTenantScopeClaim(owner, { appEnv: "staging" });
  const managerValidation = validateTenantScopeClaim(manager, { appEnv: "staging" });
  const legacyStagingValidation = validateTenantScopeClaim(legacyEmployee, { appEnv: "staging" });
  const legacyProductionValidation = validateTenantScopeClaim(legacyEmployee, {
    appEnv: "production"
  });
  const ownAccess = assertTenantScopedAccess(employee, {
    tenant_id: "company_a",
    property_id: "property_a_1",
    action: ACTIONS.EMPLOYEE_ENTRY_WRITE
  });
  const crossTenantAccess = assertTenantScopedAccess(owner, {
    tenant_id: "company_b",
    property_id: "property_b_1",
    action: ACTIONS.HISTORY_READ
  });
  const crossPropertyAccess = assertTenantScopedAccess(manager, {
    tenant_id: "company_a",
    property_id: "property_a_2",
    action: ACTIONS.RENT_CONFIG_WRITE
  });
  const actor = claimToTenantScopeActor(employee);
  const memberships = claimToTenantScopeMemberships(employee);
  const routeAuth = authorizeTenantScope({
    env: { APP_ENV: "staging" },
    actor,
    memberships,
    target: { company_id: "company_a", property_id: "property_a_1" },
    action: ACTIONS.EMPLOYEE_ENTRY_WRITE
  });

  const rows = [
    scenario(
      "employee tenant claim",
      employee,
      "valid staging employee claim",
      employeeValidation.valid ? "PASS" : "BLOCKED",
      formatTenantScopeAudit(employee, { appEnv: "staging" }).warnings
    ),
    scenario(
      "owner tenant claim",
      owner,
      "valid staging owner claim",
      ownerValidation.valid ? "PASS" : "BLOCKED",
      formatTenantScopeAudit(owner, { appEnv: "staging" }).warnings
    ),
    scenario(
      "manager property-constrained claim",
      manager,
      "valid manager claim constrained to property_a_1",
      managerValidation.valid ? "PASS" : "BLOCKED",
      "manager/admin claims must carry tenant and explicit property constraints"
    ),
    scenario(
      "missing tenant staging fallback",
      legacyEmployee,
      "legacy warning, not production-ready",
      legacyStagingValidation.warnings.includes("LEGACY_CORPID_FALLBACK") ? "PASS" : "BLOCKED",
      classifyClaimScopeRisk(legacyEmployee, { appEnv: "staging" })
    ),
    scenario(
      "missing tenant production behavior",
      legacyEmployee,
      "blocked in production",
      legacyProductionValidation.blocked ? "PASS" : "BLOCKED",
      legacyProductionValidation.errors.join(",")
    ),
    scenario(
      "frontend tenant tampering ignored",
      frontendTampered,
      "claim tenant remains server-side company_a",
      frontendTampered.tenant_id === "company_a" ? "PASS" : "BLOCKED",
      "front-end tenant_id is not accepted as authority"
    ),
    scenario(
      "own property employee access",
      employee,
      "allowed",
      ownAccess.allowed ? "PASS" : "BLOCKED",
      ownAccess.reason
    ),
    scenario(
      "cross-tenant owner access",
      owner,
      "denied",
      !crossTenantAccess.allowed && crossTenantAccess.reason === "CROSS_TENANT_DENIED"
        ? "PASS"
        : "BLOCKED",
      crossTenantAccess.reason
    ),
    scenario(
      "cross-property manager access",
      manager,
      "denied",
      !crossPropertyAccess.allowed && crossPropertyAccess.reason === "CROSS_PROPERTY_DENIED"
        ? "PASS"
        : "BLOCKED",
      crossPropertyAccess.reason
    ),
    scenario(
      "claim to route/query wiring",
      employee,
      "route/query policy can consume claim-derived actor and membership",
      routeAuth.allowed ? "PASS" : "BLOCKED",
      routeAuth.reason
    )
  ];

  const blocked = rows.filter((row) => row.Result !== "PASS");
  const legacyWarnings = rows.filter((row) => String(row.Notes).includes("LEGACY")).length;

  return {
    overall: blocked.length ? "BLOCKED" : "PASS",
    rows,
    summary: {
      scenarioCount: rows.length,
      blockedCount: blocked.length,
      legacyWarningCount: legacyWarnings,
      crossTenantDenied: !crossTenantAccess.allowed,
      crossPropertyDenied: !crossPropertyAccess.allowed
    }
  };
}

async function writeReport(result) {
  const report = [
    "# Tenant Scope Auth Claim Rehearsal Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Overall: \`${result.overall}\``,
    "",
    "Scope: staging/local-only auth claim contract rehearsal. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change live auth behavior, remove legacy CORPID fallback, or print secrets.",
    "",
    markdownTable(result.rows, ["Scenario", "Claim", "Expected", "Result", "Notes"]),
    "",
    "Summary:",
    "",
    `- Scenario count: ${result.summary.scenarioCount}.`,
    `- Blocked scenarios: ${result.summary.blockedCount}.`,
    `- Legacy CORPID fallback warnings: ${result.summary.legacyWarningCount}.`,
    `- Cross-tenant denial verified: ${result.summary.crossTenantDenied ? "yes" : "no"}.`,
    `- Cross-property denial verified: ${result.summary.crossPropertyDenied ? "yes" : "no"}.`,
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Feature flag changed: no.",
    "- Dashboard/history live result changed: no.",
    "- Legacy CORPID fallback removed: no.",
    "- Secret/password/token/cookie printed: no.",
    "",
    "Production meaning:",
    "",
    "- P0-006 remains Partial, not Verified.",
    "- Current Worker login/session behavior is unchanged.",
    "- Production SaaS tenant isolation still requires approved auth/session claim propagation and production migration/cutover gates.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
}

async function run() {
  const result = createTenantScopeAuthClaimRehearsal();
  await writeReport(result);
  console.log(`TENANT_SCOPE_AUTH_CLAIM_REHEARSAL=${result.overall}`);
  console.log(`TENANT_SCOPE_AUTH_CLAIM_SCENARIOS=${result.summary.scenarioCount}`);
  console.log(`TENANT_SCOPE_AUTH_CLAIM_BLOCKED=${result.summary.blockedCount}`);
  console.log(`TENANT_SCOPE_AUTH_CLAIM_LEGACY_WARNINGS=${result.summary.legacyWarningCount}`);
  console.log(
    `TENANT_SCOPE_AUTH_CLAIM_CROSS_TENANT_DENIED=${result.summary.crossTenantDenied ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_AUTH_CLAIM_CROSS_PROPERTY_DENIED=${result.summary.crossPropertyDenied ? "yes" : "no"}`
  );
  console.log(`TENANT_SCOPE_AUTH_CLAIM_REPORT=${path.relative(process.cwd(), reportPath)}`);
  process.exit(result.overall === "PASS" ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_SCOPE_AUTH_CLAIM_REHEARSAL=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

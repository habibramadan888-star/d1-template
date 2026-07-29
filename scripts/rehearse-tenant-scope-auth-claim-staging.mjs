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
  validateTenantScopeClaim
} from "../modules/auth/tenant-claims.mjs";
import {
  ACTIONS,
  buildTenantScopeQueryComparison,
  buildTenantScopeRouteScenario
} from "../modules/tenant/scope.mjs";

const reportPath = path.resolve("TENANT_SCOPE_AUTH_CLAIM_STAGING_REHEARSAL_RESULT.md");
const AUTH_CLAIM_STAGING_FLAG = "ENABLE_TENANT_SCOPE_AUTH_CLAIM_STAGING";
const SAFE_ENVS = new Set(["development", "dev", "local", "test", "staging"]);

const fixtureRows = [
  {
    id: "session_a_1",
    table: "sessions",
    corpid: "homelink",
    company_id: "company_a",
    property_id: "property_a_1"
  },
  {
    id: "transaction_a_2",
    table: "transactions",
    corpid: "homelink",
    company_id: "company_a",
    property_id: "property_a_2"
  },
  {
    id: "arrear_b_1",
    table: "arrear_tasks",
    corpid: "homelink",
    company_id: "company_b",
    property_id: "property_b_1"
  }
];

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

function resolveAuthClaimStagingMode(env = {}) {
  const appEnv = String(env.APP_ENV || "")
    .trim()
    .toLowerCase();
  const flag = String(env[AUTH_CLAIM_STAGING_FLAG] || "")
    .trim()
    .toLowerCase();
  if (!SAFE_ENVS.has(appEnv)) {
    return {
      enabled: false,
      mode: "LEGACY",
      productionDisabled: true,
      reason: appEnv === "production" ? "production_always_disabled" : "env_not_allowed"
    };
  }
  if (flag !== "true") {
    return {
      enabled: false,
      mode: "LEGACY",
      productionDisabled: false,
      reason: "flag_off"
    };
  }
  return {
    enabled: true,
    mode: "TENANT_SCOPE_AUTH_CLAIM_STAGING",
    productionDisabled: false,
    reason: "staging_auth_claim_rehearsal"
  };
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

function row({ scenario, claim, routeQuery, expected, actual, result, notes, claimSource }) {
  return {
    Scenario: scenario,
    "Claim Source": claimSource || claimSummary(claim),
    "Route / Query": routeQuery,
    Expected: expected,
    Actual: actual,
    Result: result,
    Notes: notes
  };
}

function makeClaims() {
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
  const legacy = deriveTenantScopeFromLegacyUser(
    {
      userid: "legacy_employee",
      role: "staff",
      employee_id: "legacy_employee",
      corpid: "homelink"
    },
    { allowed_property_ids: ["property_a_1"] }
  );
  const tampered = buildTenantScopeClaim(
    {
      userid: "employee_a_1",
      role: "staff",
      employee_id: "employee_a_1",
      tenant_id: "company_a",
      allowed_property_ids: ["property_a_1"]
    },
    { frontEndTenantId: "company_b", front_end_tenant_id: "company_b" }
  );

  return { employee, owner, manager, legacy, tampered };
}

function routeScenario({ claim, target, action, route, method = "GET", expectedAllowed }) {
  return buildTenantScopeRouteScenario({
    name: route,
    route,
    method,
    env: { APP_ENV: "staging", ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING: "true" },
    actor: claimToTenantScopeActor(claim),
    memberships: claimToTenantScopeMemberships(claim),
    target,
    action,
    expectedAllowed
  });
}

function accessScenario({ scenario, claim, target, action, routeQuery, expectedAllowed }) {
  const result = assertTenantScopedAccess(claim, { ...target, action }, { appEnv: "staging" });
  return row({
    scenario,
    claim,
    routeQuery,
    expected: expectedAllowed ? "allowed" : "denied",
    actual: result.allowed ? "allowed" : "denied",
    result: result.allowed === expectedAllowed ? "PASS" : "BLOCKED",
    notes: result.reason
  });
}

export function createTenantScopeAuthClaimStagingRehearsal() {
  const claims = makeClaims();
  const flagBefore = resolveAuthClaimStagingMode({
    APP_ENV: "staging",
    [AUTH_CLAIM_STAGING_FLAG]: "false"
  });
  const flagDuring = resolveAuthClaimStagingMode({
    APP_ENV: "staging",
    [AUTH_CLAIM_STAGING_FLAG]: "true"
  });
  const flagAfter = resolveAuthClaimStagingMode({
    APP_ENV: "staging",
    [AUTH_CLAIM_STAGING_FLAG]: "false"
  });
  const productionMode = resolveAuthClaimStagingMode({
    APP_ENV: "production",
    [AUTH_CLAIM_STAGING_FLAG]: "true"
  });

  const routeOwn = routeScenario({
    claim: claims.employee,
    target: { company_id: "company_a", property_id: "property_a_1", corpid: "homelink" },
    action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
    route: "/api/employee/entry",
    method: "POST",
    expectedAllowed: true
  });
  const routeOtherTenant = routeScenario({
    claim: claims.employee,
    target: { company_id: "company_b", property_id: "property_b_1", corpid: "homelink" },
    action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
    route: "/api/employee/entry",
    method: "POST",
    expectedAllowed: false
  });
  const queryOwner = buildTenantScopeQueryComparison({
    name: "owner claim history query",
    query: "history by auth claim",
    env: { APP_ENV: "staging", ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING: "true" },
    actor: claimToTenantScopeActor(claims.owner),
    memberships: claimToTenantScopeMemberships(claims.owner),
    rows: fixtureRows,
    action: ACTIONS.HISTORY_READ
  });

  const legacyRisk = classifyClaimScopeRisk(claims.legacy, { appEnv: "staging" });
  const legacyProductionRisk = classifyClaimScopeRisk(claims.legacy, { appEnv: "production" });
  const tamperValidation = validateTenantScopeClaim(claims.tampered, { appEnv: "staging" });

  const rows = [
    accessScenario({
      scenario: "employee own tenant allowed",
      claim: claims.employee,
      target: { tenant_id: "company_a", property_id: "property_a_1" },
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      routeQuery: "/api/employee/entry",
      expectedAllowed: true
    }),
    row({
      scenario: "employee own property route wiring",
      claim: claims.employee,
      routeQuery: "/api/employee/entry",
      expected: "allowed",
      actual: routeOwn["Actual Allowed"] === "yes" ? "allowed" : "denied",
      result: routeOwn.Result,
      notes: routeOwn.Notes
    }),
    accessScenario({
      scenario: "employee other tenant denied",
      claim: claims.employee,
      target: { tenant_id: "company_b", property_id: "property_b_1" },
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      routeQuery: "/api/employee/entry",
      expectedAllowed: false
    }),
    row({
      scenario: "employee other tenant route denied",
      claim: claims.employee,
      routeQuery: "/api/employee/entry",
      expected: "denied",
      actual: routeOtherTenant["Actual Allowed"] === "yes" ? "allowed" : "denied",
      result: routeOtherTenant.Result,
      notes: routeOtherTenant.Notes
    }),
    accessScenario({
      scenario: "employee other property denied",
      claim: claims.employee,
      target: { tenant_id: "company_a", property_id: "property_a_2" },
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      routeQuery: "/api/employee/entry",
      expectedAllowed: false
    }),
    accessScenario({
      scenario: "owner tenant-level history allowed",
      claim: claims.owner,
      target: { tenant_id: "company_a", property_id: "property_a_2" },
      action: ACTIONS.HISTORY_READ,
      routeQuery: "/api/history",
      expectedAllowed: true
    }),
    accessScenario({
      scenario: "owner other tenant denied",
      claim: claims.owner,
      target: { tenant_id: "company_b", property_id: "property_b_1" },
      action: ACTIONS.HISTORY_READ,
      routeQuery: "/api/history",
      expectedAllowed: false
    }),
    accessScenario({
      scenario: "manager own property write allowed",
      claim: claims.manager,
      target: { tenant_id: "company_a", property_id: "property_a_1" },
      action: ACTIONS.RENT_CONFIG_WRITE,
      routeQuery: "/api/rent_config",
      expectedAllowed: true
    }),
    accessScenario({
      scenario: "manager other property denied",
      claim: claims.manager,
      target: { tenant_id: "company_a", property_id: "property_a_2" },
      action: ACTIONS.RENT_CONFIG_WRITE,
      routeQuery: "/api/rent_config",
      expectedAllowed: false
    }),
    row({
      scenario: "missing tenant staging fallback warning",
      claim: claims.legacy,
      routeQuery: "claim validation",
      expected: "LEGACY_FALLBACK_WARNING",
      actual: legacyRisk,
      result: legacyRisk === "LEGACY_FALLBACK_WARNING" ? "PASS" : "BLOCKED",
      notes: "legacy CORPID fallback preserved for staging warning only"
    }),
    row({
      scenario: "missing tenant production blocked",
      claim: claims.legacy,
      routeQuery: "claim validation",
      expected: "PRODUCTION_UNSAFE",
      actual: legacyProductionRisk,
      result: legacyProductionRisk === "PRODUCTION_UNSAFE" ? "PASS" : "BLOCKED",
      notes: "missing tenant_id cannot authorize production SaaS access"
    }),
    row({
      scenario: "frontend tenant tamper ignored",
      claim: claims.tampered,
      routeQuery: "claim builder",
      expected: "company_a",
      actual: claims.tampered.tenant_id,
      result:
        claims.tampered.tenant_id === "company_a" && tamperValidation.valid ? "PASS" : "BLOCKED",
      notes: "front-end tenant_id is not authority"
    }),
    row({
      scenario: "owner query consumes auth claim",
      claim: claims.owner,
      routeQuery: "/api/history",
      expected: "cross-tenant rows removed",
      actual: queryOwner["Cross-Tenant Removed"],
      result: queryOwner.Result,
      notes: queryOwner.Notes
    }),
    row({
      scenario: "rollback flag false restores legacy",
      claim: claims.employee,
      routeQuery: AUTH_CLAIM_STAGING_FLAG,
      expected: "false / LEGACY",
      actual: `${flagAfter.enabled ? "true" : "false"} / ${flagAfter.mode}`,
      result: !flagAfter.enabled && flagAfter.mode === "LEGACY" ? "PASS" : "BLOCKED",
      notes: flagAfter.reason
    }),
    row({
      scenario: "production remains disabled",
      claim: claims.employee,
      routeQuery: AUTH_CLAIM_STAGING_FLAG,
      expected: "disabled",
      actual: productionMode.enabled ? "enabled" : "disabled",
      result: !productionMode.enabled && productionMode.productionDisabled ? "PASS" : "BLOCKED",
      notes: productionMode.reason
    })
  ];

  const modeRows = [
    {
      Phase: "before",
      Flag: AUTH_CLAIM_STAGING_FLAG,
      Expected: "false / LEGACY",
      Actual: `${flagBefore.enabled ? "true" : "false"} / ${flagBefore.mode}`,
      Result: !flagBefore.enabled && flagBefore.mode === "LEGACY" ? "PASS" : "BLOCKED"
    },
    {
      Phase: "during",
      Flag: AUTH_CLAIM_STAGING_FLAG,
      Expected: "true / TENANT_SCOPE_AUTH_CLAIM_STAGING",
      Actual: `${flagDuring.enabled ? "true" : "false"} / ${flagDuring.mode}`,
      Result:
        flagDuring.enabled && flagDuring.mode === "TENANT_SCOPE_AUTH_CLAIM_STAGING"
          ? "PASS"
          : "BLOCKED"
    },
    {
      Phase: "after",
      Flag: AUTH_CLAIM_STAGING_FLAG,
      Expected: "false / LEGACY",
      Actual: `${flagAfter.enabled ? "true" : "false"} / ${flagAfter.mode}`,
      Result: !flagAfter.enabled && flagAfter.mode === "LEGACY" ? "PASS" : "BLOCKED"
    }
  ];

  const blocked = [...rows, ...modeRows].filter((item) => item.Result !== "PASS");
  return {
    overall: blocked.length ? "BLOCKED" : "PASS",
    rows,
    modeRows,
    summary: {
      scenarioCount: rows.length,
      blockedCount: blocked.length,
      crossTenantDenied: rows.some(
        (item) => item.Scenario.includes("other tenant") && item.Actual === "denied"
      ),
      crossPropertyDenied: rows.some(
        (item) => item.Scenario.includes("other property") && item.Actual === "denied"
      ),
      frontendTamperIgnored: claims.tampered.tenant_id === "company_a",
      legacyFallbackWarning: legacyRisk === "LEGACY_FALLBACK_WARNING",
      finalFlagFalse: !flagAfter.enabled && flagAfter.mode === "LEGACY"
    }
  };
}

async function writeReport(result) {
  const report = [
    "# Tenant Scope Auth Claim Staging Rehearsal Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Overall: \`${result.overall}\``,
    "",
    "Scope: staging/local-only auth claim rehearsal using deterministic test claims and route/query policy helpers. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, remove legacy CORPID fallback, or print secrets.",
    "",
    "Feature flag phases:",
    "",
    markdownTable(result.modeRows, ["Phase", "Flag", "Expected", "Actual", "Result"]),
    "",
    "Rehearsal scenarios:",
    "",
    markdownTable(result.rows, [
      "Scenario",
      "Claim Source",
      "Route / Query",
      "Expected",
      "Actual",
      "Result",
      "Notes"
    ]),
    "",
    "Summary:",
    "",
    `- Scenario count: ${result.summary.scenarioCount}.`,
    `- Blocked scenarios: ${result.summary.blockedCount}.`,
    `- Cross-tenant denied: ${result.summary.crossTenantDenied ? "yes" : "no"}.`,
    `- Cross-property denied: ${result.summary.crossPropertyDenied ? "yes" : "no"}.`,
    `- Frontend tenant_id tamper ignored: ${result.summary.frontendTamperIgnored ? "yes" : "no"}.`,
    `- Legacy CORPID fallback warning preserved: ${result.summary.legacyFallbackWarning ? "yes" : "no"}.`,
    `- Final auth claim staging flag false / legacy: ${result.summary.finalFlagFalse ? "yes" : "no"}.`,
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
    "- Staging/local auth claim rehearsal success does not imply production readiness.",
    "- Production migration, production deploy, production backfill, and production cutover remain unapproved.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
}

async function run() {
  const result = createTenantScopeAuthClaimStagingRehearsal();
  await writeReport(result);
  console.log(`TENANT_SCOPE_AUTH_CLAIM_STAGING_REHEARSAL=${result.overall}`);
  console.log(`TENANT_SCOPE_AUTH_CLAIM_STAGING_SCENARIOS=${result.summary.scenarioCount}`);
  console.log(`TENANT_SCOPE_AUTH_CLAIM_STAGING_BLOCKED=${result.summary.blockedCount}`);
  console.log(
    `TENANT_SCOPE_AUTH_CLAIM_STAGING_CROSS_TENANT_DENIED=${result.summary.crossTenantDenied ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_AUTH_CLAIM_STAGING_CROSS_PROPERTY_DENIED=${result.summary.crossPropertyDenied ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_AUTH_CLAIM_STAGING_FRONTEND_TAMPER_IGNORED=${result.summary.frontendTamperIgnored ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_AUTH_CLAIM_STAGING_LEGACY_FALLBACK_WARNING=${result.summary.legacyFallbackWarning ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_AUTH_CLAIM_STAGING_FLAG_FINAL_FALSE=${result.summary.finalFlagFalse ? "yes" : "no"}`
  );
  console.log(`TENANT_SCOPE_AUTH_CLAIM_STAGING_REPORT=${path.relative(process.cwd(), reportPath)}`);
  process.exit(result.overall === "PASS" ? 0 : 1);
}

export { AUTH_CLAIM_STAGING_FLAG, resolveAuthClaimStagingMode };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_SCOPE_AUTH_CLAIM_STAGING_REHEARSAL=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

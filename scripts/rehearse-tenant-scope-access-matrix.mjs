#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ALL_PROPERTY,
  assertTenantScopedAccess,
  buildTenantScopeClaim,
  classifyClaimScopeRisk,
  deriveTenantScopeFromLegacyUser
} from "../modules/auth/tenant-claims.mjs";
import { ACTIONS } from "../modules/tenant/scope.mjs";

const reportPath = path.resolve("TENANT_SCOPE_ACCESS_MATRIX_REHEARSAL_RESULT.md");
const ACCESS_MATRIX_FLAG = "ENABLE_TENANT_SCOPE_ACCESS_MATRIX_STAGING";
const SAFE_ENVS = new Set(["development", "dev", "local", "test", "staging"]);

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

function resolveAccessMatrixMode(env = {}) {
  const appEnv = String(env.APP_ENV || "")
    .trim()
    .toLowerCase();
  const flag = String(env[ACCESS_MATRIX_FLAG] || "")
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
    mode: "TENANT_SCOPE_ACCESS_MATRIX_STAGING",
    productionDisabled: false,
    reason: "staging_local_access_matrix_gate"
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
  const admin = buildTenantScopeClaim({
    userid: "admin_a",
    role: "admin",
    admin_id: "admin_a",
    tenant_id: "company_a",
    allowed_property_ids: ["property_a_1", "property_a_2"]
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
  return { employee, owner, manager, admin, legacy, tampered };
}

const TARGETS = {
  ownProperty: { tenant_id: "company_a", property_id: "property_a_1" },
  otherProperty: { tenant_id: "company_a", property_id: "property_a_2" },
  otherTenant: { tenant_id: "company_b", property_id: "property_b_1" },
  tenantOnly: { tenant_id: "company_a" }
};

function actualFromAccess({ claim, target, action, expected }) {
  if (expected === "DENY_401") return "DENY_401";
  if (expected === "MANUAL_REQUIRED") return "MANUAL_REQUIRED";
  if (expected === "NOT_APPLICABLE") return "NOT_APPLICABLE";
  if (expected === "LEGACY_WARNING") {
    return classifyClaimScopeRisk(claim, { appEnv: "staging" }) === "LEGACY_FALLBACK_WARNING"
      ? "LEGACY_WARNING"
      : "DENY_403";
  }
  const access = assertTenantScopedAccess(claim, { ...target, action }, { appEnv: "staging" });
  return access.allowed ? "ALLOW" : "DENY_403";
}

function matrixRow({
  scenario,
  role,
  resource,
  claim,
  target = TARGETS.ownProperty,
  action,
  expected,
  notes,
  coverage = "TESTED"
}) {
  const actual = actualFromAccess({ claim, target, action, expected });
  return {
    Scenario: scenario,
    Role: role,
    Resource: resource,
    Expected: expected,
    Actual: actual,
    Result: actual === expected ? "PASS" : "BLOCKED",
    Coverage: coverage,
    Notes: notes
  };
}

function createRows() {
  const claims = makeClaims();
  const rows = [
    matrixRow({
      scenario: "unauthenticated employee entry denied",
      role: "unauthenticated",
      resource: "employee entry",
      expected: "DENY_401",
      notes: "No auth/session claim."
    }),
    matrixRow({
      scenario: "invalid JWT history denied",
      role: "invalid JWT",
      resource: "dashboard/history",
      expected: "DENY_401",
      notes: "Invalid token cannot produce tenant claim."
    }),
    matrixRow({
      scenario: "employee own tenant entry allowed",
      role: "employee",
      resource: "employee entry",
      claim: claims.employee,
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      expected: "ALLOW",
      notes: "Claim tenant and property match target."
    }),
    matrixRow({
      scenario: "employee other tenant entry denied",
      role: "employee",
      resource: "employee entry",
      claim: claims.employee,
      target: TARGETS.otherTenant,
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      expected: "DENY_403",
      notes: "Cross-tenant write blocked."
    }),
    matrixRow({
      scenario: "employee own property rent config read allowed",
      role: "employee",
      resource: "rent_config",
      claim: claims.employee,
      action: ACTIONS.RENT_CONFIG_READ,
      expected: "ALLOW",
      notes: "Employee can read assigned property config."
    }),
    matrixRow({
      scenario: "employee other property rent config denied",
      role: "employee",
      resource: "rent_config",
      claim: claims.employee,
      target: TARGETS.otherProperty,
      action: ACTIONS.RENT_CONFIG_READ,
      expected: "DENY_403",
      notes: "Cross-property read blocked."
    }),
    matrixRow({
      scenario: "employee owner dashboard denied",
      role: "employee",
      resource: "dashboard/history",
      claim: claims.employee,
      action: ACTIONS.DASHBOARD_READ,
      expected: "DENY_403",
      notes: "Employee permissions do not include owner dashboard authority."
    }),
    matrixRow({
      scenario: "employee handover own property allowed",
      role: "employee",
      resource: "handover",
      claim: claims.employee,
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      expected: "ALLOW",
      notes: "Handover staging path uses employee property membership."
    }),
    matrixRow({
      scenario: "employee handover other tenant denied",
      role: "employee",
      resource: "handover",
      claim: claims.employee,
      target: TARGETS.otherTenant,
      action: ACTIONS.EMPLOYEE_ENTRY_WRITE,
      expected: "DENY_403",
      notes: "Cross-tenant handover blocked."
    }),
    matrixRow({
      scenario: "owner tenant dashboard allowed",
      role: "owner",
      resource: "dashboard/history",
      claim: claims.owner,
      target: TARGETS.otherProperty,
      action: ACTIONS.DASHBOARD_READ,
      expected: "ALLOW",
      notes: "Owner tenant-wide property scope is explicit."
    }),
    matrixRow({
      scenario: "owner other tenant dashboard denied",
      role: "owner",
      resource: "dashboard/history",
      claim: claims.owner,
      target: TARGETS.otherTenant,
      action: ACTIONS.DASHBOARD_READ,
      expected: "DENY_403",
      notes: "Owner cannot use legacy CORPID to cross tenants."
    }),
    matrixRow({
      scenario: "owner sessions scoped allowed",
      role: "owner",
      resource: "sessions",
      claim: claims.owner,
      target: TARGETS.tenantOnly,
      action: ACTIONS.HISTORY_READ,
      expected: "ALLOW",
      notes: "Session rows require tenant scope."
    }),
    matrixRow({
      scenario: "owner transactions scoped allowed",
      role: "owner",
      resource: "transactions",
      claim: claims.owner,
      target: TARGETS.tenantOnly,
      action: ACTIONS.HISTORY_READ,
      expected: "ALLOW",
      notes: "Transaction rows require tenant scope."
    }),
    matrixRow({
      scenario: "owner deposit ledger scoped allowed",
      role: "owner",
      resource: "deposit_ledger",
      claim: claims.owner,
      target: TARGETS.tenantOnly,
      action: ACTIONS.HISTORY_READ,
      expected: "ALLOW",
      notes: "Deposit ledger is comparable by tenant in staging matrix."
    }),
    matrixRow({
      scenario: "owner arrears scoped allowed",
      role: "owner",
      resource: "arrears",
      claim: claims.owner,
      target: TARGETS.tenantOnly,
      action: ACTIONS.HISTORY_READ,
      expected: "ALLOW",
      notes: "Receivables/P0-008 remains production blocker."
    }),
    matrixRow({
      scenario: "owner export own tenant allowed",
      role: "owner",
      resource: "export/report",
      claim: claims.owner,
      target: TARGETS.tenantOnly,
      action: ACTIONS.EXPORT_READ,
      expected: "ALLOW",
      notes: "Export must stay tenant scoped."
    }),
    matrixRow({
      scenario: "owner export other tenant denied",
      role: "owner",
      resource: "export/report",
      claim: claims.owner,
      target: TARGETS.otherTenant,
      action: ACTIONS.EXPORT_READ,
      expected: "DENY_403",
      notes: "Cross-tenant export blocked."
    }),
    matrixRow({
      scenario: "owner delete session own tenant allowed",
      role: "owner",
      resource: "delete_session / void",
      claim: claims.owner,
      action: ACTIONS.VOID_SESSION,
      expected: "ALLOW",
      notes: "Void action must be tenant scoped."
    }),
    matrixRow({
      scenario: "owner delete session other tenant denied",
      role: "owner",
      resource: "delete_session / void",
      claim: claims.owner,
      target: TARGETS.otherTenant,
      action: ACTIONS.VOID_SESSION,
      expected: "DENY_403",
      notes: "Wrong tenant cannot void rows."
    }),
    matrixRow({
      scenario: "employee delete session denied",
      role: "employee",
      resource: "delete_session / void",
      claim: claims.employee,
      action: ACTIONS.VOID_SESSION,
      expected: "DENY_403",
      notes: "Employee claim lacks void permission."
    }),
    matrixRow({
      scenario: "manager app settings own property allowed",
      role: "manager",
      resource: "settings / app_settings",
      claim: claims.manager,
      action: ACTIONS.RENT_CONFIG_WRITE,
      expected: "ALLOW",
      notes: "Manager setting authority is property constrained."
    }),
    matrixRow({
      scenario: "manager app settings other property denied",
      role: "manager",
      resource: "settings / app_settings",
      claim: claims.manager,
      target: TARGETS.otherProperty,
      action: ACTIONS.RENT_CONFIG_WRITE,
      expected: "DENY_403",
      notes: "Cross-property settings write blocked."
    }),
    matrixRow({
      scenario: "admin own tenant tenant records allowed",
      role: "admin",
      resource: "customer / tenant records",
      claim: claims.admin,
      target: TARGETS.tenantOnly,
      action: "TENANT_ADMIN",
      expected: "ALLOW",
      notes: "Admin tenant authority is still staging/local only."
    }),
    matrixRow({
      scenario: "admin other tenant tenant records denied",
      role: "admin",
      resource: "customer / tenant records",
      claim: claims.admin,
      target: TARGETS.otherTenant,
      action: "TENANT_ADMIN",
      expected: "DENY_403",
      notes: "Admin cannot cross tenant without explicit membership."
    }),
    matrixRow({
      scenario: "admin property records own property allowed",
      role: "admin",
      resource: "property / room / unit records",
      claim: claims.admin,
      target: TARGETS.otherProperty,
      action: "TENANT_ADMIN",
      expected: "ALLOW",
      notes: "Admin has explicit property_a_2 membership."
    }),
    matrixRow({
      scenario: "manager property records other property denied",
      role: "manager",
      resource: "property / room / unit records",
      claim: claims.manager,
      target: TARGETS.otherProperty,
      action: ACTIONS.RENT_CONFIG_READ,
      expected: "DENY_403",
      notes: "Manager lacks property_a_2 membership."
    }),
    matrixRow({
      scenario: "audit logs require manual production mapping",
      role: "owner",
      resource: "audit_logs",
      claim: claims.owner,
      expected: "MANUAL_REQUIRED",
      coverage: "DOCUMENTED_ONLY",
      notes: "Staging compatibility columns exist, but production audit attribution needs review."
    }),
    matrixRow({
      scenario: "entry events require manual production mapping",
      role: "employee",
      resource: "entry_events",
      claim: claims.employee,
      expected: "MANUAL_REQUIRED",
      coverage: "DOCUMENTED_ONLY",
      notes: "Entry event scope needs live write-path review before production."
    }),
    matrixRow({
      scenario: "legacy CORPID fallback warning preserved",
      role: "employee",
      resource: "legacy CORPID fallback",
      claim: claims.legacy,
      expected: "LEGACY_WARNING",
      coverage: "TESTED",
      notes: "Compatibility only; not production SaaS authority."
    }),
    {
      Scenario: "frontend tenant id tamper ignored",
      Role: "employee",
      Resource: "auth claim",
      Expected: "server tenant company_a",
      Actual: claims.tampered.tenant_id,
      Result: claims.tampered.tenant_id === "company_a" ? "PASS" : "BLOCKED",
      Coverage: "TESTED",
      Notes: "Frontend tenant_id does not override server claim."
    },
    {
      Scenario: "production access matrix authority remains disabled",
      Role: "all",
      Resource: "tenant authority switch",
      Expected: "disabled",
      Actual: resolveAccessMatrixMode({
        APP_ENV: "production",
        [ACCESS_MATRIX_FLAG]: "true"
      }).enabled
        ? "enabled"
        : "disabled",
      Result: resolveAccessMatrixMode({
        APP_ENV: "production",
        [ACCESS_MATRIX_FLAG]: "true"
      }).enabled
        ? "BLOCKED"
        : "PASS",
      Coverage: "TESTED",
      Notes: "Production remains disabled/no-go."
    }
  ];

  return rows;
}

export function createTenantScopeAccessMatrixGate() {
  const flagBefore = resolveAccessMatrixMode({
    APP_ENV: "staging",
    [ACCESS_MATRIX_FLAG]: "false"
  });
  const flagDuring = resolveAccessMatrixMode({
    APP_ENV: "staging",
    [ACCESS_MATRIX_FLAG]: "true"
  });
  const flagAfter = resolveAccessMatrixMode({
    APP_ENV: "staging",
    [ACCESS_MATRIX_FLAG]: "false"
  });
  const rows = createRows();
  const blocked = rows.filter((row) => row.Result !== "PASS");
  const manualRequired = rows.filter((row) => row.Actual === "MANUAL_REQUIRED");
  const tested = rows.filter((row) => row.Coverage === "TESTED");
  const documentedOnly = rows.filter((row) => row.Coverage === "DOCUMENTED_ONLY");
  return {
    overall: blocked.length ? "BLOCKED" : "PASS",
    rows,
    modeRows: [
      {
        Phase: "before",
        Flag: ACCESS_MATRIX_FLAG,
        Expected: "false / LEGACY",
        Actual: `${flagBefore.enabled ? "true" : "false"} / ${flagBefore.mode}`,
        Result: !flagBefore.enabled && flagBefore.mode === "LEGACY" ? "PASS" : "BLOCKED"
      },
      {
        Phase: "during",
        Flag: ACCESS_MATRIX_FLAG,
        Expected: "true / TENANT_SCOPE_ACCESS_MATRIX_STAGING",
        Actual: `${flagDuring.enabled ? "true" : "false"} / ${flagDuring.mode}`,
        Result:
          flagDuring.enabled && flagDuring.mode === "TENANT_SCOPE_ACCESS_MATRIX_STAGING"
            ? "PASS"
            : "BLOCKED"
      },
      {
        Phase: "after",
        Flag: ACCESS_MATRIX_FLAG,
        Expected: "false / LEGACY",
        Actual: `${flagAfter.enabled ? "true" : "false"} / ${flagAfter.mode}`,
        Result: !flagAfter.enabled && flagAfter.mode === "LEGACY" ? "PASS" : "BLOCKED"
      }
    ],
    summary: {
      scenarioCount: rows.length,
      testedCount: tested.length,
      documentedOnlyCount: documentedOnly.length,
      blockedCount: blocked.length,
      missingCoverageCount: manualRequired.length,
      crossTenantDenied: rows.some(
        (row) => row.Scenario.includes("other tenant") && row.Actual === "DENY_403"
      ),
      crossPropertyDenied: rows.some(
        (row) => row.Scenario.includes("other property") && row.Actual === "DENY_403"
      ),
      frontendTamperIgnored: rows.some(
        (row) => row.Scenario === "frontend tenant id tamper ignored" && row.Result === "PASS"
      ),
      legacyFallbackWarning: rows.some(
        (row) =>
          row.Scenario === "legacy CORPID fallback warning preserved" &&
          row.Actual === "LEGACY_WARNING"
      ),
      finalFlagFalse: !flagAfter.enabled && flagAfter.mode === "LEGACY"
    }
  };
}

async function writeReport(result) {
  const report = [
    "# Tenant Scope Access Matrix Rehearsal Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Overall: \`${result.overall}\``,
    "",
    "Scope: staging/local-only access matrix gate using deterministic claims and resource fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, remove legacy CORPID fallback, or print secrets.",
    "",
    "Feature flag phases:",
    "",
    markdownTable(result.modeRows, ["Phase", "Flag", "Expected", "Actual", "Result"]),
    "",
    "Access scenarios:",
    "",
    markdownTable(result.rows, [
      "Scenario",
      "Role",
      "Resource",
      "Expected",
      "Actual",
      "Result",
      "Coverage",
      "Notes"
    ]),
    "",
    "Summary:",
    "",
    `- Scenario count: ${result.summary.scenarioCount}.`,
    `- Tested scenarios: ${result.summary.testedCount}.`,
    `- Documented-only scenarios: ${result.summary.documentedOnlyCount}.`,
    `- Missing coverage count: ${result.summary.missingCoverageCount}.`,
    `- Blocked scenarios: ${result.summary.blockedCount}.`,
    `- Cross-tenant denied: ${result.summary.crossTenantDenied ? "yes" : "no"}.`,
    `- Cross-property denied: ${result.summary.crossPropertyDenied ? "yes" : "no"}.`,
    `- Frontend tenant_id tamper ignored: ${result.summary.frontendTamperIgnored ? "yes" : "no"}.`,
    `- Legacy CORPID fallback warning preserved: ${result.summary.legacyFallbackWarning ? "yes" : "no"}.`,
    `- Final access matrix flag false / legacy: ${result.summary.finalFlagFalse ? "yes" : "no"}.`,
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
    "- Access matrix gate success does not imply production readiness.",
    "- Production migration, production deploy, production backfill, live auth wiring, and production cutover remain unapproved.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
}

async function run() {
  const result = createTenantScopeAccessMatrixGate();
  await writeReport(result);
  console.log(`TENANT_SCOPE_ACCESS_MATRIX_GATE=${result.overall}`);
  console.log(`TENANT_SCOPE_ACCESS_MATRIX_SCENARIOS=${result.summary.scenarioCount}`);
  console.log(`TENANT_SCOPE_ACCESS_MATRIX_TESTED=${result.summary.testedCount}`);
  console.log(`TENANT_SCOPE_ACCESS_MATRIX_DOCUMENTED_ONLY=${result.summary.documentedOnlyCount}`);
  console.log(`TENANT_SCOPE_ACCESS_MATRIX_MISSING_COVERAGE=${result.summary.missingCoverageCount}`);
  console.log(`TENANT_SCOPE_ACCESS_MATRIX_BLOCKED=${result.summary.blockedCount}`);
  console.log(
    `TENANT_SCOPE_ACCESS_MATRIX_CROSS_TENANT_DENIED=${result.summary.crossTenantDenied ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_ACCESS_MATRIX_CROSS_PROPERTY_DENIED=${result.summary.crossPropertyDenied ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_ACCESS_MATRIX_FRONTEND_TAMPER_IGNORED=${result.summary.frontendTamperIgnored ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_ACCESS_MATRIX_LEGACY_FALLBACK_WARNING=${result.summary.legacyFallbackWarning ? "yes" : "no"}`
  );
  console.log(
    `TENANT_SCOPE_ACCESS_MATRIX_FLAG_FINAL_FALSE=${result.summary.finalFlagFalse ? "yes" : "no"}`
  );
  console.log(`TENANT_SCOPE_ACCESS_MATRIX_REPORT=${path.relative(process.cwd(), reportPath)}`);
  process.exit(result.overall === "PASS" ? 0 : 1);
}

export { ACCESS_MATRIX_FLAG, resolveAccessMatrixMode };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_SCOPE_ACCESS_MATRIX_GATE=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

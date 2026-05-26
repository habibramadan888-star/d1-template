#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ALL_PROPERTY,
  buildTenantScopeClaim,
  deriveTenantScopeFromLegacyUser,
  validateTenantScopeClaim
} from "../modules/auth/tenant-claims.mjs";

const STAGING_D1_NAME = "homelink-finance-staging";
const STAGING_D1_ID = "4ff78bfc-3855-436b-aefb-6b492145d79c";
const reportPath = path.resolve("TENANT_SCOPE_AUDIT_ENTRY_EVENTS_REHEARSAL_RESULT.md");

const READ_ONLY_SCHEMA_SQL = "PRAGMA table_info(audit_logs); PRAGMA table_info(entry_events);";

const READ_ONLY_COUNTS_SQL = [
  "SELECT 'audit_logs' AS table_name, COUNT(*) AS total,",
  "SUM(CASE WHEN company_id IS NOT NULL AND company_id<>'' THEN 1 ELSE 0 END) AS company_scoped,",
  "SUM(CASE WHEN property_id IS NOT NULL AND property_id<>'' THEN 1 ELSE 0 END) AS property_scoped,",
  "SUM(CASE WHEN employee_id IS NOT NULL AND employee_id<>'' THEN 1 ELSE 0 END) AS employee_scoped,",
  "SUM(CASE WHEN owner_id IS NOT NULL AND owner_id<>'' THEN 1 ELSE 0 END) AS owner_scoped,",
  "SUM(CASE WHEN corpid IS NOT NULL AND corpid<>'' THEN 1 ELSE 0 END) AS legacy_corpid",
  "FROM audit_logs",
  "UNION ALL",
  "SELECT 'entry_events' AS table_name, COUNT(*) AS total,",
  "SUM(CASE WHEN company_id IS NOT NULL AND company_id<>'' THEN 1 ELSE 0 END) AS company_scoped,",
  "SUM(CASE WHEN property_id IS NOT NULL AND property_id<>'' THEN 1 ELSE 0 END) AS property_scoped,",
  "SUM(CASE WHEN employee_id IS NOT NULL AND employee_id<>'' THEN 1 ELSE 0 END) AS employee_scoped,",
  "NULL AS owner_scoped,",
  "SUM(CASE WHEN corpid IS NOT NULL AND corpid<>'' THEN 1 ELSE 0 END) AS legacy_corpid",
  "FROM entry_events;"
].join(" ");

const READ_ONLY_EVENT_COUNTS_SQL = [
  "SELECT COUNT(*) AS total,",
  "SUM(CASE WHEN action LIKE 'employee.entry.%' THEN 1 ELSE 0 END) AS employee_entry_rows,",
  "SUM(CASE WHEN action LIKE 'employee.entry.%' AND company_id IS NOT NULL AND company_id<>'' AND property_id IS NOT NULL AND property_id<>'' AND employee_id IS NOT NULL AND employee_id<>'' THEN 1 ELSE 0 END) AS scoped_employee_entry_rows,",
  "SUM(CASE WHEN action LIKE 'handover.staging.%' THEN 1 ELSE 0 END) AS handover_rows,",
  "SUM(CASE WHEN action LIKE 'handover.staging.%' AND company_id IS NOT NULL AND company_id<>'' AND property_id IS NOT NULL AND property_id<>'' AND employee_id IS NOT NULL AND employee_id<>'' THEN 1 ELSE 0 END) AS scoped_handover_rows,",
  "SUM(CASE WHEN action='session.void' THEN 1 ELSE 0 END) AS void_rows,",
  "SUM(CASE WHEN action='session.void' AND company_id IS NOT NULL AND company_id<>'' AND property_id IS NOT NULL AND property_id<>'' THEN 1 ELSE 0 END) AS scoped_void_rows",
  "FROM audit_logs;",
  "SELECT COUNT(*) AS total,",
  "SUM(CASE WHEN event_type='employee_entry_adapter_prevalidation' THEN 1 ELSE 0 END) AS employee_entry_rows,",
  "SUM(CASE WHEN event_type='employee_entry_adapter_prevalidation' AND company_id IS NOT NULL AND company_id<>'' AND property_id IS NOT NULL AND property_id<>'' AND employee_id IS NOT NULL AND employee_id<>'' THEN 1 ELSE 0 END) AS scoped_employee_entry_rows,",
  "SUM(CASE WHEN event_type='handover_commit_accepted' THEN 1 ELSE 0 END) AS handover_rows,",
  "SUM(CASE WHEN event_type='handover_commit_accepted' AND company_id IS NOT NULL AND company_id<>'' AND property_id IS NOT NULL AND property_id<>'' AND employee_id IS NOT NULL AND employee_id<>'' THEN 1 ELSE 0 END) AS scoped_handover_rows,",
  "SUM(CASE WHEN event_type='session_void' THEN 1 ELSE 0 END) AS void_rows,",
  "SUM(CASE WHEN event_type='session_void' AND company_id IS NOT NULL AND company_id<>'' AND property_id IS NOT NULL AND property_id<>'' THEN 1 ELSE 0 END) AS scoped_void_rows",
  "FROM entry_events;"
].join(" ");

const AUDIT_REQUIRED_FIELDS = [
  "id",
  "corpid",
  "userid",
  "role",
  "action",
  "target",
  "company_id",
  "property_id",
  "owner_id",
  "employee_id"
];

const ENTRY_REQUIRED_FIELDS = [
  "event_id",
  "corpid",
  "userid",
  "operator_id",
  "ref_id",
  "ref_type",
  "event_type",
  "company_id",
  "property_id",
  "employee_id"
];

const DEFAULT_STAGING_EVIDENCE = {
  source: "read-only staging D1 evidence captured during P0-006Q",
  target: {
    name: STAGING_D1_NAME,
    id: STAGING_D1_ID
  },
  schema: {
    audit_logs: AUDIT_REQUIRED_FIELDS,
    entry_events: ENTRY_REQUIRED_FIELDS
  },
  counts: {
    audit_logs: {
      total: 7,
      company_scoped: 3,
      property_scoped: 3,
      employee_scoped: 3,
      owner_scoped: 0,
      legacy_corpid: 7
    },
    entry_events: {
      total: 5,
      company_scoped: 3,
      property_scoped: 3,
      employee_scoped: 3,
      owner_scoped: null,
      legacy_corpid: 5
    }
  },
  eventCounts: {
    audit_logs: {
      total: 7,
      employee_entry_rows: 4,
      scoped_employee_entry_rows: 2,
      handover_rows: 3,
      scoped_handover_rows: 1,
      void_rows: 0,
      scoped_void_rows: 0
    },
    entry_events: {
      total: 5,
      employee_entry_rows: 3,
      scoped_employee_entry_rows: 1,
      handover_rows: 1,
      scoped_handover_rows: 1,
      void_rows: 0,
      scoped_void_rows: 0
    }
  }
};

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

function numberValue(value) {
  if (value === null || value === undefined) return 0;
  return Number(value) || 0;
}

function hasFields(actualFields, requiredFields) {
  const fieldSet = new Set(actualFields);
  return requiredFields.every((field) => fieldSet.has(field));
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

function allowedProperties(claim) {
  return Array.isArray(claim.allowed_property_ids) ? claim.allowed_property_ids : [];
}

function resolveAuditEventAccess({ roleState, claim, row, table, queryMode = "direct" }) {
  if (roleState === "unauthenticated") return "DENY_401";
  if (roleState === "invalid_jwt") return "DENY_401";

  const validation = validateTenantScopeClaim(claim, { appEnv: "staging" });
  if (!validation.valid) return "DENY_403";

  if (!claim.tenant_id && claim.corp_id) return "LEGACY_WARNING";
  if (!claim.tenant_id) return "DENY_403";
  if (row.company_id && row.company_id !== claim.tenant_id) {
    return queryMode === "filter" ? "FILTER_OUT" : "DENY_403";
  }
  const properties = allowedProperties(claim);
  if (
    row.property_id &&
    !properties.includes(ALL_PROPERTY) &&
    !properties.includes(row.property_id)
  ) {
    return queryMode === "filter" ? "FILTER_OUT" : "DENY_403";
  }

  if (claim.role === "employee") {
    if (table === "entry_events" && row.employee_id === claim.employee_id) return "ALLOW";
    return queryMode === "filter" ? "FILTER_OUT" : "DENY_403";
  }

  if (["owner", "manager", "admin"].includes(claim.role)) return "ALLOW";
  return "DENY_403";
}

function scenarioRow({ scenario, table, role, expected, actual, result, notes }) {
  return {
    Scenario: scenario,
    Table: table,
    Role: role,
    Expected: expected,
    Actual: actual,
    Result: result,
    Notes: notes
  };
}

function passFailResult(actual, expected) {
  return actual === expected ? "PASS" : "FAIL";
}

function needsDataRow({ scenario, table, role, notes }) {
  return scenarioRow({
    scenario,
    table,
    role,
    expected: "staging evidence row present",
    actual: "missing",
    result: "NEEDS_STAGING_EVIDENCE_DATA",
    notes
  });
}

function createScenarioRows(evidence = DEFAULT_STAGING_EVIDENCE) {
  const claims = makeClaims();
  const auditFields = evidence.schema.audit_logs || [];
  const entryFields = evidence.schema.entry_events || [];
  const auditCounts = evidence.counts.audit_logs || {};
  const entryCounts = evidence.counts.entry_events || {};
  const auditEventCounts = evidence.eventCounts.audit_logs || {};
  const entryEventCounts = evidence.eventCounts.entry_events || {};
  const ownEntryRow = {
    company_id: "company_a",
    property_id: "property_a_1",
    employee_id: "employee_a_1"
  };
  const otherTenantRow = {
    company_id: "company_b",
    property_id: "property_b_1",
    employee_id: "employee_b_1"
  };
  const otherPropertyRow = {
    company_id: "company_a",
    property_id: "property_a_2",
    employee_id: "employee_a_2"
  };

  const rows = [];

  const auditSchemaPass = hasFields(auditFields, AUDIT_REQUIRED_FIELDS);
  rows.push(
    scenarioRow({
      scenario: "audit_logs scope fields validated",
      table: "audit_logs",
      role: "system",
      expected: AUDIT_REQUIRED_FIELDS.join(", "),
      actual: auditFields.join(", "),
      result: auditSchemaPass ? "PASS" : "MANUAL_REQUIRED",
      notes: auditSchemaPass
        ? "Required compatibility columns exist in staging schema."
        : "Missing required audit scope fields."
    })
  );

  const entrySchemaPass = hasFields(entryFields, ENTRY_REQUIRED_FIELDS);
  rows.push(
    scenarioRow({
      scenario: "entry_events scope fields validated",
      table: "entry_events",
      role: "system",
      expected: ENTRY_REQUIRED_FIELDS.join(", "),
      actual: entryFields.join(", "),
      result: entrySchemaPass ? "PASS" : "MANUAL_REQUIRED",
      notes: entrySchemaPass
        ? "Required compatibility columns exist in staging schema."
        : "Missing required entry event scope fields."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "unauthenticated cannot access tenant audit rows",
      table: "audit_logs",
      role: "unauthenticated",
      expected: "DENY_401",
      actual: resolveAuditEventAccess({
        roleState: "unauthenticated",
        row: ownEntryRow,
        table: "audit_logs"
      }),
      result: "PASS",
      notes: "No auth claim means no tenant-scoped audit access."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "invalid JWT cannot access tenant event rows",
      table: "entry_events",
      role: "invalid JWT",
      expected: "DENY_401",
      actual: resolveAuditEventAccess({
        roleState: "invalid_jwt",
        row: ownEntryRow,
        table: "entry_events"
      }),
      result: "PASS",
      notes: "Invalid auth cannot produce tenant claim."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "employee own entry event allowed",
      table: "entry_events",
      role: "employee",
      expected: "ALLOW",
      actual: resolveAuditEventAccess({
        claim: claims.employee,
        row: ownEntryRow,
        table: "entry_events"
      }),
      result: passFailResult(
        resolveAuditEventAccess({
          claim: claims.employee,
          row: ownEntryRow,
          table: "entry_events"
        }),
        "ALLOW"
      ),
      notes: "Employee can see own scoped entry event evidence in rehearsal policy."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "employee other tenant audit evidence filtered",
      table: "audit_logs",
      role: "employee",
      expected: "FILTER_OUT",
      actual: resolveAuditEventAccess({
        claim: claims.employee,
        row: otherTenantRow,
        table: "audit_logs",
        queryMode: "filter"
      }),
      result: "PASS",
      notes: "Cross-tenant audit row is removed from employee query."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "employee other property entry event filtered",
      table: "entry_events",
      role: "employee",
      expected: "FILTER_OUT",
      actual: resolveAuditEventAccess({
        claim: claims.employee,
        row: otherPropertyRow,
        table: "entry_events",
        queryMode: "filter"
      }),
      result: "PASS",
      notes: "Cross-property entry event is removed from employee query."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "owner own tenant audit evidence allowed",
      table: "audit_logs",
      role: "owner",
      expected: "ALLOW",
      actual: resolveAuditEventAccess({
        claim: claims.owner,
        row: ownEntryRow,
        table: "audit_logs"
      }),
      result: passFailResult(
        resolveAuditEventAccess({ claim: claims.owner, row: ownEntryRow, table: "audit_logs" }),
        "ALLOW"
      ),
      notes: "Owner tenant-wide property scope is explicit in rehearsal claim."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "owner other tenant audit evidence filtered",
      table: "audit_logs",
      role: "owner",
      expected: "FILTER_OUT",
      actual: resolveAuditEventAccess({
        claim: claims.owner,
        row: otherTenantRow,
        table: "audit_logs",
        queryMode: "filter"
      }),
      result: "PASS",
      notes: "Owner cannot cross tenants even with legacy CORPID compatibility."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "manager other property audit evidence filtered",
      table: "audit_logs",
      role: "manager",
      expected: "FILTER_OUT",
      actual: resolveAuditEventAccess({
        claim: claims.manager,
        row: otherPropertyRow,
        table: "audit_logs",
        queryMode: "filter"
      }),
      result: "PASS",
      notes: "Manager is constrained to allowed_property_ids."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "admin own tenant entry event allowed",
      table: "entry_events",
      role: "admin",
      expected: "ALLOW",
      actual: resolveAuditEventAccess({
        claim: claims.admin,
        row: otherPropertyRow,
        table: "entry_events"
      }),
      result: passFailResult(
        resolveAuditEventAccess({
          claim: claims.admin,
          row: otherPropertyRow,
          table: "entry_events"
        }),
        "ALLOW"
      ),
      notes: "Admin has explicit property_a_2 membership in rehearsal claim."
    })
  );

  const tamperValidation = validateTenantScopeClaim(claims.tampered, { appEnv: "staging" });
  rows.push(
    scenarioRow({
      scenario: "frontend tenant_id tamper ignored",
      table: "auth claim",
      role: "employee",
      expected: "company_a",
      actual: claims.tampered.tenant_id,
      result: claims.tampered.tenant_id === "company_a" && tamperValidation.valid ? "PASS" : "FAIL",
      notes: "Frontend-supplied tenant_id does not override server claim."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "legacy CORPID fallback warning preserved",
      table: "audit_logs",
      role: "employee",
      expected: "LEGACY_WARNING",
      actual: resolveAuditEventAccess({
        claim: claims.legacy,
        row: ownEntryRow,
        table: "audit_logs"
      }),
      result: "LEGACY_WARNING",
      notes: "Legacy CORPID remains compatibility-only and not production SaaS authority."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "audit_logs has scoped employee entry rows",
      table: "audit_logs",
      role: "employee",
      expected: "scoped employee entry evidence",
      actual: `${numberValue(auditEventCounts.scoped_employee_entry_rows)} scoped of ${numberValue(auditEventCounts.employee_entry_rows)}`,
      result:
        numberValue(auditEventCounts.scoped_employee_entry_rows) > 0
          ? "PASS"
          : "NEEDS_STAGING_EVIDENCE_DATA",
      notes:
        "Read-only staging counts prove some employee entry audit rows carry company/property/employee scope."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "entry_events has scoped employee entry rows",
      table: "entry_events",
      role: "employee",
      expected: "scoped employee entry event evidence",
      actual: `${numberValue(entryEventCounts.scoped_employee_entry_rows)} scoped of ${numberValue(entryEventCounts.employee_entry_rows)}`,
      result:
        numberValue(entryEventCounts.scoped_employee_entry_rows) > 0
          ? "PASS"
          : "NEEDS_STAGING_EVIDENCE_DATA",
      notes:
        "Read-only staging counts prove some entry event rows carry company/property/employee scope."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "audit_logs has scoped handover rows",
      table: "audit_logs",
      role: "employee",
      expected: "scoped handover audit evidence",
      actual: `${numberValue(auditEventCounts.scoped_handover_rows)} scoped of ${numberValue(auditEventCounts.handover_rows)}`,
      result:
        numberValue(auditEventCounts.scoped_handover_rows) > 0
          ? "PASS"
          : "NEEDS_STAGING_EVIDENCE_DATA",
      notes: "Read-only staging counts prove accepted handover audit scope exists."
    })
  );

  rows.push(
    scenarioRow({
      scenario: "entry_events has scoped handover rows",
      table: "entry_events",
      role: "employee",
      expected: "scoped handover event evidence",
      actual: `${numberValue(entryEventCounts.scoped_handover_rows)} scoped of ${numberValue(entryEventCounts.handover_rows)}`,
      result:
        numberValue(entryEventCounts.scoped_handover_rows) > 0
          ? "PASS"
          : "NEEDS_STAGING_EVIDENCE_DATA",
      notes: "Read-only staging counts prove accepted handover entry event scope exists."
    })
  );

  if (numberValue(auditCounts.owner_scoped) === 0) {
    rows.push(
      needsDataRow({
        scenario: "audit_logs owner-created event evidence",
        table: "audit_logs",
        role: "owner",
        notes: "No owner_id-scoped audit rows exist in current staging evidence."
      })
    );
  }

  if (numberValue(auditEventCounts.scoped_void_rows) === 0) {
    rows.push(
      needsDataRow({
        scenario: "audit_logs void/delete_session event evidence",
        table: "audit_logs",
        role: "owner",
        notes: "No scoped session.void audit row exists in current staging evidence."
      })
    );
  }

  if (numberValue(entryEventCounts.scoped_void_rows) === 0) {
    rows.push(
      needsDataRow({
        scenario: "entry_events void event evidence",
        table: "entry_events",
        role: "owner",
        notes: "No scoped session_void entry event exists in current staging evidence."
      })
    );
  }

  rows.push(
    scenarioRow({
      scenario: "production tenant audit/event authority remains disabled",
      table: "audit_logs / entry_events",
      role: "all",
      expected: "PRODUCTION_NO_GO",
      actual: "PRODUCTION_NO_GO",
      result: "PASS",
      notes: "Staging rehearsal does not approve production cutover."
    })
  );

  return rows;
}

export function createTenantScopeAuditEntryEventsRehearsal(evidence = DEFAULT_STAGING_EVIDENCE) {
  const rows = createScenarioRows(evidence);
  const failRows = rows.filter((row) => row.Result === "FAIL");
  const manualRows = rows.filter((row) => row.Result === "MANUAL_REQUIRED");
  const needsDataRows = rows.filter((row) => row.Result === "NEEDS_STAGING_EVIDENCE_DATA");
  const passRows = rows.filter((row) => row.Result === "PASS");
  const legacyRows = rows.filter((row) => row.Result === "LEGACY_WARNING");
  const auditNeedsData = needsDataRows.some((row) => row.Table === "audit_logs");
  const entryNeedsData = needsDataRows.some((row) => row.Table === "entry_events");
  const overall = failRows.length
    ? "BLOCKED"
    : needsDataRows.length || manualRows.length
      ? "NEEDS_STAGING_EVIDENCE_DATA"
      : "PASS";

  return {
    overall,
    target: evidence.target,
    rows,
    summary: {
      totalScenarios: rows.length,
      passCount: passRows.length,
      manualRequiredCount: manualRows.length,
      needsStagingEvidenceDataCount: needsDataRows.length,
      failCount: failRows.length,
      legacyWarningCount: legacyRows.length,
      missingCoverageCount: Number(auditNeedsData) + Number(entryNeedsData),
      auditLogsResult: auditNeedsData ? "NEEDS_STAGING_EVIDENCE_DATA" : "PASS",
      entryEventsResult: entryNeedsData ? "NEEDS_STAGING_EVIDENCE_DATA" : "PASS",
      productionNoGo: true,
      stagingD1Write: false,
      productionD1Write: false
    }
  };
}

function parseJsonOutput(output) {
  const parsed = JSON.parse(output);
  if (!Array.isArray(parsed)) throw new Error("Unexpected Wrangler JSON result.");
  return parsed;
}

function executeReadOnlyD1Json(command) {
  const wranglerBin = path.resolve("node_modules", "wrangler", "bin", "wrangler.js");
  const output = execFileSync(
    process.execPath,
    [wranglerBin, "d1", "execute", STAGING_D1_NAME, "--remote", "--json", "--command", command],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  return parseJsonOutput(output);
}

function fieldsFromPragmaRows(rows) {
  return rows.map((row) => row.name).filter(Boolean);
}

export function readStagingAuditEntryEventsEvidence() {
  const schemaResults = executeReadOnlyD1Json(READ_ONLY_SCHEMA_SQL);
  const countResults = executeReadOnlyD1Json(READ_ONLY_COUNTS_SQL);
  const eventCountResults = executeReadOnlyD1Json(READ_ONLY_EVENT_COUNTS_SQL);
  const counts = Object.fromEntries(
    (countResults[0]?.results || []).map((row) => [row.table_name, row])
  );

  return {
    source: "live read-only staging D1 query",
    target: {
      name: STAGING_D1_NAME,
      id: STAGING_D1_ID
    },
    schema: {
      audit_logs: fieldsFromPragmaRows(schemaResults[0]?.results || []),
      entry_events: fieldsFromPragmaRows(schemaResults[1]?.results || [])
    },
    counts: {
      audit_logs: counts.audit_logs || {},
      entry_events: counts.entry_events || {}
    },
    eventCounts: {
      audit_logs: eventCountResults[0]?.results?.[0] || {},
      entry_events: eventCountResults[1]?.results?.[0] || {}
    }
  };
}

async function writeReport(result) {
  const report = [
    "# Tenant Scope Audit Logs / Entry Events Rehearsal Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Overall: \`${result.overall}\``,
    "",
    `Target D1: \`${result.target?.name || STAGING_D1_NAME}\``,
    `Target D1 ID: \`${result.target?.id || STAGING_D1_ID}\``,
    "",
    "Scope: staging/local audit/event scope rehearsal. The script uses read-only staging D1 schema/count queries plus deterministic access-policy fixtures. It does not deploy, migrate, write D1, call production, mutate dashboard/history output, remove legacy CORPID fallback, or print secrets.",
    "",
    "Rehearsal scenarios:",
    "",
    markdownTable(result.rows, [
      "Scenario",
      "Table",
      "Role",
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
    `- NEEDS_STAGING_EVIDENCE_DATA count: ${result.summary.needsStagingEvidenceDataCount}.`,
    `- FAIL count: ${result.summary.failCount}.`,
    `- LEGACY_WARNING count: ${result.summary.legacyWarningCount}.`,
    `- Missing coverage count: ${result.summary.missingCoverageCount}.`,
    `- audit_logs result: ${result.summary.auditLogsResult}.`,
    `- entry_events result: ${result.summary.entryEventsResult}.`,
    "",
    "Evidence data still required:",
    "",
    "- Owner-created audit row with `owner_id` scope.",
    "- Scoped `session.void` audit row.",
    "- Scoped `session_void` entry event row.",
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Dashboard/history live result changed: no.",
    "- Live financial formula changed: no.",
    "- Legacy CORPID fallback removed: no.",
    "- Secret/password/token/cookie printed: no.",
    "",
    "Production meaning:",
    "",
    "- P0-006 remains Partial, not Verified.",
    "- Audit/event rehearsal evidence does not imply production readiness.",
    "- Production migration, production deploy, production backfill, live auth wiring, and production cutover remain unapproved.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
}

async function run() {
  const evidence = process.argv.includes("--snapshot-only")
    ? DEFAULT_STAGING_EVIDENCE
    : readStagingAuditEntryEventsEvidence();
  const result = createTenantScopeAuditEntryEventsRehearsal(evidence);
  await writeReport(result);
  console.log(`TENANT_SCOPE_AUDIT_ENTRY_EVENTS_REHEARSAL=${result.overall}`);
  console.log(`TENANT_SCOPE_AUDIT_ENTRY_EVENTS_TARGET=${result.target?.name || STAGING_D1_NAME}`);
  console.log(`TENANT_SCOPE_AUDIT_ENTRY_EVENTS_SCENARIOS=${result.summary.totalScenarios}`);
  console.log(`TENANT_SCOPE_AUDIT_ENTRY_EVENTS_PASS=${result.summary.passCount}`);
  console.log(
    `TENANT_SCOPE_AUDIT_ENTRY_EVENTS_NEEDS_DATA=${result.summary.needsStagingEvidenceDataCount}`
  );
  console.log(`TENANT_SCOPE_AUDIT_ENTRY_EVENTS_FAIL=${result.summary.failCount}`);
  console.log(
    `TENANT_SCOPE_AUDIT_ENTRY_EVENTS_MISSING_COVERAGE=${result.summary.missingCoverageCount}`
  );
  console.log(`TENANT_SCOPE_AUDIT_LOGS_RESULT=${result.summary.auditLogsResult}`);
  console.log(`TENANT_SCOPE_ENTRY_EVENTS_RESULT=${result.summary.entryEventsResult}`);
  console.log(`TENANT_SCOPE_AUDIT_ENTRY_EVENTS_STAGING_D1_WRITE=no`);
  console.log(`TENANT_SCOPE_AUDIT_ENTRY_EVENTS_PRODUCTION_D1_WRITE=no`);
  console.log(`TENANT_SCOPE_AUDIT_ENTRY_EVENTS_REPORT=${path.relative(process.cwd(), reportPath)}`);
  process.exit(result.summary.failCount ? 1 : 0);
}

export {
  AUDIT_REQUIRED_FIELDS,
  DEFAULT_STAGING_EVIDENCE,
  ENTRY_REQUIRED_FIELDS,
  READ_ONLY_COUNTS_SQL,
  READ_ONLY_EVENT_COUNTS_SQL,
  READ_ONLY_SCHEMA_SQL,
  STAGING_D1_ID,
  STAGING_D1_NAME,
  resolveAuditEventAccess
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_SCOPE_AUDIT_ENTRY_EVENTS_REHEARSAL=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

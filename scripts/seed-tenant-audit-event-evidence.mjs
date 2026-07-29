#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const STAGING_D1_NAME = "homelink-finance-staging";
const STAGING_D1_ID = "4ff78bfc-3855-436b-aefb-6b492145d79c";
const SOURCE = "P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE";
const QA_RUN_ID = "P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26";
const CONFIRM_WRITE_FLAG = "--confirm-staging-audit-event-evidence-write";
const reportPath = path.resolve("P0_006Q2_SEED_SCRIPT_RESULT.md");

const wranglerBin = path.resolve("node_modules", "wrangler", "bin", "wrangler.js");

const auditRows = [
  {
    id: "p0-006q2-audit-owner-created",
    corpid: "homelink",
    userid: "owner_a",
    role: "owner",
    action: "owner.created.audit.scope_evidence",
    target: "p0-006q2-owner-audit-evidence",
    company_id: "company_a",
    property_id: "property_a_1",
    owner_id: "owner_a",
    employee_id: null,
    scenario: "owner_created_audit_event"
  },
  {
    id: "p0-006q2-audit-employee-created",
    corpid: "homelink",
    userid: "employee_a_1",
    role: "staff",
    action: "employee.entry.qa_scope_evidence",
    target: "p0-006q2-employee-audit-evidence",
    company_id: "company_a",
    property_id: "property_a_1",
    owner_id: null,
    employee_id: "employee_a_1",
    scenario: "employee_created_audit_event"
  },
  {
    id: "p0-006q2-audit-session-void",
    corpid: "homelink",
    userid: "owner_a",
    role: "owner",
    action: "session.void",
    target: "p0-006q2-session-void-evidence",
    company_id: "company_a",
    property_id: "property_a_1",
    owner_id: "owner_a",
    employee_id: "employee_a_1",
    scenario: "void_session_audit_event"
  },
  {
    id: "p0-006q2-audit-cross-tenant-negative",
    corpid: "homelink",
    userid: "owner_b",
    role: "owner",
    action: "tenant_scope.cross_tenant_negative_case",
    target: "p0-006q2-cross-tenant-negative-evidence",
    company_id: "company_b",
    property_id: "property_b_1",
    owner_id: "owner_b",
    employee_id: null,
    scenario: "cross_tenant_visibility_negative_case"
  },
  {
    id: "p0-006q2-audit-cross-property-negative",
    corpid: "homelink",
    userid: "manager_a",
    role: "manager",
    action: "tenant_scope.cross_property_negative_case",
    target: "p0-006q2-cross-property-negative-evidence",
    company_id: "company_a",
    property_id: "property_a_2",
    owner_id: null,
    employee_id: "employee_a_2",
    scenario: "cross_property_visibility_negative_case"
  }
];

const entryRows = [
  {
    event_id: "p0-006q2-entry-employee-entry",
    corpid: "homelink",
    userid: "employee_a_1",
    ref_id: "p0-006q2-employee-entry-evidence",
    ref_type: "qa_evidence",
    event_type: "employee_entry_adapter_prevalidation",
    field_name: "tenant_scope",
    old_value: "",
    operator_id: "employee_a_1",
    company_id: "company_a",
    property_id: "property_a_1",
    employee_id: "employee_a_1",
    scenario: "employee_entry_event"
  },
  {
    event_id: "p0-006q2-entry-handover",
    corpid: "homelink",
    userid: "employee_a_1",
    ref_id: "p0-006q2-handover-evidence",
    ref_type: "qa_evidence",
    event_type: "handover_commit_accepted",
    field_name: "tenant_scope",
    old_value: "",
    operator_id: "employee_a_1",
    company_id: "company_a",
    property_id: "property_a_1",
    employee_id: "employee_a_1",
    scenario: "handover_event"
  },
  {
    event_id: "p0-006q2-entry-session-void",
    corpid: "homelink",
    userid: "owner_a",
    ref_id: "p0-006q2-session-void-evidence",
    ref_type: "qa_evidence",
    event_type: "session_void",
    field_name: "tenant_scope",
    old_value: "",
    operator_id: "owner_a",
    company_id: "company_a",
    property_id: "property_a_1",
    employee_id: "employee_a_1",
    scenario: "void_event"
  },
  {
    event_id: "p0-006q2-entry-tenant-scoped",
    corpid: "homelink",
    userid: "owner_a",
    ref_id: "p0-006q2-tenant-scoped-evidence",
    ref_type: "qa_evidence",
    event_type: "tenant_scoped_event",
    field_name: "tenant_scope",
    old_value: "",
    operator_id: "owner_a",
    company_id: "company_a",
    property_id: "property_a_1",
    employee_id: "employee_a_1",
    scenario: "tenant_scoped_event"
  },
  {
    event_id: "p0-006q2-entry-property-scoped",
    corpid: "homelink",
    userid: "manager_a",
    ref_id: "p0-006q2-property-scoped-evidence",
    ref_type: "qa_evidence",
    event_type: "property_scoped_event",
    field_name: "tenant_scope",
    old_value: "",
    operator_id: "manager_a",
    company_id: "company_a",
    property_id: "property_a_2",
    employee_id: "employee_a_2",
    scenario: "property_scoped_event"
  },
  {
    event_id: "p0-006q2-entry-employee-scoped",
    corpid: "homelink",
    userid: "employee_a_1",
    ref_id: "p0-006q2-employee-scoped-evidence",
    ref_type: "qa_evidence",
    event_type: "employee_scoped_event",
    field_name: "tenant_scope",
    old_value: "",
    operator_id: "employee_a_1",
    company_id: "company_a",
    property_id: "property_a_1",
    employee_id: "employee_a_1",
    scenario: "employee_scoped_event"
  }
];

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function parseJsonOutput(output) {
  const parsed = JSON.parse(output);
  if (!Array.isArray(parsed)) throw new Error("Unexpected Wrangler JSON output.");
  return parsed;
}

function runWrangler(args) {
  return execFileSync(process.execPath, [wranglerBin, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function executeD1(command) {
  const output = runWrangler([
    "d1",
    "execute",
    STAGING_D1_NAME,
    "--remote",
    "--json",
    "--command",
    command
  ]);
  return parseJsonOutput(output);
}

function runGate() {
  const output = execFileSync(process.execPath, ["scripts/gate-commercial-launch-readiness.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (!output.includes("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO")) {
    throw new Error("Commercial launch gate is not PRODUCTION_NO_GO.");
  }
  return "PRODUCTION_NO_GO";
}

function assertTargetD1() {
  const output = runWrangler(["d1", "info", STAGING_D1_NAME]);
  if (!output.includes(STAGING_D1_NAME) || !output.includes(STAGING_D1_ID)) {
    throw new Error("Target D1 confirmation failed.");
  }
  return {
    name: STAGING_D1_NAME,
    id: STAGING_D1_ID
  };
}

function rowDetail(row) {
  return JSON.stringify({
    source: SOURCE,
    qa_run_id: QA_RUN_ID,
    scenario: row.scenario,
    production: false,
    evidence_only: true
  });
}

function auditInsertSql(row) {
  return [
    "INSERT OR IGNORE INTO audit_logs",
    "(id, corpid, userid, role, action, target, detail, company_id, property_id, owner_id, employee_id)",
    "VALUES",
    `(${[
      row.id,
      row.corpid,
      row.userid,
      row.role,
      row.action,
      row.target,
      rowDetail(row),
      row.company_id,
      row.property_id,
      row.owner_id,
      row.employee_id
    ]
      .map(sqlString)
      .join(", ")});`
  ].join(" ");
}

function entryInsertSql(row, timestamp) {
  const newValue = JSON.stringify({
    source: SOURCE,
    qa_run_id: QA_RUN_ID,
    scenario: row.scenario,
    production: false,
    evidence_only: true
  });
  return [
    "INSERT OR IGNORE INTO entry_events",
    "(event_id, corpid, userid, ref_id, ref_type, event_type, field_name, old_value, new_value, operator_id, ts, company_id, property_id, employee_id)",
    "VALUES",
    `(${[
      row.event_id,
      row.corpid,
      row.userid,
      row.ref_id,
      row.ref_type,
      row.event_type,
      row.field_name,
      row.old_value,
      newValue,
      row.operator_id,
      timestamp,
      row.company_id,
      row.property_id,
      row.employee_id
    ]
      .map(sqlString)
      .join(", ")});`
  ].join(" ");
}

function existingCounts() {
  const sql = [
    "SELECT 'audit_logs' AS table_name, COUNT(*) AS existing",
    "FROM audit_logs",
    `WHERE id IN (${auditRows.map((row) => sqlString(row.id)).join(", ")})`,
    "UNION ALL",
    "SELECT 'entry_events' AS table_name, COUNT(*) AS existing",
    "FROM entry_events",
    `WHERE event_id IN (${entryRows.map((row) => sqlString(row.event_id)).join(", ")});`
  ].join(" ");
  const result = executeD1(sql);
  return Object.fromEntries(
    (result[0]?.results || []).map((row) => [row.table_name, Number(row.existing) || 0])
  );
}

function buildInsertSql() {
  const timestamp = new Date().toISOString();
  return [
    ...auditRows.map(auditInsertSql),
    ...entryRows.map((row) => entryInsertSql(row, timestamp))
  ].join("\n");
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

async function writeReport({ mode, target, gate, before, after, inserted, result }) {
  const plannedRows = [
    {
      Table: "audit_logs",
      Planned: auditRows.length,
      "Existing Before": before.audit_logs || 0,
      "Existing After": after.audit_logs ?? "not run",
      Inserted: inserted.audit_logs ?? 0,
      Result: result.audit_logs
    },
    {
      Table: "entry_events",
      Planned: entryRows.length,
      "Existing Before": before.entry_events || 0,
      "Existing After": after.entry_events ?? "not run",
      Inserted: inserted.entry_events ?? 0,
      Result: result.entry_events
    }
  ];
  const report = [
    "# P0-006Q2 Seed Script Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Mode: \`${mode}\``,
    `Target D1: \`${target.name}\``,
    `Target D1 ID: \`${target.id}\``,
    `Commercial launch gate: \`${gate}\``,
    `QA run id: \`${QA_RUN_ID}\``,
    `Source marker: \`${SOURCE}\``,
    "",
    markdownTable(plannedRows, [
      "Table",
      "Planned",
      "Existing Before",
      "Existing After",
      "Inserted",
      "Result"
    ]),
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging target: homelink-finance-staging only.",
    "- Business tables written: no.",
    "- Tables eligible for insert: audit_logs, entry_events.",
    "- Secrets/passwords/tokens/cookies printed: no.",
    "",
    mode === "dry-run"
      ? "Dry-run result: no staging rows were written. Use the explicit confirmation flag to write approved staging-only QA evidence rows."
      : "Write result: staging-only QA evidence rows were inserted or skipped idempotently when they already existed.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
}

async function run() {
  const shouldWrite = process.argv.includes(CONFIRM_WRITE_FLAG);
  const target = assertTargetD1();
  const gate = runGate();
  const before = existingCounts();
  const mode = shouldWrite ? "write" : "dry-run";
  let after = { ...before };
  let inserted = { audit_logs: 0, entry_events: 0 };
  const result = {
    audit_logs: shouldWrite ? "PENDING" : "DRY_RUN_ONLY",
    entry_events: shouldWrite ? "PENDING" : "DRY_RUN_ONLY"
  };

  if (shouldWrite) {
    executeD1(buildInsertSql());
    after = existingCounts();
    inserted = {
      audit_logs: Math.max(0, (after.audit_logs || 0) - (before.audit_logs || 0)),
      entry_events: Math.max(0, (after.entry_events || 0) - (before.entry_events || 0))
    };
    result.audit_logs =
      after.audit_logs === auditRows.length ? "PASS" : "PARTIAL_OR_SKIPPED_EXISTING";
    result.entry_events =
      after.entry_events === entryRows.length ? "PASS" : "PARTIAL_OR_SKIPPED_EXISTING";
  }

  await writeReport({ mode, target, gate, before, after, inserted, result });
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_MODE=${mode}`);
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_TARGET=${target.name}`);
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_TARGET_ID=${target.id}`);
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_GATE=${gate}`);
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_QA_RUN_ID=${QA_RUN_ID}`);
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_AUDIT_PLANNED=${auditRows.length}`);
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_ENTRY_PLANNED=${entryRows.length}`);
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_AUDIT_INSERTED=${inserted.audit_logs}`);
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_ENTRY_INSERTED=${inserted.entry_events}`);
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_PRODUCTION_D1_WRITE=no`);
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_BUSINESS_TABLE_WRITE=no`);
  console.log(`TENANT_AUDIT_EVENT_EVIDENCE_REPORT=${path.relative(process.cwd(), reportPath)}`);
}

export { QA_RUN_ID, SOURCE, STAGING_D1_ID, STAGING_D1_NAME, auditRows, buildInsertSql, entryRows };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_AUDIT_EVENT_EVIDENCE_RESULT=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

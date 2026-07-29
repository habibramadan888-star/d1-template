#!/usr/bin/env node
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const expectedStagingD1 = {
  name: "homelink-finance-staging",
  id: "4ff78bfc-3855-436b-aefb-6b492145d79c"
};
const reportPath = path.resolve("TENANT_SCOPE_STAGING_BACKFILL_DRY_RUN_RESULT.md");
const trackedTables = [
  "active_sessions",
  "sessions",
  "transactions",
  "deposit_ledger",
  "arrears",
  "arrear_tasks",
  "audit_logs",
  "entry_events",
  "app_settings",
  "handover_commits",
  "handover_commit_rows",
  "handover_idempotency_keys",
  "handover_audit_events"
];

function quotePs(arg) {
  return `'${String(arg).replaceAll("'", "''")}'`;
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

function runWrangler(args) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "powershell.exe" : "npx";
    const spawnArgs =
      process.platform === "win32"
        ? ["-NoProfile", "-Command", `& ${["npx", "wrangler", ...args].map(quotePs).join(" ")}`]
        : ["wrangler", ...args];
    const child = spawn(command, spawnArgs, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function assertStagingTarget() {
  const result = await runWrangler(["d1", "info", expectedStagingD1.name, "--json"]);
  if (result.code !== 0) {
    throw new Error(`Unable to confirm staging D1 target. Exit ${result.code}.`);
  }
  const parsed = JSON.parse(result.stdout);
  if (parsed.name !== expectedStagingD1.name || parsed.uuid !== expectedStagingD1.id) {
    throw new Error("D1 target mismatch; refusing tenant scope staging backfill dry-run.");
  }
  return parsed;
}

async function d1Select(sql) {
  const result = await runWrangler([
    "d1",
    "execute",
    expectedStagingD1.name,
    "--remote",
    "--json",
    "--command",
    sql.replace(/\s+/g, " ").trim()
  ]);
  if (result.code !== 0) {
    throw new Error(`Read-only staging D1 SELECT failed with exit code ${result.code}.`);
  }
  const parsed = JSON.parse(result.stdout);
  return parsed?.[0]?.results || [];
}

function hasColumn(sql, column) {
  return new RegExp(`(?:^|[\\s,(])${column}\\b`, "i").test(String(sql || ""));
}

function yesNo(value) {
  return value ? "yes" : "no";
}

export function buildTenantScopeStagingBackfillRows({ schemaRows, counts }) {
  return schemaRows.map((schema) => {
    const table = schema.name;
    const sql = schema.sql || "";
    const hasCorpid = hasColumn(sql, "corpid");
    const hasCompany = hasColumn(sql, "company_id");
    const hasProperty = hasColumn(sql, "property_id");
    const count = counts[table] || {
      total: 0,
      legacyCorpidRows: 0,
      missingCompanyRows: 0,
      missingPropertyRows: 0
    };
    const hasRows = count.total > 0;
    const missingScopedRows = count.missingCompanyRows + count.missingPropertyRows;
    const result =
      hasCompany && hasProperty
        ? missingScopedRows
          ? "MANUAL_REQUIRED"
          : "PASS"
        : hasCorpid
          ? "LEGACY_WARNING"
          : hasRows
            ? "MANUAL_REQUIRED"
            : "PASS";
    const draft =
      result === "PASS"
        ? "NO_UPDATE_REQUIRED"
        : result === "LEGACY_WARNING"
          ? "DRAFT_BACKFILL_REQUIRED_AFTER_SCHEMA_APPROVAL"
          : "MANUAL_REVIEW_REQUIRED_BEFORE_BACKFILL";

    return {
      Table: table,
      "Row Count": String(count.total),
      "Has CORPID": yesNo(hasCorpid),
      "Has Company": yesNo(hasCompany),
      "Has Property": yesNo(hasProperty),
      "Legacy CORPID Rows": String(count.legacyCorpidRows),
      "Missing Company Rows": String(count.missingCompanyRows),
      "Missing Property Rows": String(count.missingPropertyRows),
      "Draft Update Plan": draft,
      Result: result,
      Notes:
        result === "PASS"
          ? "No staging backfill update is needed for this dry-run row set."
          : result === "LEGACY_WARNING"
            ? "Legacy-scoped table needs approved schema/backfill task; no write generated now."
            : "Manual mapping/reconciliation required before any staging write."
    };
  });
}

export function summarizeTenantScopeStagingBackfillRows(rows) {
  const blocked = rows.filter((row) => row.Result === "BLOCKED");
  const manual = rows.filter((row) => row.Result === "MANUAL_REQUIRED");
  const warnings = rows.filter((row) => row.Result === "LEGACY_WARNING");
  const proposedWrites = rows.filter((row) => row["Draft Update Plan"] !== "NO_UPDATE_REQUIRED");
  return {
    overall: blocked.length ? "BLOCKED" : "PASS",
    rowCount: rows.length,
    blockedCount: blocked.length,
    manualRequiredCount: manual.length,
    legacyWarningCount: warnings.length,
    proposedWritePlanCount: proposedWrites.length
  };
}

async function readCountsForTable(schema) {
  const table = schema.name;
  const sql = schema.sql || "";
  const hasCorpid = hasColumn(sql, "corpid");
  const hasCompany = hasColumn(sql, "company_id");
  const hasProperty = hasColumn(sql, "property_id");
  const select = [
    "COUNT(*) AS total",
    hasCorpid
      ? "SUM(CASE WHEN corpid IS NOT NULL AND corpid != '' THEN 1 ELSE 0 END) AS legacy_corpid_rows"
      : "0 AS legacy_corpid_rows",
    hasCompany
      ? "SUM(CASE WHEN company_id IS NULL OR company_id = '' THEN 1 ELSE 0 END) AS missing_company_rows"
      : "0 AS missing_company_rows",
    hasProperty
      ? "SUM(CASE WHEN property_id IS NULL OR property_id = '' THEN 1 ELSE 0 END) AS missing_property_rows"
      : "0 AS missing_property_rows"
  ].join(", ");
  const rows = await d1Select(`SELECT ${select} FROM ${table}`);
  const row = rows[0] || {};
  return {
    total: Number(row.total || 0),
    legacyCorpidRows: Number(row.legacy_corpid_rows || 0),
    missingCompanyRows: Number(row.missing_company_rows || 0),
    missingPropertyRows: Number(row.missing_property_rows || 0)
  };
}

async function readStagingBackfillSnapshot() {
  const target = await assertStagingTarget();
  const schemaRows = await d1Select(`SELECT name, sql FROM sqlite_schema
    WHERE type = 'table'
      AND name IN (${trackedTables.map((table) => `'${table}'`).join(", ")})
    ORDER BY name`);
  const counts = {};
  for (const schema of schemaRows) {
    if (!trackedTables.includes(schema.name)) continue;
    counts[schema.name] = await readCountsForTable(schema);
  }
  return { target, schemaRows, counts };
}

async function run() {
  const snapshot = await readStagingBackfillSnapshot();
  const rows = buildTenantScopeStagingBackfillRows(snapshot);
  const summary = summarizeTenantScopeStagingBackfillRows(rows);
  const report = [
    "# Tenant Scope Staging Backfill Dry-Run Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: read-only staging tenant scope backfill dry-run. This script confirms the staging D1 target, reads table schema/counts with SELECT only, generates draft update-plan classifications, and does not deploy, migrate, write D1 rows, call production, mutate dashboard/history output, or remove legacy CORPID fallback.",
    "",
    `Target D1: \`${snapshot.target.name}\` (\`${snapshot.target.uuid}\`)`,
    `Overall: \`${summary.overall}\``,
    "",
    markdownTable(rows, [
      "Table",
      "Row Count",
      "Has CORPID",
      "Has Company",
      "Has Property",
      "Legacy CORPID Rows",
      "Missing Company Rows",
      "Missing Property Rows",
      "Draft Update Plan",
      "Result",
      "Notes"
    ]),
    "",
    "Summary:",
    "",
    `- Tables reviewed: ${summary.rowCount}.`,
    `- Blocked tables: ${summary.blockedCount}.`,
    `- Manual-required tables: ${summary.manualRequiredCount}.`,
    `- Legacy-warning tables: ${summary.legacyWarningCount}.`,
    `- Draft write-plan classifications: ${summary.proposedWritePlanCount}.`,
    "",
    "Command safety:",
    "",
    "- SAFE_TO_RUN_NOW for any generated write plan: no.",
    "- NEEDS_HUMAN_APPROVAL for any staging write: yes.",
    "- WRITES_SCHEMA: no.",
    "- WRITES_DATA: no.",
    "- PRODUCTION_FORBIDDEN: yes.",
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- D1 command type: read-only SELECT.",
    "- Dashboard/history live result changed: no.",
    "- Production auth behavior changed: no.",
    "- Legacy CORPID fallback removed: no.",
    "- Secret/password/token/cookie printed: no.",
    "",
    "Production meaning:",
    "",
    "- P0-006 remains Partial, not Verified.",
    "- This dry-run does not approve staging writes or production migration.",
    "- Production remains blocked until backup, rollback, live query wiring, and human tenancy decisions are approved.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`TENANT_SCOPE_STAGING_BACKFILL_DRY_RUN=${summary.overall}`);
  console.log(`TENANT_SCOPE_STAGING_BACKFILL_TABLES=${summary.rowCount}`);
  console.log(`TENANT_SCOPE_STAGING_BACKFILL_BLOCKED=${summary.blockedCount}`);
  console.log(`TENANT_SCOPE_STAGING_BACKFILL_MANUAL_REQUIRED=${summary.manualRequiredCount}`);
  console.log(`TENANT_SCOPE_STAGING_BACKFILL_LEGACY_WARNINGS=${summary.legacyWarningCount}`);
  console.log(`TENANT_SCOPE_STAGING_BACKFILL_REPORT=${path.relative(process.cwd(), reportPath)}`);
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_SCOPE_STAGING_BACKFILL_DRY_RUN=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

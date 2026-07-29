#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  resolveTenantScopeShadowMode,
  summarizeTenantScopeScenarios,
  TENANT_SCOPE_SHADOW_STAGING_FLAG
} from "../modules/tenant/scope.mjs";
import { createTenantScopeRehearsalRows } from "./rehearse-tenant-scope-local-staging.mjs";

const expectedStagingD1 = {
  name: "homelink-finance-staging",
  id: "4ff78bfc-3855-436b-aefb-6b492145d79c"
};
const fixturePath = path.resolve("tests/fixtures/tenant-scope/local-staging.json");
const reportPath = path.resolve("TENANT_SCOPE_STAGING_SHADOW_GATE_RESULT.md");
const trackedTables = [
  "active_sessions",
  "sessions",
  "transactions",
  "deposit_ledger",
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
    throw new Error("D1 target mismatch; refusing tenant scope staging shadow gate.");
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

async function readTableCounts(tableNames) {
  const counts = {};
  for (const table of tableNames) {
    if (!trackedTables.includes(table)) continue;
    const rows = await d1Select(`SELECT COUNT(*) AS row_count FROM ${table}`);
    counts[table] = Number(rows?.[0]?.row_count || 0);
  }
  return counts;
}

export async function readStagingTenantScopeSnapshot() {
  const target = await assertStagingTarget();
  const schemaRows = await d1Select(`SELECT name, sql FROM sqlite_schema
    WHERE type = 'table'
      AND name IN (${trackedTables.map((table) => `'${table}'`).join(", ")})
    ORDER BY name`);
  const counts = await readTableCounts(schemaRows.map((row) => row.name));
  return { target, schemaRows, counts };
}

export function createTenantScopeShadowRows({ schemaRows, counts, fixtureRows }) {
  const rows = schemaRows.map((schema) => {
    const table = schema.name;
    const hasCompany = hasColumn(schema.sql, "company_id");
    const hasProperty = hasColumn(schema.sql, "property_id");
    const hasCorpid = hasColumn(schema.sql, "corpid");
    const rowCount = counts[table] ?? 0;
    const result =
      hasCompany && hasProperty ? "PASS" : hasCorpid ? "LEGACY_WARNING" : "MANUAL_REQUIRED";
    const notes =
      result === "PASS"
        ? "Company/property columns exist and can participate in staging shadow comparison."
        : result === "LEGACY_WARNING"
          ? "Legacy table still relies on corpid; keep shadow-only until migration/backfill is approved."
          : "Table lacks explicit company/property scope and legacy corpid marker; manual review required.";
    return {
      Area: table,
      "Staging Source": `D1 table, rows=${rowCount}`,
      "Shadow Scope":
        hasCompany && hasProperty
          ? "company_id/property_id"
          : hasCorpid
            ? "legacy corpid"
            : "unknown",
      Result: result,
      Notes: notes
    };
  });

  const localSummary = summarizeTenantScopeScenarios(fixtureRows);
  rows.push({
    Area: "local cross-tenant fixture",
    "Staging Source": "tests/fixtures/tenant-scope/local-staging.json",
    "Shadow Scope": "company/property memberships",
    Result: localSummary.overall,
    Notes: `${localSummary.scenarioCount} scenarios, ${localSummary.leakCount} leaks.`
  });
  rows.push({
    Area: "dashboard live result",
    "Staging Source": "not mutated",
    "Shadow Scope": "shadow report only",
    Result: "PASS",
    Notes: "No dashboard/history live response is switched by this gate."
  });
  rows.push({
    Area: "production guard",
    "Staging Source": TENANT_SCOPE_SHADOW_STAGING_FLAG,
    "Shadow Scope": "production disabled",
    Result: resolveTenantScopeShadowMode({
      APP_ENV: "production",
      [TENANT_SCOPE_SHADOW_STAGING_FLAG]: "true"
    }).productionDisabled
      ? "PASS"
      : "BLOCKED",
    Notes: "Production remains disabled even if the shadow flag input is true."
  });
  return rows;
}

export function summarizeTenantScopeShadowRows(rows) {
  const blocked = rows.filter((row) => row.Result === "BLOCKED");
  const manual = rows.filter((row) => row.Result === "MANUAL_REQUIRED");
  const warnings = rows.filter((row) => row.Result === "LEGACY_WARNING");
  return {
    overall: blocked.length ? "BLOCKED" : "PASS",
    blockedCount: blocked.length,
    manualRequiredCount: manual.length,
    legacyWarningCount: warnings.length,
    rowCount: rows.length
  };
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

async function run() {
  const snapshot = await readStagingTenantScopeSnapshot();
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  const fixtureRows = createTenantScopeRehearsalRows(fixture);
  const rows = createTenantScopeShadowRows({
    schemaRows: snapshot.schemaRows,
    counts: snapshot.counts,
    fixtureRows
  });
  const summary = summarizeTenantScopeShadowRows(rows);
  const report = [
    "# Tenant Scope Staging Shadow Gate Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: read-only staging/local tenant scope shadow gate. This script confirms the staging D1 target, reads table schema/counts with SELECT only, runs local cross-tenant fixture evidence, and does not deploy, migrate, write D1 rows, call production, mutate dashboard output, or change auth behavior.",
    "",
    `Target D1: \`${snapshot.target.name}\` (\`${snapshot.target.uuid}\`)`,
    `Feature flag: \`${TENANT_SCOPE_SHADOW_STAGING_FLAG}\``,
    `Overall: \`${summary.overall}\``,
    "",
    markdownTable(rows, ["Area", "Staging Source", "Shadow Scope", "Result", "Notes"]),
    "",
    "Summary:",
    "",
    `- Rows reviewed: ${summary.rowCount}.`,
    `- Blocked rows: ${summary.blockedCount}.`,
    `- Manual-required rows: ${summary.manualRequiredCount}.`,
    `- Legacy-warning rows: ${summary.legacyWarningCount}.`,
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- D1 command type: read-only SELECT.",
    "- Production auth behavior changed: no.",
    "- Legacy CORPID fallback removed: no.",
    "- Dashboard/history live result changed: no.",
    "- Secret/password/token/cookie printed: no.",
    "",
    "Production meaning:",
    "",
    "- P0-006 remains Partial, not Verified.",
    "- Legacy `corpid` tables remain expected warnings, not production-ready scope.",
    "- Production remains blocked until migration, backfill, live route enforcement, and human tenancy decisions are approved.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`TENANT_SCOPE_STAGING_SHADOW_GATE=${summary.overall}`);
  console.log(`TENANT_SCOPE_STAGING_SHADOW_LEGACY_WARNINGS=${summary.legacyWarningCount}`);
  console.log(`TENANT_SCOPE_STAGING_SHADOW_MANUAL_REQUIRED=${summary.manualRequiredCount}`);
  console.log(`TENANT_SCOPE_STAGING_SHADOW_REPORT=${path.relative(process.cwd(), reportPath)}`);
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_SCOPE_STAGING_SHADOW_GATE=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

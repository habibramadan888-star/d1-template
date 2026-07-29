#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const root = process.cwd();

function safeList(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? safeList(fullPath) : [fullPath];
  });
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

const scanFiles = [
  path.join(root, "deploy-worker", "src", "index.js"),
  ...safeList(path.join(root, "migrations")).filter((file) => file.endsWith(".sql")),
  ...safeList(path.join(root, "migration-drafts")).filter((file) => file.endsWith(".sql"))
].filter((file) => fs.existsSync(file));

const sources = new Map(scanFiles.map((file) => [rel(file), read(file)]));
const combined = [...sources.values()].join("\n\n");

const requiredTables = [
  "active_sessions",
  "employee_users",
  "sessions",
  "transactions",
  "deposit_ledger",
  "arrears",
  "arrear_tasks",
  "entry_events",
  "audit_logs",
  "app_settings",
  "handover_commits",
  "handover_commit_rows",
  "handover_idempotency_keys",
  "handover_audit_events",
  "receivables",
  "receivable_events",
  "payment_allocations",
  "receivable_adjustments",
  "companies",
  "properties",
  "property_memberships",
  "users"
];

const financialTables = new Set([
  "sessions",
  "transactions",
  "deposit_ledger",
  "arrears",
  "arrear_tasks",
  "handover_commits",
  "handover_commit_rows",
  "receivables",
  "receivable_events",
  "payment_allocations",
  "receivable_adjustments"
]);

const voidTrackedTables = new Set([
  "sessions",
  "transactions",
  "deposit_ledger",
  "arrears",
  "arrear_tasks",
  "handover_commits",
  "handover_commit_rows",
  "receivables",
  "receivable_adjustments"
]);

const auditUserTables = new Set([
  "sessions",
  "transactions",
  "deposit_ledger",
  "arrears",
  "arrear_tasks",
  "handover_commits",
  "handover_commit_rows",
  "receivables",
  "receivable_events",
  "payment_allocations",
  "receivable_adjustments",
  "audit_logs",
  "entry_events",
  "handover_audit_events"
]);

function tableSources(table) {
  return [...sources.entries()]
    .filter(([, text]) => new RegExp(`\\b${table}\\b`, "i").test(text))
    .map(([file]) => file);
}

function hasField(table, fieldPattern) {
  const tableRegex = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${table}\\s*\\(([\\s\\S]*?)\\)`,
    "gi"
  );
  for (const match of combined.matchAll(tableRegex)) {
    if (fieldPattern.test(match[1])) return true;
  }
  const alterRegex = new RegExp(`ALTER\\s+TABLE\\s+${table}\\s+ADD\\s+COLUMN\\s+`, "i");
  return alterRegex.test(combined) && fieldPattern.test(combined);
}

function hasAnyField(table, patterns) {
  return patterns.some((pattern) => hasField(table, pattern));
}

function readinessFor(table) {
  const foundIn = tableSources(table);
  const exists = foundIn.length > 0;
  const hasTenant = hasAnyField(table, [/\btenant_id\b/i, /\bcompany_id\b/i, /\bcorpid\b/i]);
  const hasProperty = hasAnyField(table, [/\bproperty_id\b/i, /\bbed\b/i, /\broom\b/i]);
  const hasCreatedAt = hasField(table, /\bcreated_at\b/i);
  const hasUpdatedAt = hasField(table, /\bupdated_at\b/i);
  const hasVoid = hasAnyField(table, [/\bvoided_at\b/i, /\bdeleted_at\b/i]);
  const hasAuditUser = hasAnyField(table, [/\bcreated_by\b/i, /\bupdated_by\b/i, /\bvoided_by\b/i]);
  const hasFils = hasField(table, /\b[a-z0-9_]*_fils\b/i);
  const hasReal = hasField(table, /\bREAL\b/i);
  const hasRuntimeDdl = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${table}\\b`,
    "i"
  ).test(sources.get("deploy-worker/src/index.js") || "");

  const missing = [];
  if (!exists) missing.push("table not found in scanned sources");
  if (exists && !hasTenant) missing.push("tenant/company/corpid scope");
  if (exists && !hasCreatedAt) missing.push("created_at");
  if (exists && !hasUpdatedAt) missing.push("updated_at");
  if (voidTrackedTables.has(table) && !hasVoid) {
    missing.push("void/delete compatibility");
  }
  if (financialTables.has(table) && !hasFils) {
    missing.push("integer minor-unit fields");
  }
  if (exists && auditUserTables.has(table) && !hasAuditUser) {
    missing.push("audit user fields");
  }

  const risk = !exists
    ? "P0"
    : hasReal || (financialTables.has(table) && !hasFils) || missing.length >= 3
      ? "P0/P1"
      : hasRuntimeDdl
        ? "P1"
        : missing.length
          ? "P1"
          : "P2";

  const status = !exists ? "BLOCKED" : missing.length ? "MANUAL_REQUIRED" : "READY_DRAFT";

  return {
    table,
    exists,
    foundIn,
    hasTenant,
    hasProperty,
    hasCreatedAt,
    hasUpdatedAt,
    hasVoid,
    hasAuditUser,
    hasFils,
    hasReal,
    hasRuntimeDdl,
    missing,
    risk,
    status
  };
}

const rows = requiredTables.map(readinessFor);
const summary = {
  tables: rows.length,
  blocked: rows.filter((row) => row.status === "BLOCKED").length,
  manual: rows.filter((row) => row.status === "MANUAL_REQUIRED").length,
  readyDraft: rows.filter((row) => row.status === "READY_DRAFT").length,
  runtimeDdl: rows.filter((row) => row.hasRuntimeDdl).length,
  realMoney: rows.filter((row) => row.hasReal).length,
  fils: rows.filter((row) => row.hasFils).length
};

const matrix = [
  "# DB Table Commercial Readiness Matrix",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "Scope: static table-by-table commercial readiness audit. This script is read-only and does not connect to D1, deploy, or run migrations.",
  "",
  "| Table | Exists | Source Files | Tenant Scope | Property Scope | Audit Fields | Void/Delete Fields | Fils Fields | REAL Risk | Runtime DDL | Missing / Risk | Status |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...rows.map((row) => {
    const cells = [
      `\`${row.table}\``,
      row.exists ? "Yes" : "No",
      row.foundIn.map((file) => `\`${file}\``).join("<br>") || "none",
      row.hasTenant ? "Yes" : "No",
      row.hasProperty ? "Yes" : "No",
      row.hasAuditUser ? "Yes" : "No",
      row.hasVoid ? "Yes" : "No",
      row.hasFils ? "Yes" : "No",
      row.hasReal ? "Yes" : "No",
      row.hasRuntimeDdl ? "Yes" : "No",
      row.missing.join("<br>") || row.risk,
      row.status
    ];
    return `| ${cells.join(" | ")} |`;
  }),
  "",
  "## Interpretation",
  "",
  "- `READY_DRAFT` means static fields look acceptable for draft/local use only; it is not production approval.",
  "- `MANUAL_REQUIRED` means table shape or scope requires human review before staging/production use.",
  "- `BLOCKED` means the table is expected by commercial design but missing from scanned sources.",
  "- Runtime DDL and `REAL` money storage remain separate launch blockers tracked by P1-002 and P0-001."
];

const result = [
  "# DB Table Readiness Audit Result",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "| Metric | Count |",
  "| --- | ---: |",
  `| Tables reviewed | ${summary.tables} |`,
  `| BLOCKED tables | ${summary.blocked} |`,
  `| MANUAL_REQUIRED tables | ${summary.manual} |`,
  `| READY_DRAFT tables | ${summary.readyDraft} |`,
  `| Tables with runtime DDL evidence | ${summary.runtimeDdl} |`,
  `| Tables with REAL risk | ${summary.realMoney} |`,
  `| Tables with *_fils fields | ${summary.fils} |`,
  "",
  "Overall: `MANUAL_REQUIRED`",
  "",
  "Reasons:",
  "",
  "- Legacy tables still contain `REAL` money fields.",
  "- Tenant/property scope is not consistently represented.",
  "- Runtime DDL still exists for several Worker-owned tables.",
  "- Receivables and tenant tables are design/draft level, not production-applied.",
  "",
  "No production deploy, migration, remote D1 access, or secret access was performed."
];

fs.writeFileSync(
  path.resolve("DB_TABLE_COMMERCIAL_READINESS_MATRIX.md"),
  await prettier.format(`${matrix.join("\n")}\n`, { parser: "markdown" })
);
fs.writeFileSync(
  path.resolve("DB_TABLE_READINESS_AUDIT_RESULT.md"),
  await prettier.format(`${result.join("\n")}\n`, { parser: "markdown" })
);

console.log("DB_TABLE_READINESS_AUDIT=MANUAL_REQUIRED");
console.log(`DB_TABLES_REVIEWED=${summary.tables}`);
console.log(`DB_TABLES_BLOCKED=${summary.blocked}`);
console.log(`DB_TABLES_MANUAL_REQUIRED=${summary.manual}`);

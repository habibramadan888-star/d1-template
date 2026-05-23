import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const workerDir = path.join(rootDir, "deploy-worker");
const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");

const sourceTables = [
  "sessions",
  "transactions",
  "arrears",
  "arrear_tasks",
  "deposit_ledger",
  "entry_events",
  "audit_logs",
  "employee_users",
  "app_settings"
];

const targetTables = [
  "companies",
  "properties",
  "users",
  "property_memberships",
  "beds",
  "bed_rent_config_versions",
  "handover_sessions",
  "transactions",
  "receivables",
  "payments",
  "arrear_tasks",
  "deposit_ledger",
  "audit_events"
];

const moneyKeys = [
  "legacy_transaction_amount_fils",
  "legacy_transaction_due_fils",
  "legacy_transaction_paid_fils",
  "legacy_transaction_deficit_fils",
  "legacy_session_cash_handover_fils",
  "legacy_session_bank_transfer_fils",
  "legacy_session_gross_received_fils",
  "legacy_arrear_remaining_fils",
  "legacy_deposit_delta_fils",
  "target_payment_amount_fils",
  "target_receivable_due_fils",
  "target_receivable_paid_fils",
  "target_receivable_remaining_fils",
  "target_deposit_delta_fils",
  "target_handover_cash_fils",
  "target_handover_bank_fils",
  "target_handover_gross_fils"
];

function parseArgs(argv) {
  const args = {
    persistTo: "",
    outDir: "reconciliation-output",
    database: "homelink",
    config: "wrangler.toml",
    legacyCorpid: "",
    companyId: "",
    propertyId: "",
    sourceLabel: "local-copy"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      i += 1;
      return value;
    };

    if (arg === "--persist-to") args.persistTo = next();
    else if (arg === "--out-dir") args.outDir = next();
    else if (arg === "--database") args.database = next();
    else if (arg === "--config") args.config = next();
    else if (arg === "--legacy-corpid") args.legacyCorpid = next();
    else if (arg === "--company-id") args.companyId = next();
    else if (arg === "--property-id") args.propertyId = next();
    else if (arg === "--source-label") args.sourceLabel = next();
    else if (arg === "--remote" || arg === "--preview") {
      throw new Error(`${arg} is forbidden for legacy reconciliation dry-run.`);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.persistTo) throw new Error("Missing required --persist-to <local D1 state directory>.");
  return args;
}

function runWrangler(args) {
  return execFileSync(process.execPath, [wranglerBin, ...args], {
    cwd: workerDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function query(args, sql) {
  const output = runWrangler([
    "d1",
    "execute",
    args.database,
    "--local",
    "--persist-to",
    args.persistTo,
    "--config",
    args.config,
    "--command",
    sql,
    "--json"
  ]);
  const text = output.trim();
  const starts = [text.indexOf("["), text.indexOf("{")].filter((index) => index >= 0);
  if (!starts.length) throw new Error(`Wrangler output did not contain JSON: ${text}`);
  const json = JSON.parse(text.slice(Math.min(...starts)));
  return Array.isArray(json) ? json.flatMap((entry) => entry.results ?? []) : [];
}

function escapeIdentifier(identifier) {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) throw new Error(`Unsafe SQL identifier: ${identifier}`);
  return identifier;
}

function tableExists(tableNames, table) {
  return tableNames.has(table);
}

function columnsFor(args, tableNames, table) {
  if (!tableExists(tableNames, table)) return new Set();
  return new Set(
    query(args, `PRAGMA table_info(${escapeIdentifier(table)});`).map((row) => row.name)
  );
}

function countRows(args, tableNames, table) {
  if (!tableExists(tableNames, table)) return 0;
  const rows = query(args, `SELECT COUNT(*) AS count FROM ${escapeIdentifier(table)};`);
  return Number(rows[0]?.count ?? 0);
}

function toFils(value) {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return 0;
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");
  const cents = BigInt(whole || "0") * 100n + BigInt((fraction + "00").slice(0, 2));
  const safe = Number(cents);
  return negative ? -safe : safe;
}

function sumColumn(args, tableNames, columnCache, table, column) {
  if (!tableExists(tableNames, table)) return 0;
  const columns = columnCache.get(table) ?? columnsFor(args, tableNames, table);
  columnCache.set(table, columns);
  if (!columns.has(column)) return 0;
  const rows = query(
    args,
    `SELECT COALESCE(SUM(${escapeIdentifier(column)}),0) AS value FROM ${escapeIdentifier(table)};`
  );
  return toFils(rows[0]?.value ?? 0);
}

function exception(severity, code, message) {
  return {
    severity,
    code,
    legacy_table: "",
    legacy_id: "",
    target_table: "",
    target_id: "",
    message,
    amount_delta_fils: 0,
    requires_manual_review: severity === "P0" || severity === "P1"
  };
}

function writeReports(outDir, report) {
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "legacy-reconciliation-report.json");
  const mdPath = path.join(outDir, "legacy-reconciliation-report.md");
  const csvPath = path.join(outDir, "legacy-reconciliation-exceptions.csv");

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(
    mdPath,
    [
      "# Legacy Reconciliation Dry-Run Report",
      "",
      `Generated: ${report.run.finished_at}`,
      "",
      "Mode: read-only local D1 dry-run.",
      "",
      "No SQL writes were executed. No backfill was performed.",
      "",
      "## Scope",
      "",
      `- source: ${report.run.source}`,
      `- legacy_corpid: ${report.scope.legacy_corpid || "(not provided)"}`,
      `- company_id: ${report.scope.company_id || "(not provided)"}`,
      `- property_id: ${report.scope.property_id || "(not provided)"}`,
      "",
      "## Exceptions",
      "",
      `- total: ${report.exceptions.length}`,
      `- no_go: ${report.no_go.length}`,
      "",
      "See JSON and CSV outputs for machine-readable details.",
      ""
    ].join("\n")
  );

  const csvRows = [
    "severity,code,legacy_table,legacy_id,target_table,target_id,message,amount_delta_fils,requires_manual_review",
    ...report.exceptions.map((row) =>
      [
        row.severity,
        row.code,
        row.legacy_table,
        row.legacy_id,
        row.target_table,
        row.target_id,
        `"${String(row.message).replaceAll('"', '""')}"`,
        row.amount_delta_fils,
        row.requires_manual_review
      ].join(",")
    )
  ];
  fs.writeFileSync(csvPath, `${csvRows.join("\n")}\n`);
  return { jsonPath, mdPath, csvPath };
}

const args = parseArgs(process.argv.slice(2));
const startedAt = new Date().toISOString();
const tableRows = query(args, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
const tableNames = new Set(tableRows.map((row) => row.name));
const columnCache = new Map();
const exceptions = [];

if (!args.companyId || !args.propertyId) {
  exceptions.push(
    exception(
      "P0",
      "MISSING_SCOPE_MAPPING",
      "Dry-run requires reviewed --company-id and --property-id before promotion."
    )
  );
}

for (const table of sourceTables) {
  if (!tableExists(tableNames, table)) {
    exceptions.push(exception("P2", "LEGACY_TABLE_MISSING", `Legacy table missing: ${table}`));
  }
}

const sourceCounts = Object.fromEntries(
  sourceTables.map((table) => [table, countRows(args, tableNames, table)])
);
const targetCounts = Object.fromEntries(
  targetTables.map((table) => [table, countRows(args, tableNames, table)])
);
const moneyTotals = Object.fromEntries(moneyKeys.map((key) => [key, 0]));

moneyTotals.legacy_transaction_amount_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "transactions",
  "amount"
);
moneyTotals.legacy_transaction_due_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "transactions",
  "due"
);
moneyTotals.legacy_transaction_paid_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "transactions",
  "paid"
);
moneyTotals.legacy_transaction_deficit_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "transactions",
  "deficit"
);
moneyTotals.legacy_session_cash_handover_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "sessions",
  "cash_handover"
);
moneyTotals.legacy_session_bank_transfer_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "sessions",
  "bank_transfer_total"
);
moneyTotals.legacy_session_gross_received_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "sessions",
  "gross_received"
);
moneyTotals.legacy_arrear_remaining_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "arrears",
  "remain"
);
moneyTotals.legacy_deposit_delta_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "deposit_ledger",
  "delta"
);
moneyTotals.target_payment_amount_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "payments",
  "amount_fils"
);
moneyTotals.target_receivable_due_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "receivables",
  "amount_due_fils"
);
moneyTotals.target_receivable_paid_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "receivables",
  "amount_paid_fils"
);
moneyTotals.target_receivable_remaining_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "receivables",
  "amount_remaining_fils"
);
moneyTotals.target_deposit_delta_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "deposit_ledger",
  "delta_fils"
);
moneyTotals.target_handover_cash_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "handover_sessions",
  "cash_handover_fils"
);
moneyTotals.target_handover_bank_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "handover_sessions",
  "bank_transfer_total_fils"
);
moneyTotals.target_handover_gross_fils = sumColumn(
  args,
  tableNames,
  columnCache,
  "handover_sessions",
  "gross_received_fils"
);

const sourceMoneyTotal =
  moneyTotals.legacy_transaction_amount_fils +
  moneyTotals.legacy_arrear_remaining_fils +
  moneyTotals.legacy_deposit_delta_fils;
const targetMoneyTotal =
  moneyTotals.target_payment_amount_fils +
  moneyTotals.target_receivable_remaining_fils +
  moneyTotals.target_deposit_delta_fils;

if (sourceMoneyTotal !== targetMoneyTotal) {
  exceptions.push({
    ...exception("P1", "TOTAL_MONEY_DELTA", "Source and target aggregate money totals differ."),
    amount_delta_fils: targetMoneyTotal - sourceMoneyTotal
  });
}

const finishedAt = new Date().toISOString();
const report = {
  run: {
    mode: "dry-run",
    source: args.sourceLabel,
    source_backup_at: "",
    git_commit: "",
    started_at: startedAt,
    finished_at: finishedAt
  },
  scope: {
    legacy_corpid: args.legacyCorpid,
    company_id: args.companyId,
    property_id: args.propertyId,
    timezone: "Asia/Dubai",
    currency: "AED"
  },
  source_counts: sourceCounts,
  target_counts: targetCounts,
  money_totals_fils: moneyTotals,
  reconciliation: {
    session_totals: { status: "dry-run", exceptions: 0 },
    transaction_totals: {
      status: "dry-run",
      exceptions: sourceMoneyTotal === targetMoneyTotal ? 0 : 1
    },
    receivable_totals: { status: "dry-run", exceptions: 0 },
    deposit_balances: { status: "dry-run", exceptions: 0 },
    audit_coverage: { status: "dry-run", exceptions: 0 },
    tenant_scope: { status: "dry-run", exceptions: args.companyId && args.propertyId ? 0 : 1 },
    idempotency: { status: "not-run", exceptions: 0 }
  },
  exceptions,
  no_go: exceptions
    .filter((row) => row.severity === "P0")
    .map((row) => `${row.code}: ${row.message}`)
};

const outputPaths = writeReports(path.resolve(rootDir, args.outDir), report);

console.log("Legacy reconciliation dry-run completed.");
console.log(`Tables detected: ${tableNames.size}`);
console.log(`Exceptions: ${exceptions.length}`);
console.log(`No-go: ${report.no_go.length}`);
console.log(path.relative(rootDir, outputPaths.jsonPath).replaceAll("\\", "/"));
console.log(path.relative(rootDir, outputPaths.mdPath).replaceAll("\\", "/"));
console.log(path.relative(rootDir, outputPaths.csvPath).replaceAll("\\", "/"));

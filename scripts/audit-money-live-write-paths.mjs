import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const workerPath = path.join(rootDir, "deploy-worker", "src", "index.js");
const outputPath = path.join(rootDir, "MONEY_LIVE_WRITE_PATH_AUDIT_RESULT.md");

const FINANCIAL_TABLES = new Set([
  "sessions",
  "transactions",
  "deposit_ledger",
  "arrears",
  "arrear_tasks",
  "app_settings"
]);

const MONEY_PATTERNS = [
  { label: "Number(String(...))", regex: /Number\s*\(\s*String\s*\(/g },
  { label: "Number(...)", regex: /\bNumber\s*\(/g },
  { label: "parseFloat", regex: /\bparseFloat\s*\(/g },
  { label: "Math.round", regex: /\bMath\.round\s*\(/g },
  { label: "cleanMoney", regex: /\bcleanMoney\s*\(/g },
  { label: "SUM(amount)", regex: /SUM\s*\(\s*amount\s*\)/gi },
  { label: "SUM(paid)", regex: /SUM\s*\(\s*paid\s*\)/gi }
];

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function compactSql(sql) {
  return sql.replace(/\s+/g, " ").trim();
}

function sqlTable(sql) {
  const normalized = compactSql(sql);
  const insert = normalized.match(/^INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)/i);
  if (insert) return insert[1];
  const update = normalized.match(/^UPDATE\s+([A-Za-z_][A-Za-z0-9_]*)/i);
  if (update) return update[1];
  return "";
}

function sqlOperation(sql) {
  const normalized = compactSql(sql).toUpperCase();
  if (normalized.startsWith("INSERT")) return "INSERT";
  if (normalized.startsWith("UPDATE")) return "UPDATE";
  if (normalized.startsWith("DELETE")) return "DELETE";
  return "OTHER";
}

function areaForLine(line) {
  if (line >= 1270 && line <= 1300) return "deposit ledger move";
  if (line >= 1301 && line <= 1345) return "arrear reconciliation";
  if (line >= 1416 && line <= 1648) return "employee entry live write";
  if (line >= 1738 && line <= 1874) return "arrear task update";
  if (line >= 2603 && line <= 2703) return "manager save_session live write";
  if (line >= 2704 && line <= 2802) return "delete_session void path";
  if (line >= 2803 && line <= 2811) return "manager clear_arrear";
  if (line >= 2100 && line <= 2321) return "staging handover endpoint";
  return "other Worker path";
}

function classifyStatement({ sql, table, area }) {
  const operation = sqlOperation(sql);
  const normalized = compactSql(sql);
  const hasFils = /_fils\b/.test(normalized);
  const isVoidOnly =
    operation === "UPDATE" &&
    /voided_at|status\s*=\s*'VOID'|handover_status\s*=\s*'VOID'|close_status\s*=\s*'VOID'/i.test(
      normalized
    );
  const isConfigWrite = table === "app_settings";
  const isStaging = area.includes("staging");
  const isFinancial = FINANCIAL_TABLES.has(table);

  if (!isFinancial) return { risk: "P3", status: "Non-financial or ignored" };
  if (isStaging) return { risk: "P2", status: "Staging-only; keep isolated from live tables" };
  if (isVoidOnly) return { risk: "P1", status: "Allowed void/update path; verify no hard delete" };
  if (isConfigWrite) return { risk: "P1", status: "Rent config JSON still stores legacy money" };
  if (!hasFils) {
    return {
      risk: "P0",
      status: "Live financial write still stores legacy decimal/REAL authority"
    };
  }
  return { risk: "P1", status: "Uses minor-unit field, still needs reconciliation gate" };
}

function extractSqlStatements(source) {
  const statements = [];
  const re = /env\.DB\.prepare\(\s*(`[\s\S]*?`|"[^"]*"|'[^']*')/g;
  let match;
  while ((match = re.exec(source))) {
    const literal = match[1];
    const quote = literal[0];
    const sql = quote === "`" ? literal.slice(1, -1) : literal.slice(1, -1);
    const operation = sqlOperation(sql);
    if (!["INSERT", "UPDATE", "DELETE"].includes(operation)) continue;
    const table = sqlTable(sql);
    if (!FINANCIAL_TABLES.has(table)) continue;
    const line = lineNumberAt(source, match.index);
    const area = areaForLine(line);
    const classification = classifyStatement({ sql, table, area });
    statements.push({
      line,
      area,
      operation,
      table,
      risk: classification.risk,
      status: classification.status,
      hasFils: /_fils\b/.test(sql),
      sql: compactSql(sql).slice(0, 260)
    });
  }
  return statements;
}

function scanMoneyPatterns(source) {
  const lines = source.split(/\r?\n/);
  const findings = [];
  for (const [index, line] of lines.entries()) {
    for (const pattern of MONEY_PATTERNS) {
      pattern.regex.lastIndex = 0;
      if (!pattern.regex.test(line)) continue;
      const lineNumber = index + 1;
      findings.push({
        line: lineNumber,
        area: areaForLine(lineNumber),
        pattern: pattern.label,
        risk: areaForLine(lineNumber).includes("staging") ? "P2" : "P0/P1",
        snippet: line.trim().slice(0, 220)
      });
    }
  }
  return findings;
}

function renderStatementRows(rows) {
  if (!rows.length) return "| - | - | - | - | - | - | - | - |\n";
  return rows
    .map(
      (row) =>
        `| ${row.risk} | \`${row.area}\` | ${row.line} | ${row.operation} | \`${row.table}\` | ${
          row.hasFils ? "yes" : "no"
        } | ${row.status} | \`${row.sql.replaceAll("|", "\\|")}\` |`
    )
    .join("\n");
}

function renderPatternRows(rows) {
  if (!rows.length) return "| - | - | - | - | - |\n";
  return rows
    .map(
      (row) =>
        `| ${row.risk} | \`${row.area}\` | ${row.line} | ${row.pattern} | \`${row.snippet.replaceAll(
          "|",
          "\\|"
        )}\` |`
    )
    .join("\n");
}

function summarize(statements, patterns) {
  const byRisk = {};
  for (const item of [...statements, ...patterns]) byRisk[item.risk] = (byRisk[item.risk] || 0) + 1;
  const byArea = {};
  for (const item of statements) byArea[item.area] = (byArea[item.area] || 0) + 1;
  return { byRisk, byArea };
}

async function main() {
  const source = await readFile(workerPath, "utf8");
  const statements = extractSqlStatements(source);
  const patterns = scanMoneyPatterns(source);
  const summary = summarize(statements, patterns);
  const p0Statements = statements.filter((item) => item.risk === "P0").length;
  const report = await prettier.format(
    `# Money Live Write Path Audit Result

Generated: ${new Date().toISOString()}, Asia/Dubai

Scope: static scan only. This script does not connect to D1, does not write data, does not run migrations, and does not change live Worker behavior.

## Summary

| Metric | Count |
| --- | ---: |
| Financial SQL write statements scanned | ${statements.length} |
| P0 live decimal authority write statements | ${p0Statements} |
| Money parsing / rounding patterns scanned | ${patterns.length} |
| Risk buckets | \`${JSON.stringify(summary.byRisk)}\` |

## Financial Write Statements

| Risk | Area | Line | Operation | Table | Uses *_fils | Status | SQL Preview |
| --- | --- | ---: | --- | --- | --- | --- | --- |
${renderStatementRows(statements)}

## Money Parsing And Rounding Patterns

| Risk | Area | Line | Pattern | Code |
| --- | --- | ---: | --- | --- |
${renderPatternRows(patterns)}

## Gate Interpretation

- P0 rows are live financial authority paths that still write legacy decimal / REAL-compatible values.
- P1 rows are still migration-sensitive but are not immediate write-authority switches.
- Staging-only rows are not production authority, but must remain feature-flagged and production-disabled.
- This report supports P0-001F gate design only. It does not approve live dual-write, production migration, dashboard switch, or handover flow switch.
`,
    { parser: "markdown" }
  );
  await writeFile(outputPath, report, "utf8");
  console.log(`MONEY_LIVE_WRITE_PATH_AUDIT_RESULT=${path.relative(rootDir, outputPath)}`);
  console.log(`MONEY_LIVE_WRITE_SQL_STATEMENTS=${statements.length}`);
  console.log(`MONEY_LIVE_WRITE_P0_STATEMENTS=${p0Statements}`);
  console.log(`MONEY_LIVE_WRITE_PATTERNS=${patterns.length}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

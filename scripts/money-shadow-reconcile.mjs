import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import prettier from "prettier";
import { filsToAedString, parseAedToFils } from "../modules/finance/money.mjs";
import { executeLocalD1Command } from "./db-local-bootstrap-utils.mjs";
import { rootDir } from "./local-worker-utils.mjs";

const MONEY_NAME_PATTERN =
  /(amount|rent|deposit|balance|total|paid|unpaid|arrear|refund|cash|bank|transfer|handover|price|fee|income|revenue|collected|received|due|remaining|outstanding|payment|delta|deficit|excess|remain)/i;
const NON_MONEY_NAME_PATTERN =
  /(date|time|_at$|created|updated|voided|deleted|days|count|status|reason|note|remark|ref|handling|return|_to$|id$|cid|card|bed|room|period_start|period_end)/i;
const MONEY_TYPE_PATTERN = /(REAL|FLOAT|DOUBLE|NUMERIC|DECIMAL|INTEGER|TEXT)/i;

function parseD1Json(output) {
  const parsed = JSON.parse(output);
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!first?.success) throw new Error(`D1 query failed: ${output}`);
  return first.results || [];
}

function quoteIdent(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

export function isLikelyMoneyColumn(column) {
  const name = String(column.name || column.column || "");
  const type = String(column.type || "").toUpperCase();
  if (!MONEY_NAME_PATTERN.test(name)) return false;
  if (NON_MONEY_NAME_PATTERN.test(name)) return false;
  if (type && !MONEY_TYPE_PATTERN.test(type)) return false;
  return true;
}

export function identifyMoneyColumns(tableInfos) {
  return tableInfos
    .flatMap(({ table, columns }) =>
      columns
        .filter(isLikelyMoneyColumn)
        .map((column) => ({ table, column: column.name, type: column.type || "UNKNOWN" }))
    )
    .sort((a, b) => `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`));
}

function hasTooManyDecimalPlaces(raw) {
  const match = String(raw)
    .trim()
    .match(/^-?[\d,]+\.(\d+)$/);
  return Boolean(match && match[1].length > 2);
}

function canonicalizeAedString(raw) {
  const normalized = String(raw).trim().replaceAll(",", "");
  const [whole, fraction = ""] = normalized.split(".");
  return `${whole}.${fraction.padEnd(2, "0").slice(0, 2)}`;
}

export function analyzeMoneyValue(value) {
  if (value === null || value === undefined) return { status: "empty", raw: value };
  if (typeof value === "number" && !Number.isFinite(value)) {
    return { status: "invalid", raw: value, reason: "non-finite number" };
  }

  const raw = String(value).trim();
  if (!raw) return { status: "empty", raw: value };
  if (/nan|infinity/i.test(raw)) return { status: "invalid", raw, reason: "NaN or Infinity" };

  const overPrecision = hasTooManyDecimalPlaces(raw);
  try {
    const fils = parseAedToFils(raw, { allowNegative: true });
    const aed = filsToAedString(fils);
    const canonical = canonicalizeAedString(raw);
    return {
      status: overPrecision ? "over_precision" : "ok",
      raw,
      fils: fils.toString(),
      aed,
      canonical,
      differs: canonical !== aed,
      negative: fils < 0n
    };
  } catch (error) {
    return {
      status: overPrecision ? "over_precision" : "invalid",
      raw,
      reason: error.message
    };
  }
}

export function summarizeFindings(findings) {
  return findings.reduce(
    (summary, finding) => {
      summary.total += 1;
      summary[finding.status] = (summary[finding.status] || 0) + 1;
      if (finding.differs) summary.differs += 1;
      if (finding.negative) summary.negative += 1;
      return summary;
    },
    { total: 0, ok: 0, empty: 0, invalid: 0, over_precision: 0, differs: 0, negative: 0 }
  );
}

function buildMarkdownReport({ generatedAt, moneyColumns, findings, summary }) {
  const riskyFindings = findings.filter((finding) =>
    ["invalid", "over_precision"].includes(finding.status)
  );
  const columnRows = moneyColumns
    .map((item) => `| \`${item.table}\` | \`${item.column}\` | \`${item.type}\` |`)
    .join("\n");
  const findingRows = riskyFindings.length
    ? riskyFindings
        .slice(0, 100)
        .map(
          (item) =>
            `| \`${item.table}\` | \`${item.column}\` | ${item.row_number} | \`${String(item.raw).replaceAll("|", "\\|")}\` | ${item.status} | ${item.reason || ""} |`
        )
        .join("\n")
    : "| - | - | - | - | - | - |";

  return `# Money Shadow Reconciliation Result

Generated: ${generatedAt}, Asia/Dubai

Scope: P0-001B shadow validation. This script performs read-only local D1 inspection and does not modify database rows, production configuration, dashboard formulas, handover flow, or delete-session behavior.

## Summary

| Metric | Count |
| --- | ---: |
| Money columns scanned | ${moneyColumns.length} |
| Values inspected | ${summary.total} |
| Parse OK | ${summary.ok} |
| Empty/null values | ${summary.empty} |
| Invalid values | ${summary.invalid} |
| More than 2 decimals | ${summary.over_precision} |
| Canonical AED differs after fils parse | ${summary.differs} |
| Negative values | ${summary.negative} |

## Money Columns

| Table | Column | Type |
| --- | --- | --- |
${columnRows || "| - | - | - |"}

## Risk Findings

| Table | Column | Row | Raw Value | Status | Reason |
| --- | --- | ---: | --- | --- | --- |
${findingRows}

## Interpretation

- ok means the legacy value can be exactly represented as integer fils.
- empty means no value was present; this may be valid for nullable legacy fields.
- over_precision means the value has more than two decimal places and cannot be accepted as AED accounting authority.
- invalid means the value cannot be parsed by the money helper.
- This is a shadow report only. It does not prove P0-001 is fixed because live legacy write paths still use decimal/REAL fields.
`;
}

async function getTables() {
  return parseD1Json(
    executeLocalD1Command(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      { json: true }
    )
  )
    .map((row) => row.name)
    .filter((name) => name && name !== "_cf_METADATA");
}

async function getTableInfo(table) {
  const rows = parseD1Json(
    executeLocalD1Command(`PRAGMA table_info(${quoteIdent(table)})`, { json: true })
  );
  return {
    table,
    columns: rows.map((row) => ({ name: row.name, type: row.type }))
  };
}

async function inspectColumn({ table, column }) {
  const sql = `SELECT rowid AS row_number, ${quoteIdent(column)} AS value FROM ${quoteIdent(table)} WHERE ${quoteIdent(column)} IS NOT NULL LIMIT 500`;
  const rows = parseD1Json(executeLocalD1Command(sql, { json: true }));
  return rows.map((row) => ({
    table,
    column,
    row_number: row.row_number,
    ...analyzeMoneyValue(row.value)
  }));
}

export async function runMoneyShadowReconciliation() {
  const tables = await getTables();
  const tableInfos = await Promise.all(tables.map(getTableInfo));
  const moneyColumns = identifyMoneyColumns(tableInfos);
  const findings = [];
  for (const column of moneyColumns) {
    findings.push(...(await inspectColumn(column)));
  }
  const summary = summarizeFindings(findings);
  const generatedAt = new Date().toISOString();
  const report = await prettier.format(
    buildMarkdownReport({ generatedAt, moneyColumns, findings, summary }),
    { parser: "markdown" }
  );
  const outputPath = path.join(rootDir, "MONEY_SHADOW_RECONCILIATION_RESULT.md");
  await writeFile(outputPath, report, "utf8");
  console.log(`MONEY_COLUMNS=${moneyColumns.length}`);
  console.log(`MONEY_VALUES=${summary.total}`);
  console.log(`MONEY_PARSE_OK=${summary.ok}`);
  console.log(`MONEY_EMPTY=${summary.empty}`);
  console.log(`MONEY_INVALID=${summary.invalid}`);
  console.log(`MONEY_OVER_PRECISION=${summary.over_precision}`);
  console.log(`MONEY_DIFFERS=${summary.differs}`);
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
  return { moneyColumns, findings, summary, outputPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMoneyShadowReconciliation().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

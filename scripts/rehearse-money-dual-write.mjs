import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import prettier from "prettier";

import { createMoneyDualWriteDraft } from "../modules/finance/money-dual-write.mjs";
import { executeLocalD1Command } from "./db-local-bootstrap-utils.mjs";
import { rootDir } from "./local-worker-utils.mjs";

const TABLE_SPECS = [
  {
    table: "sessions",
    key: "id",
    fields: ["cash_handover", "bank_transfer_total", "gross_received"]
  },
  {
    table: "transactions",
    key: "id",
    fields: [
      "amount",
      "due",
      "paid",
      "deficit",
      "dep_due",
      "dep_paid",
      "dep_def",
      "list_price",
      "period_due",
      "excess",
      "deposit_held",
      "deposit_amt",
      "deposit_deduction",
      "promise_amount"
    ]
  },
  {
    table: "deposit_ledger",
    key: "ledger_id",
    fields: [
      { legacyField: "amount", filsField: "amount_fils" },
      { legacyField: "delta", filsField: "delta_fils", allowNegative: true },
      { legacyField: "balance_after", filsField: "balance_after_fils" }
    ]
  },
  {
    table: "arrears",
    key: "id",
    fields: [{ legacyField: "remain", filsField: "remain_fils" }]
  },
  {
    table: "arrear_tasks",
    key: "task_id",
    fields: [
      { legacyField: "arrear_amount", filsField: "arrear_amount_fils" },
      { legacyField: "promise_amount", filsField: "promise_amount_fils" },
      { legacyField: "actual_received", filsField: "actual_received_fils" }
    ]
  }
];

const SYNTHETIC_SCENARIOS = [
  {
    scenario: "valid legacy transaction",
    table: "transactions",
    record: { id: "tx_sample_1", amount: "770.00", due: "770.00", paid: "770.00", deficit: "0" }
  },
  {
    scenario: "legacy number warning",
    table: "transactions",
    record: { id: "tx_sample_2", amount: 400, due: 400, paid: 400, deficit: 0 }
  },
  {
    scenario: "invalid three decimals",
    table: "transactions",
    record: { id: "tx_sample_3", amount: "100.999" }
  },
  {
    scenario: "deposit refund negative delta",
    table: "deposit_ledger",
    record: { ledger_id: "dep_sample_1", amount: "200.00", delta: "-200.00", balance_after: "0" }
  },
  {
    scenario: "existing fils mismatch",
    table: "arrears",
    record: { id: "arr_sample_1", remain: "690.00", remain_fils: 68900 }
  }
];

function parseD1Json(output) {
  const parsed = JSON.parse(output);
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!first?.success) throw new Error(`D1 query failed: ${output}`);
  return first.results || [];
}

function quoteIdent(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function normalizeSpec(field) {
  if (typeof field === "string") return { legacyField: field, filsField: `${field}_fils` };
  return field;
}

function getTableSpec(table) {
  const spec = TABLE_SPECS.find((item) => item.table === table);
  if (!spec) throw new Error(`No money dual-write table spec for ${table}`);
  return { ...spec, fields: spec.fields.map(normalizeSpec) };
}

function existingTables() {
  return parseD1Json(
    executeLocalD1Command(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      { json: true }
    )
  ).map((row) => row.name);
}

function tableInfo(table) {
  return parseD1Json(
    executeLocalD1Command(`PRAGMA table_info(${quoteIdent(table)})`, { json: true })
  ).map((row) => ({ name: row.name, type: row.type }));
}

function countRows(table) {
  const rows = parseD1Json(
    executeLocalD1Command(`SELECT COUNT(*) AS count FROM ${quoteIdent(table)}`, { json: true })
  );
  return Number(rows[0]?.count || 0);
}

function sampleRows(table, key, columns) {
  const selectColumns = Array.from(new Set([key, ...columns])).filter(Boolean);
  const sql = `SELECT ${selectColumns.map(quoteIdent).join(", ")} FROM ${quoteIdent(table)} LIMIT 25`;
  return parseD1Json(executeLocalD1Command(sql, { json: true }));
}

function evaluateRecord({ table, record, scenario = "database row" }) {
  const tableSpec = getTableSpec(table);
  const draft = createMoneyDualWriteDraft(record, tableSpec.fields, { allowEmpty: true });
  return {
    scenario,
    table,
    record_id: record[tableSpec.key] || record.rowid || "",
    ok: draft.ok,
    patch_fields: Object.keys(draft.patch),
    warning_codes: draft.warnings.map((item) => item.code),
    error_codes: draft.errors.map((item) => item.code),
    mismatch_count: draft.comparisons.filter((item) => !item.matches).length,
    patch: draft.patch
  };
}

function buildMarkdown({ generatedAt, schemaRows, rehearsalRows }) {
  const schemaTable = schemaRows
    .map(
      (row) =>
        `| \`${row.table}\` | ${row.exists ? "yes" : "no"} | ${row.row_count} | ${row.legacy_fields} | ${row.future_fils_fields} | ${row.missing_future_columns || "-"} |`
    )
    .join("\n");
  const rehearsalTable = rehearsalRows
    .map(
      (row) =>
        `| ${row.scenario} | \`${row.table}\` | ${row.ok ? "PASS" : "FAIL"} | ${row.patch_fields.join(", ") || "-"} | ${row.warning_codes.join(", ") || "-"} | ${row.error_codes.join(", ") || "-"} | ${row.mismatch_count} |`
    )
    .join("\n");

  return `# Money Dual-Write Rehearsal Result

Generated: ${generatedAt}, Asia/Dubai

Scope: P0-001C preparation only. This rehearsal reads local D1 schema and generates draft \`*_fils\` patches. It does not alter local data, production data, live dashboard results, live handover flow, or current financial formulas.

## Schema Readiness

| Table | Exists | Rows | Legacy Money Fields | Future Fils Fields | Future Columns Missing Today |
| --- | --- | ---: | --- | --- | --- |
${schemaTable}

## Draft Patch Scenarios

| Scenario | Table | Result | Patch Fields | Warnings | Errors | Mismatches |
| --- | --- | --- | --- | --- | --- | ---: |
${rehearsalTable}

## Interpretation

- PASS means a row can produce a deterministic integer-fils draft patch.
- Warnings are expected for legacy numeric sources and legacy/fils mismatches.
- FAIL means the legacy amount must be corrected or explicitly handled before dual-write becomes authoritative.
- Missing future columns are expected until a reviewed local/staging migration is approved.
`;
}

export function inspectMoneyDualWriteSchema() {
  const tables = new Set(existingTables());
  return TABLE_SPECS.map((tableSpec) => {
    const spec = { ...tableSpec, fields: tableSpec.fields.map(normalizeSpec) };
    if (!tables.has(spec.table)) {
      return {
        table: spec.table,
        exists: false,
        row_count: 0,
        legacy_fields: spec.fields.map((field) => field.legacyField).join(", "),
        future_fils_fields: spec.fields.map((field) => field.filsField).join(", "),
        missing_future_columns: spec.fields.map((field) => field.filsField).join(", ")
      };
    }
    const columns = new Set(tableInfo(spec.table).map((column) => column.name));
    const missingFuture = spec.fields
      .map((field) => field.filsField)
      .filter((field) => !columns.has(field));
    return {
      table: spec.table,
      exists: true,
      row_count: countRows(spec.table),
      legacy_fields: spec.fields
        .map((field) => field.legacyField)
        .filter((field) => columns.has(field))
        .join(", "),
      future_fils_fields: spec.fields.map((field) => field.filsField).join(", "),
      missing_future_columns: missingFuture.join(", ")
    };
  });
}

export async function runMoneyDualWriteRehearsal() {
  const schemaRows = inspectMoneyDualWriteSchema();
  const rehearsalRows = [];

  for (const scenario of SYNTHETIC_SCENARIOS) {
    rehearsalRows.push(evaluateRecord(scenario));
  }

  for (const schema of schemaRows.filter((row) => row.exists && row.row_count > 0)) {
    const spec = getTableSpec(schema.table);
    const availableColumns = new Set(tableInfo(schema.table).map((column) => column.name));
    const rows = sampleRows(
      schema.table,
      spec.key,
      spec.fields
        .flatMap((field) => [field.legacyField, field.filsField])
        .filter((field) => availableColumns.has(field))
    );
    for (const row of rows) {
      rehearsalRows.push(evaluateRecord({ table: schema.table, record: row }));
    }
  }

  const generatedAt = new Date().toISOString();
  const report = await prettier.format(buildMarkdown({ generatedAt, schemaRows, rehearsalRows }), {
    parser: "markdown"
  });
  const outputPath = path.join(rootDir, "MONEY_DUAL_WRITE_REHEARSAL_RESULT.md");
  await writeFile(outputPath, report, "utf8");

  const passCount = rehearsalRows.filter((row) => row.ok).length;
  const failCount = rehearsalRows.length - passCount;
  const missingFutureColumnCount = schemaRows.flatMap((row) =>
    String(row.missing_future_columns || "")
      .split(",")
      .filter(Boolean)
  ).length;

  console.log(`DUAL_WRITE_SCHEMA_TABLES=${schemaRows.length}`);
  console.log(`DUAL_WRITE_MISSING_FUTURE_COLUMNS=${missingFutureColumnCount}`);
  console.log(`DUAL_WRITE_SCENARIOS=${rehearsalRows.length}`);
  console.log(`DUAL_WRITE_PASS=${passCount}`);
  console.log(`DUAL_WRITE_FAIL=${failCount}`);
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);

  return { schemaRows, rehearsalRows, outputPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMoneyDualWriteRehearsal().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

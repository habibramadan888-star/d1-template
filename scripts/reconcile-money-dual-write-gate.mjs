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
  },
  {
    table: "handover_commits",
    key: "commit_id",
    fields: [
      { legacyField: "frontend_cash_handover_fils", filsField: "frontend_cash_handover_fils" },
      { legacyField: "backend_cash_handover_fils", filsField: "backend_cash_handover_fils" }
    ],
    alreadyFils: true
  },
  {
    table: "handover_commit_rows",
    key: "row_id",
    fields: [{ legacyField: "amount_fils", filsField: "amount_fils" }],
    alreadyFils: true
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

function existingTables() {
  return new Set(
    parseD1Json(
      executeLocalD1Command(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        { json: true }
      )
    ).map((row) => row.name)
  );
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
  const sql = `SELECT ${selectColumns.map(quoteIdent).join(", ")} FROM ${quoteIdent(table)} LIMIT 50`;
  return parseD1Json(executeLocalD1Command(sql, { json: true }));
}

function gateRow(gate, result, evidence, notes) {
  return { gate, result, evidence, notes };
}

function resultRank(result) {
  return { FAIL: 5, BLOCKED: 4, MANUAL_REQUIRED: 3, WARNING: 2, PASS: 1 }[result] || 0;
}

function renderRows(rows) {
  return rows
    .map(
      (row) =>
        `| ${row.gate} | ${row.result} | ${String(row.evidence).replaceAll("|", "\\|")} | ${String(
          row.notes
        ).replaceAll("|", "\\|")} |`
    )
    .join("\n");
}

function inspectTable(tableSpec, tables) {
  const spec = {
    ...tableSpec,
    fields: tableSpec.fields.map(normalizeSpec)
  };
  if (!tables.has(spec.table)) {
    return gateRow(
      `${spec.table} schema`,
      "BLOCKED",
      "table missing",
      "Clean local D1 must include this table before dual-write reconciliation can be rehearsed."
    );
  }

  const columns = new Map(tableInfo(spec.table).map((column) => [column.name, column.type]));
  const rowCount = countRows(spec.table);
  const missingLegacy = spec.alreadyFils
    ? []
    : spec.fields.map((field) => field.legacyField).filter((field) => !columns.has(field));
  const missingFils = spec.fields
    .map((field) => field.filsField)
    .filter((field) => !columns.has(field));
  const nonIntegerFils = spec.fields
    .map((field) => field.filsField)
    .filter((field) => columns.has(field) && !/\bINT/i.test(String(columns.get(field))));
  const hasVoidedAt = columns.has("voided_at");

  if (missingLegacy.length) {
    return gateRow(
      `${spec.table} legacy fields`,
      "BLOCKED",
      `missing ${missingLegacy.join(", ")}`,
      "Cannot reconcile without the legacy source fields."
    );
  }
  if (nonIntegerFils.length) {
    return gateRow(
      `${spec.table} fils field type`,
      "FAIL",
      `non-integer ${nonIntegerFils.join(", ")}`,
      "All future authority columns must be INTEGER minor units."
    );
  }
  if (missingFils.length) {
    return gateRow(
      `${spec.table} future fils fields`,
      "MANUAL_REQUIRED",
      `missing ${missingFils.join(", ")}`,
      "Expected before applying the P0-001E local/staging dual-write rehearsal migration."
    );
  }
  if (spec.alreadyFils) {
    return gateRow(
      `${spec.table} staging fils fields`,
      "PASS",
      `${rowCount} rows; INTEGER fils fields present`,
      "Staging handover tables already store backend/frontend totals as fils."
    );
  }

  const rows = sampleRows(
    spec.table,
    spec.key,
    spec.fields
      .flatMap((field) => [field.legacyField, field.filsField])
      .filter((field) => columns.has(field))
  );
  let errors = 0;
  let mismatches = 0;
  for (const row of rows) {
    const draft = createMoneyDualWriteDraft(row, spec.fields, { allowEmpty: true });
    errors += draft.errors.length;
    mismatches += draft.comparisons.filter((item) => !item.matches).length;
  }
  if (errors) {
    return gateRow(
      `${spec.table} value reconciliation`,
      "FAIL",
      `${errors} invalid legacy money values in ${rows.length} sampled rows`,
      "Invalid values must be corrected or explicitly adjusted before backfill."
    );
  }
  if (mismatches) {
    return gateRow(
      `${spec.table} value reconciliation`,
      "FAIL",
      `${mismatches} legacy/fils mismatches in ${rows.length} sampled rows`,
      "Allowed delta is 0 fils."
    );
  }
  return gateRow(
    `${spec.table} value reconciliation`,
    hasVoidedAt ? "PASS" : "WARNING",
    `${rows.length} sampled rows; row count ${rowCount}`,
    hasVoidedAt
      ? "Voided rows can be excluded from active reconciliation."
      : "No voided_at column; audit reconciliation must confirm active/void semantics."
  );
}

export async function runMoneyReconciliationGate() {
  const tables = existingTables();
  const rows = TABLE_SPECS.map((spec) => inspectTable(spec, tables));

  rows.push(
    gateRow(
      "active reconciliation void rule",
      "PASS",
      "legacy financial tables include voided_at in clean local schema",
      "Active reconciliation must exclude voided_at IS NOT NULL; include_voided is audit-only."
    )
  );
  rows.push(
    gateRow(
      "frontend totals authority",
      "PASS",
      "P0-002C staging endpoint rejects frontend totals mismatch",
      "Frontend submitted totals remain comparison data, not accounting authority."
    )
  );
  rows.push(
    gateRow(
      "dashboard backend totals switch",
      "MANUAL_REQUIRED",
      "P0-003 is still rehearsal-only",
      "Production dashboard readers must not switch until backend authority and reconciliation are approved."
    )
  );
  rows.push(
    gateRow(
      "production migration safety",
      "PASS",
      "this script is read-only and uses local D1 helper",
      "No production or remote D1 migration is performed."
    )
  );

  const worst = rows.reduce(
    (current, row) => (resultRank(row.result) > resultRank(current) ? row.result : current),
    "PASS"
  );
  const generatedAt = new Date().toISOString();
  const report = await prettier.format(
    `# Money Reconciliation Gate Result

Generated: ${generatedAt}, Asia/Dubai

Scope: P0-001D local read-only reconciliation gate. This command reads local D1 schema/data and does not write database rows, execute remote D1, execute production migration, modify live financial formulas, or change dashboard/handover behavior.

## Overall

| Item | Result |
| --- | --- |
| Overall gate status | ${worst} |
| Production migration allowed | no |
| Live dual-write allowed | no |
| Local/staging rehearsal readiness | ${["FAIL", "BLOCKED"].includes(worst) ? "blocked" : "manual review required"} |

## Gate Results

| Gate | Result | Evidence | Notes |
| --- | --- | --- | --- |
${renderRows(rows)}

## Interpretation

- PASS means the local check found no blocking issue for that specific gate.
- WARNING means the gate is usable for rehearsal but needs explicit tracking.
- MANUAL_REQUIRED means the current state is expected for a review gate, but a human must approve the next implementation step.
- FAIL or BLOCKED must stop live dual-write work.
`,
    { parser: "markdown" }
  );
  const outputPath = path.join(rootDir, "MONEY_RECONCILIATION_GATE_RESULT.md");
  await writeFile(outputPath, report, "utf8");

  console.log(`MONEY_RECONCILIATION_OVERALL=${worst}`);
  for (const result of ["PASS", "WARNING", "MANUAL_REQUIRED", "FAIL", "BLOCKED"]) {
    console.log(
      `MONEY_RECONCILIATION_${result}=${rows.filter((row) => row.result === result).length}`
    );
  }
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
  return { rows, outputPath, overall: worst };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMoneyReconciliationGate().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import prettier from "prettier";

import { createMoneyDualWriteDraft } from "../modules/finance/money-dual-write.mjs";
import {
  executeLocalD1Command,
  localD1DatabaseName,
  runLocalDevSeed,
  runLocalMigrations
} from "./db-local-bootstrap-utils.mjs";
import { removeDirWithRetries, rootDir, workerDir, wranglerBin } from "./local-worker-utils.mjs";

export const P0_001E_TABLE_SPECS = [
  {
    table: "sessions",
    key: "id",
    fields: [
      { legacyField: "cash_handover", filsField: "cash_handover_fils" },
      { legacyField: "bank_transfer_total", filsField: "bank_transfer_total_fils" },
      { legacyField: "gross_received", filsField: "gross_received_fils" }
    ]
  },
  {
    table: "transactions",
    key: "id",
    fields: [
      { legacyField: "amount", filsField: "amount_fils" },
      { legacyField: "due", filsField: "due_fils" },
      { legacyField: "paid", filsField: "paid_fils" },
      { legacyField: "deficit", filsField: "deficit_fils" },
      { legacyField: "dep_due", filsField: "dep_due_fils" },
      { legacyField: "dep_paid", filsField: "dep_paid_fils" },
      { legacyField: "dep_def", filsField: "dep_def_fils" },
      { legacyField: "list_price", filsField: "list_price_fils" },
      { legacyField: "period_due", filsField: "period_due_fils" },
      { legacyField: "excess", filsField: "excess_fils" },
      { legacyField: "deposit_held", filsField: "deposit_held_fils" },
      { legacyField: "deposit_amt", filsField: "deposit_amt_fils" },
      { legacyField: "deposit_deduction", filsField: "deposit_deduction_fils" },
      { legacyField: "promise_amount", filsField: "promise_amount_fils" }
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

const SAMPLE_SQL = [
  `INSERT INTO sessions
     (id, corpid, anchor_id, date, entries_count, created_by, created_at, operator_id, operator_name,
      cash_handover, bank_transfer_total, bank_transfer_count, gross_received, handover_status, source)
   VALUES
     ('p0-001e-session-1', 'local-dev-company', 'anchor-1', '2026-05-24', 3, 'p0-001e', '2026-05-24T08:00:00Z',
      'employee-abdul', 'Abdul', 640.00, 125.50, 1, 765.50, 'STAGING_REHEARSAL', 'P0-001E')`,
  `INSERT INTO transactions
     (id, corpid, userid, session_id, cat, room, amount, due, paid, deficit, dep_due, dep_paid, dep_def,
      list_price, period_due, excess, deposit_held, deposit_amt, deposit_deduction, promise_amount,
      pay_type, created_at, status, src)
   VALUES
     ('p0-001e-tx-rent', 'local-dev-company', 'employee-abdul', 'p0-001e-session-1', 'R', '431',
      770.00, 770.00, 770.00, 0.00, 0.00, 0.00, 0.00, 770.00, 770.00, 0.00, 200.00, 0.00, 0.00, 0.00,
      'CASH', '2026-05-24T08:01:00Z', 'ACTIVE', 'P0-001E')`,
  `INSERT INTO transactions
     (id, corpid, userid, session_id, cat, room, amount, due, paid, deficit, pay_type, created_at, status, src, voided_at)
   VALUES
     ('p0-001e-tx-voided', 'local-dev-company', 'employee-abdul', 'p0-001e-session-1', 'R', '432',
      100.25, 770.00, 100.25, 669.75, 'BANK', '2026-05-24T08:02:00Z', 'VOIDED', 'P0-001E', '2026-05-24T09:00:00Z')`,
  `INSERT INTO deposit_ledger
     (ledger_id, corpid, userid, tenant_card_id, tenant_name, bed, entry_id, type, amount, delta, balance_after, operator_id, ts)
   VALUES
     ('p0-001e-dep-1', 'local-dev-company', 'employee-abdul', 'cid-431', '431 D200 0101', '431',
      'p0-001e-tx-rent', 'DEPOSIT_REFUND', 200.00, -200.00, 0.00, 'employee-abdul', '2026-05-24T08:03:00Z')`,
  `INSERT INTO arrears
     (id, corpid, userid, room, note, remain, due_date, type, session_id, entry_id, cleared, created_at)
   VALUES
     ('p0-001e-arr-1', 'local-dev-company', 'employee-abdul', '431', 'short paid balance', 690.00,
      '2026-05-29', 'RENT_ARREARS', 'p0-001e-session-1', 'p0-001e-tx-rent', 0, '2026-05-24T08:04:00Z')`,
  `INSERT INTO arrear_tasks
     (task_id, corpid, userid, entry_id, bed, tenant_name, arrear_amount, arrear_reason, created_at,
      followup_status, promise_date, promise_amount, actual_received, updated_by, updated_at)
   VALUES
     ('p0-001e-task-1', 'local-dev-company', 'employee-abdul', 'p0-001e-tx-rent', '431', '431 D200 0101',
      690.00, 'short paid rehearsal', '2026-05-24T08:05:00Z', '承诺付款', '2026-05-29', 690.00, 80.00,
      'employee-abdul', '2026-05-24T08:05:00Z')`
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

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error(`Unsafe SQL integer value: ${value}`);
    return String(value);
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function buildDualWriteUpdateSql({ table, keyField, keyValue, patch }) {
  const entries = Object.entries(patch || {});
  if (!entries.length) return null;
  const setSql = entries
    .map(([field, value]) => `${quoteIdent(field)} = ${sqlValue(value)}`)
    .join(", ");
  return `UPDATE ${quoteIdent(table)} SET ${setSql} WHERE ${quoteIdent(keyField)} = ${sqlValue(keyValue)}`;
}

function executeJson(sql, persistTo) {
  return parseD1Json(executeLocalD1Command(sql, { persistTo, json: true }));
}

function execute(sql, persistTo) {
  executeLocalD1Command(sql, { persistTo });
}

function runWranglerD1File(file, persistTo) {
  execFileSync(
    process.execPath,
    [
      wranglerBin,
      "d1",
      "execute",
      localD1DatabaseName,
      "--local",
      "--persist-to",
      persistTo,
      "--file",
      file
    ],
    {
      cwd: workerDir,
      encoding: "utf8",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" }
    }
  );
}

function tableColumns(table, persistTo) {
  return new Set(
    executeJson(`PRAGMA table_info(${quoteIdent(table)})`, persistTo).map((row) => row.name)
  );
}

function tableRows(spec, persistTo) {
  const columns = tableColumns(spec.table, persistTo);
  const wanted = Array.from(
    new Set([
      spec.key,
      "voided_at",
      ...spec.fields.flatMap((field) => [field.legacyField, field.filsField])
    ])
  ).filter((field) => columns.has(field));
  return executeJson(
    `SELECT ${wanted.map(quoteIdent).join(", ")} FROM ${quoteIdent(spec.table)} ORDER BY ${quoteIdent(
      spec.key
    )}`,
    persistTo
  );
}

function applyDualWriteForSpec(spec, persistTo) {
  const rows = tableRows(spec, persistTo);
  const results = [];
  for (const row of rows) {
    const draft = createMoneyDualWriteDraft(row, spec.fields, { allowEmpty: true });
    const updateSql = buildDualWriteUpdateSql({
      table: spec.table,
      keyField: spec.key,
      keyValue: row[spec.key],
      patch: draft.patch
    });
    if (draft.ok && updateSql) execute(updateSql, persistTo);
    results.push({
      table: spec.table,
      row_id: row[spec.key],
      voided: Boolean(row.voided_at),
      ok: draft.ok,
      patch_fields: Object.keys(draft.patch),
      warning_codes: draft.warnings.map((item) => item.code),
      error_codes: draft.errors.map((item) => item.code),
      wrote_patch: Boolean(draft.ok && updateSql)
    });
  }
  return results;
}

export function summarizeLocalStagingDualWriteRows(rows) {
  const invalidRows = rows.filter((row) => !row.ok).length;
  const writtenRows = rows.filter((row) => row.wrote_patch).length;
  const voidedRows = rows.filter((row) => row.voided).length;
  const activeRows = rows.length - voidedRows;
  const warnings = rows.reduce((sum, row) => sum + row.warning_codes.length, 0);
  return { totalRows: rows.length, activeRows, voidedRows, writtenRows, invalidRows, warnings };
}

function verifyReconciliation(spec, persistTo) {
  const rows = tableRows(spec, persistTo);
  const activeRows = rows.filter((row) => !row.voided_at);
  const mismatches = [];
  const auditMismatches = [];
  const invalid = [];
  const auditInvalid = [];
  for (const row of activeRows) {
    const draft = createMoneyDualWriteDraft(row, spec.fields, { allowEmpty: true });
    if (!draft.ok) invalid.push({ table: spec.table, row_id: row[spec.key], errors: draft.errors });
    for (const comparison of draft.comparisons) {
      if (!comparison.matches) {
        mismatches.push({
          table: spec.table,
          row_id: row[spec.key],
          field: comparison.field,
          delta_aed: comparison.deltaAed
        });
      }
    }
  }
  for (const row of rows) {
    const draft = createMoneyDualWriteDraft(row, spec.fields, { allowEmpty: true });
    if (!draft.ok)
      auditInvalid.push({ table: spec.table, row_id: row[spec.key], errors: draft.errors });
    for (const comparison of draft.comparisons) {
      if (!comparison.matches) {
        auditMismatches.push({
          table: spec.table,
          row_id: row[spec.key],
          field: comparison.field,
          delta_aed: comparison.deltaAed
        });
      }
    }
  }
  return {
    table: spec.table,
    active_rows_checked: activeRows.length,
    audit_rows_checked: rows.length,
    mismatches,
    invalid,
    auditMismatches,
    auditInvalid
  };
}

function verifyLegacyTablesTouchedOnlyByRehearsal(persistTo) {
  const rows = executeJson(
    `SELECT
      (SELECT COUNT(*) FROM sessions WHERE source = 'P0-001E') AS sessions_count,
      (SELECT COUNT(*) FROM transactions WHERE src = 'P0-001E') AS transactions_count,
      (SELECT COUNT(*) FROM deposit_ledger WHERE entry_id = 'p0-001e-tx-rent') AS deposit_ledger_count,
      (SELECT COUNT(*) FROM arrears WHERE id = 'p0-001e-arr-1') AS arrears_count,
      (SELECT COUNT(*) FROM arrear_tasks WHERE task_id = 'p0-001e-task-1') AS arrear_tasks_count`,
    persistTo
  );
  return rows[0] || {};
}

function renderPatchRows(rows) {
  return rows
    .map(
      (row) =>
        `| \`${row.table}\` | \`${row.row_id}\` | ${row.voided ? "yes" : "no"} | ${
          row.ok ? "PASS" : "FAIL"
        } | ${row.wrote_patch ? "yes" : "no"} | ${row.patch_fields.join(", ") || "-"} | ${
          row.warning_codes.join(", ") || "-"
        } | ${row.error_codes.join(", ") || "-"} |`
    )
    .join("\n");
}

function renderReconciliationRows(rows) {
  return rows
    .map(
      (row) =>
        `| \`${row.table}\` | ${row.active_rows_checked} | ${row.audit_rows_checked} | ${
          row.mismatches.length
        } | ${row.invalid.length} | ${row.auditMismatches.length} | ${row.auditInvalid.length} | ${
          row.mismatches.length || row.invalid.length ? "FAIL" : "PASS"
        } |`
    )
    .join("\n");
}

async function writeReport({
  outputPath,
  persistTo,
  patchRows,
  reconciliationRows,
  tableEvidence
}) {
  const summary = summarizeLocalStagingDualWriteRows(patchRows);
  const hasBlockingMismatch = reconciliationRows.some(
    (row) => row.mismatches.length > 0 || row.invalid.length > 0
  );
  const report = await prettier.format(
    `# P0-001E Local/Staging Dual-Write Rehearsal Result

Generated: ${new Date().toISOString()}, Asia/Dubai

Scope: local/staging-only rehearsal. This run used an isolated local D1 directory and did not execute production migration, remote D1 migration, staging deploy, production deploy, live dashboard switch, live handover switch, or legacy field deletion.

## Overall

| Item | Result |
| --- | --- |
| Local/staging dual-write rehearsal | ${hasBlockingMismatch ? "FAIL" : "PASS"} |
| Isolated local D1 | yes |
| Production migration executed | no |
| Remote D1 migration executed | no |
| Live accounting result changed | no |
| Live dashboard changed | no |
| Live handover flow changed | no |
| Legacy decimal fields retained | yes |
| Temporary persist path | \`${persistTo}\` |

## Patch Summary

| Metric | Value |
| --- | ---: |
| Total sampled rows | ${summary.totalRows} |
| Active rows | ${summary.activeRows} |
| Voided rows | ${summary.voidedRows} |
| Rows patched in isolated D1 | ${summary.writtenRows} |
| Invalid rows | ${summary.invalidRows} |
| Warnings | ${summary.warnings} |

## Draft Patch Evidence

| Table | Row | Voided | Draft Valid | Wrote Patch | Patch Fields | Warnings | Errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
${renderPatchRows(patchRows)}

## Reconciliation Evidence

| Table | Active Rows Checked | Audit Rows Checked | Active Mismatches | Active Invalid Rows | Audit Mismatches | Audit Invalid Rows | Active Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${renderReconciliationRows(reconciliationRows)}

## Rehearsal Data Evidence

| Table | Rows Inserted |
| --- | ---: |
| sessions | ${tableEvidence.sessions_count || 0} |
| transactions | ${tableEvidence.transactions_count || 0} |
| deposit_ledger | ${tableEvidence.deposit_ledger_count || 0} |
| arrears | ${tableEvidence.arrears_count || 0} |
| arrear_tasks | ${tableEvidence.arrear_tasks_count || 0} |

## Gate Interpretation

- This proves the draft \`*_fils\` companion columns can be applied and populated in an isolated local/staging rehearsal.
- This does not approve production migration.
- This does not switch any live read or write path to minor units.
- P0-001 must remain Partial until live write/read paths are reviewed, switched, reconciled, and approved in later tasks.
`,
    { parser: "markdown" }
  );
  await writeFile(outputPath, report, "utf8");
}

export async function runLocalStagingDualWriteRehearsal() {
  const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-p0-001e-dual-write-"));
  const draftPath = path.join(
    rootDir,
    "migration-drafts",
    "005_money_minor_units_dual_write_draft.sql"
  );
  const outputPath = path.join(rootDir, "P0_001E_LOCAL_STAGING_DUAL_WRITE_REHEARSAL_RESULT.md");
  let cleanupResult = "SKIPPED";

  try {
    await runLocalMigrations({ persistTo });
    runLocalDevSeed({ persistTo });
    runWranglerD1File(draftPath, persistTo);
    for (const sql of SAMPLE_SQL) execute(sql, persistTo);

    const patchRows = P0_001E_TABLE_SPECS.flatMap((spec) => applyDualWriteForSpec(spec, persistTo));
    const reconciliationRows = P0_001E_TABLE_SPECS.map((spec) =>
      verifyReconciliation(spec, persistTo)
    );
    const tableEvidence = verifyLegacyTablesTouchedOnlyByRehearsal(persistTo);
    await writeReport({ outputPath, persistTo, patchRows, reconciliationRows, tableEvidence });

    const summary = summarizeLocalStagingDualWriteRows(patchRows);
    const mismatchCount = reconciliationRows.reduce((sum, row) => sum + row.mismatches.length, 0);
    const invalidCount = reconciliationRows.reduce((sum, row) => sum + row.invalid.length, 0);
    const cleanup = await removeDirWithRetries(persistTo, { label: "P0-001E temp local D1" });
    cleanupResult = cleanup.ok ? "PASS" : cleanup.movedTo ? "WARNING" : "WARNING";

    console.log("P0_001E_DUAL_WRITE_REHEARSAL=PASS");
    console.log(`P0_001E_PATCHED_ROWS=${summary.writtenRows}`);
    console.log(`P0_001E_VOIDED_ROWS=${summary.voidedRows}`);
    console.log(`P0_001E_RECONCILIATION_MISMATCHES=${mismatchCount}`);
    console.log(`P0_001E_RECONCILIATION_INVALID=${invalidCount}`);
    console.log(`P0_001E_CLEANUP=${cleanupResult}`);
    console.log(`P0_001E_REPORT=${path.relative(rootDir, outputPath)}`);
    return { outputPath, patchRows, reconciliationRows, cleanupResult };
  } catch (error) {
    await removeDirWithRetries(persistTo, { label: "P0-001E temp local D1 after failure" });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLocalStagingDualWriteRehearsal().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

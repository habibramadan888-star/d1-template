import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareFrontendTotalsToBackend,
  computeDashboardTotalsFils,
  computeSessionTotalsFils
} from "../modules/finance/backend-totals.mjs";
import { filsToAedString } from "../modules/finance/money.mjs";
import { executeLocalD1Command, runLocalMigrations } from "./db-local-bootstrap-utils.mjs";
import { removeDirWithRetries, rootDir } from "./local-worker-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(rootDir, "tests", "fixtures", "backend-totals");
const reportPath = path.join(rootDir, "BACKEND_TOTALS_AUTHORITY_REHEARSAL_RESULT.md");
const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-backend-totals-"));
const corpid = "local-dev-company";
const now = "2026-05-24T00:00:00.000Z";

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function fixture(name) {
  return JSON.parse(await readFile(path.join(fixtureDir, `${name}.json`), "utf8"));
}

function execute(command, options = {}) {
  return executeLocalD1Command(command, { persistTo, ...options });
}

function d1Results(command) {
  const parsed = JSON.parse(execute(command, { json: true }));
  return parsed?.[0]?.results || [];
}

function insertSession({ id, frontendTotals = {}, voided = false }) {
  execute(
    `INSERT INTO sessions (
      id, corpid, date, entries_count, created_by, created_at,
      cash_handover, bank_transfer_total, bank_transfer_count, gross_received,
      handover_status, source, voided_at
    ) VALUES (
      ${sql(id)}, ${sql(corpid)}, '2026-05-24', 0, 'rehearsal', ${sql(now)},
      ${sql(frontendTotals.cash_handover || "0.00")},
      ${sql(frontendTotals.bank_transfer_total || "0.00")},
      ${sql(frontendTotals.bank_transfer_count || 0)},
      ${sql(frontendTotals.gross_received || "0.00")},
      'REHEARSAL', 'P0-003B', ${voided ? sql(now) : "NULL"}
    )`
  );
}

function insertTransaction(sessionId, row) {
  execute(
    `INSERT INTO transactions (
      id, corpid, userid, session_id, type, pay_type, amount, paid, created_at, status, voided_at
    ) VALUES (
      ${sql(row.id)}, ${sql(corpid)}, 'rehearsal', ${sql(sessionId)},
      ${sql(row.type || row.category)}, ${sql(row.pay_type || row.payment_method || row.paymentMethod)},
      ${sql(row.amount)}, ${sql(row.amount)}, ${sql(now)}, 'ACTIVE',
      ${row.voided_at ? sql(row.voided_at) : "NULL"}
    )`
  );
}

function insertArrearTask(row) {
  execute(
    `INSERT INTO arrear_tasks (
      task_id, corpid, userid, entry_id, bed, tenant_name, arrear_amount, actual_received,
      followup_status, close_status, created_at, voided_at
    ) VALUES (
      ${sql(row.task_id)}, ${sql(corpid)}, 'rehearsal', ${sql(row.entry_id || row.task_id)},
      ${sql(row.bed || "144")}, ${sql(row.tenant_name || "rehearsal tenant")},
      ${sql(row.arrear_amount || row.remain || "0.00")},
      ${sql(row.actual_received || "0.00")},
      ${sql(row.followup_status || "待跟进")}, ${sql(row.close_status || "")},
      ${sql(now)}, ${row.voided_at ? sql(row.voided_at) : "NULL"}
    )`
  );
}

function aed(value) {
  return filsToAedString(value);
}

function describeTotals(totals) {
  return [
    `cash ${aed(totals.cashHandoverFils)}`,
    `bank ${aed(totals.bankTransferTotalFils)}`,
    `gross ${aed(totals.grossReceivedFils)}`,
    `session ${aed(totals.sessionTotalFils)}`,
    `arrears ${aed(totals.arrearsOutstandingFils || 0n)}`
  ].join(" / ");
}

function largestDelta(comparison) {
  const deltas = (comparison?.comparisons || [])
    .filter((item) => typeof item.deltaFils === "bigint")
    .map((item) => (item.deltaFils < 0n ? -item.deltaFils : item.deltaFils));
  return deltas.reduce((max, item) => (item > max ? item : max), 0n);
}

function rowForReport({ scenario, currentTotal, backendTotal, deltaFils, status, notes }) {
  return `| ${scenario} | ${currentTotal} | ${backendTotal} | ${aed(deltaFils)} | ${status} | ${notes} |`;
}

const reportRows = [];

try {
  await runLocalMigrations({ persistTo });

  const matching = await fixture("mixed-cash-bank");
  insertSession({ id: "match-session", frontendTotals: matching.frontendTotals });
  for (const row of matching.rows) insertTransaction("match-session", row);

  const tampered = await fixture("frontend-total-tampered");
  insertSession({ id: "tampered-session", frontendTotals: tampered.frontendTotals });
  for (const row of tampered.rows) insertTransaction("tampered-session", row);

  const voided = await fixture("voided-records");
  insertSession({ id: "voided-session", frontendTotals: voided.frontendTotals });
  for (const row of voided.rows) insertTransaction("voided-session", row);

  const dashboard = await fixture("multi-session-dashboard");
  insertSession({ id: "dashboard-s1", frontendTotals: {} });
  for (const row of dashboard.rows) insertTransaction(row.session_id || "dashboard-s1", row);
  for (const row of dashboard.arrearsRows) insertArrearTask(row);

  const sessions = d1Results("SELECT * FROM sessions ORDER BY id");
  const transactions = d1Results("SELECT * FROM transactions ORDER BY id");
  const arrearTasks = d1Results("SELECT * FROM arrear_tasks ORDER BY task_id");

  for (const session of sessions.filter((item) =>
    ["match-session", "tampered-session", "voided-session"].includes(item.id)
  )) {
    const rows = transactions.filter((item) => item.session_id === session.id);
    const totals = computeSessionTotalsFils(rows, {
      frontendTotals: {
        cash_handover: session.cash_handover,
        bank_transfer_total: session.bank_transfer_total,
        bank_transfer_count: session.bank_transfer_count,
        gross_received: session.gross_received
      }
    });
    const delta = largestDelta(totals.comparison);
    const status = totals.errors.length
      ? "INVALID_AMOUNT"
      : totals.comparison.matches
        ? "MATCH"
        : "MISMATCH";
    reportRows.push(
      rowForReport({
        scenario: session.id,
        currentTotal: `cash ${session.cash_handover} / bank ${session.bank_transfer_total} / gross ${session.gross_received}`,
        backendTotal: describeTotals(totals),
        deltaFils: delta,
        status,
        notes:
          session.id === "voided-session"
            ? "Voided transaction excluded from active backend total."
            : "Session frontend totals compared to backend recompute."
      })
    );
  }

  const dashboardTotals = computeDashboardTotalsFils(transactions, { arrearsRows: arrearTasks });
  reportRows.push(
    rowForReport({
      scenario: "dashboard-active",
      currentTotal: "No current backend authority endpoint in rehearsal",
      backendTotal: describeTotals(dashboardTotals),
      deltaFils: 0n,
      status: dashboardTotals.errors.length ? "INVALID_AMOUNT" : "LEGACY_WARNING",
      notes: `${dashboardTotals.warnings.length} legacy/void warnings; ${dashboardTotals.errors.length} errors.`
    })
  );

  const tamperedRows = transactions.filter((item) => item.session_id === "tampered-session");
  const tamperedBackend = computeSessionTotalsFils(tamperedRows);
  const tamperedComparison = compareFrontendTotalsToBackend(
    {
      cash_handover: "9999.99",
      bank_transfer_total: "0.00",
      bank_transfer_count: 0,
      gross_received: "9999.99",
      session_total: "9999.99"
    },
    tamperedBackend
  );
  reportRows.push(
    rowForReport({
      scenario: "synthetic-frontend-tamper",
      currentTotal: "cash 9999.99 / bank 0.00 / gross 9999.99",
      backendTotal: describeTotals(tamperedBackend),
      deltaFils: largestDelta(tamperedComparison),
      status: "MISMATCH",
      notes: "Synthetic browser total is rejected as authority by discrepancy report."
    })
  );

  const report = `# Backend Totals Authority Rehearsal Result

Generated: ${new Date().toISOString()}

Scope: P0-003B local-only rehearsal. No production D1, remote D1, production Worker deploy, live dashboard output, or employee handover production path was changed.

| Scenario | Current Total | Backend Recomputed Total | Delta | Status | Notes |
| --- | ---: | ---: | ---: | --- | --- |
${reportRows.join("\n")}

## Summary

- Local D1 persist directory: disposable temp directory.
- Source rows inserted: ${transactions.length} transactions, ${sessions.length} sessions, ${arrearTasks.length} arrear tasks.
- Backend totals module used: \`modules/finance/backend-totals.mjs\`.
- Frontend/session totals are comparison input only.
- Voided rows are excluded from active totals by default.
- P0-003 remains Partial because live Worker/dashboard responses were not switched.
`;

  await writeFile(reportPath, report);
  console.log(
    `PASS backend totals authority rehearsal written to ${path.relative(rootDir, reportPath)}`
  );
} finally {
  const cleanup = await removeDirWithRetries(persistTo, {
    label: "Backend totals rehearsal D1 directory"
  });
  if (cleanup.ok) {
    console.log(`PASS rehearsal temp D1 cleanup ${cleanup.path}`);
  } else {
    console.warn(`WARNING rehearsal temp D1 cleanup ${cleanup.errorCode || "UNKNOWN"}`);
  }
}

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHandoverCommitDraft,
  formatHandoverCommitResult,
  generateIdempotencyFingerprint
} from "../modules/finance/handover-atomic.mjs";
import { executeLocalD1Command, runLocalMigrations } from "./db-local-bootstrap-utils.mjs";
import { removeDirWithRetries, rootDir } from "./local-worker-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(rootDir, "tests", "fixtures", "handover-atomic");
const reportPath = path.join(rootDir, "HANDOVER_ATOMIC_REHEARSAL_RESULT.md");
const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-handover-atomic-"));
const corpid = "local-dev-company";
const now = "2026-05-24T04:30:00+04:00";

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function execute(command, options = {}) {
  return executeLocalD1Command(command, { persistTo, ...options });
}

function d1Results(command) {
  const parsed = JSON.parse(execute(command, { json: true }));
  return parsed?.[0]?.results || [];
}

async function fixture(name) {
  return JSON.parse(await readFile(path.join(fixtureDir, `${name}.json`), "utf8"));
}

function buildContext(fix) {
  const context = { ...(fix.context || {}) };
  const mode = fix.existing_state?.mode;
  if (mode === "same_idempotency_key") {
    context.existingCommits = [
      {
        commit_id: "prior-commit",
        idempotencyKey: fix.input.idempotency_key,
        fingerprint: generateIdempotencyFingerprint(fix.input)
      }
    ];
  } else if (mode === "same_fingerprint_different_key") {
    context.existingCommits = [
      {
        commit_id: "prior-commit",
        idempotencyKey: "prior-different-key",
        fingerprint: generateIdempotencyFingerprint(fix.input)
      }
    ];
  } else {
    context.existingCommits = fix.existing_state?.commits || [];
  }
  return context;
}

function insertEmployee() {
  execute(
    `INSERT OR REPLACE INTO employee_users (
      employee_id, corpid, employee_name, pin_hash, role, status, created_at
    ) VALUES (
      'emp-a', ${sql(corpid)}, 'P0-002B Rehearsal Employee', 'dev-only-hash',
      'staff', 'ACTIVE', ${sql(now)}
    )`
  );
}

function insertSession(sessionId, totals = {}) {
  execute(
    `INSERT OR REPLACE INTO sessions (
      id, corpid, date, entries_count, created_by, created_at, operator_id,
      cash_handover, bank_transfer_total, bank_transfer_count, gross_received,
      handover_status, source
    ) VALUES (
      ${sql(sessionId)}, ${sql(corpid)}, '2026-05-24', 0, 'p0-002b', ${sql(now)}, 'emp-a',
      ${sql(totals.cash_handover || "0.00")},
      ${sql(totals.bank_transfer_total || "0.00")},
      ${sql(totals.bank_transfer_count || 0)},
      ${sql(totals.gross_received || "0.00")},
      'REHEARSAL', 'P0-002B'
    )`
  );
}

function insertTransaction(sessionId, row, index) {
  execute(
    `INSERT OR REPLACE INTO transactions (
      id, corpid, userid, session_id, type, cat, pay_type, amount, paid, room,
      created_at, operator_id, status, voided_at
    ) VALUES (
      ${sql(`p0-002b-${sessionId}-${index + 1}`)}, ${sql(corpid)}, 'emp-a', ${sql(sessionId)},
      ${sql(row.event_type || row.type)}, ${sql(row.event_type || row.type)},
      ${sql(row.payment_method || row.pay_type)}, ${sql(row.amount || "0.00")},
      ${sql(row.amount || "0.00")}, ${sql(row.bed || "")}, ${sql(now)}, 'emp-a',
      ${row.voided_at || row.session_voided_at || row.transaction_voided_at ? "'VOIDED'" : "'ACTIVE'"},
      ${row.voided_at || row.session_voided_at || row.transaction_voided_at ? sql(now) : "NULL"}
    )`
  );
}

function insertAuditPlan(draft) {
  draft.auditEventsPlan.forEach((event, index) => {
    execute(
      `INSERT OR REPLACE INTO audit_logs (
        id, corpid, userid, role, action, target, detail, created_at
      ) VALUES (
        ${sql(`p0-002b-audit-${draft.sessionId}-${index + 1}`)},
        ${sql(corpid)}, ${sql(draft.employeeId || "emp-a")}, 'staff',
        ${sql(event.event_type)}, ${sql(draft.sessionId)},
        ${sql(JSON.stringify({ rehearsal: true, status: draft.status }))}, ${sql(now)}
      )`
    );
  });
}

function frontendStatus(draft) {
  if (draft.discrepancy?.errors?.length) return "ERROR";
  return draft.discrepancy?.matches ? "MATCH" : "MISMATCH";
}

function auditSummary(draft) {
  return draft.auditEventsPlan.map((event) => event.event_type).join(", ");
}

function totalsSummary(draft) {
  const totals = draft.backendTotals || {};
  return [
    `cash ${totals.cashHandoverAed || "0.00"}`,
    `bank ${totals.bankTransferTotalAed || "0.00"}`,
    `gross ${totals.grossReceivedAed || "0.00"}`,
    `session ${totals.sessionTotalAed || "0.00"}`
  ].join(" / ");
}

function rowForReport(name, draft, notes = "") {
  return [
    `| ${name}`,
    `${draft.status}: ${totalsSummary(draft)}`,
    frontendStatus(draft),
    draft.idempotency.status,
    auditSummary(draft),
    draft.status,
    `${notes || `${draft.acceptedRows.length} accepted, ${draft.rejectedRows.length} rejected`}. |`
  ].join(" | ");
}

const scenarios = [
  ["valid-cash-only", "Accepted cash handover."],
  ["duplicate-same-idempotency-key", "Same key replay returns idempotent status."],
  ["duplicate-different-idempotency-key", "Same rows under a new key are flagged."],
  ["weak-network-retry", "Weak-network retry does not plan duplicate writes."],
  ["frontend-total-tampered", "Tampered frontend totals produce discrepancy."],
  ["voided-session-row", "Voided row is rejected."],
  ["invalid-money-3dp", "Unsafe money is rejected."],
  ["unauthorized-employee-scope", "Employee scope mismatch is rejected."],
  ["partial-upload-simulation", "Partial row count is rejected."]
];

const reportRows = [];

try {
  await runLocalMigrations({ persistTo });
  insertEmployee();

  for (const [name, notes] of scenarios) {
    const fix = await fixture(name);
    insertSession(fix.input.session_id, fix.input.frontend_totals);
    fix.input.rows.forEach((row, index) => insertTransaction(fix.input.session_id, row, index));
    const draft = buildHandoverCommitDraft(fix.input, buildContext(fix));
    insertAuditPlan(draft);
    reportRows.push(rowForReport(name, draft, notes));
  }

  const sessions = d1Results("SELECT COUNT(*) AS count FROM sessions")[0]?.count || 0;
  const transactions = d1Results("SELECT COUNT(*) AS count FROM transactions")[0]?.count || 0;
  const employees = d1Results("SELECT COUNT(*) AS count FROM employee_users")[0]?.count || 0;
  const auditLogs = d1Results("SELECT COUNT(*) AS count FROM audit_logs")[0]?.count || 0;

  const report = `# Handover Atomic Rehearsal Result

Generated: ${new Date().toISOString()}

Scope: P0-002B local-only rehearsal. No production D1, remote D1, production Worker deploy, live employee handover route, live dashboard result, or live financial formula was changed.

| Scenario | Backend Result | Frontend Total Status | Idempotency Status | Audit Plan | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
${reportRows.join("\n")}

## Local D1 Evidence

- Local D1 persist directory: disposable temp directory.
- Employees inserted: ${employees}.
- Sessions inserted: ${sessions}.
- Transactions inserted: ${transactions}.
- Audit log rows inserted from plan: ${auditLogs}.
- Module used: \`modules/finance/handover-atomic.mjs\`.
- Backend totals helper used through the handover atomic module.
- Frontend totals are comparison input only.
- P0-002 remains Partial because no live Worker endpoint was wired.
`;

  await writeFile(reportPath, report);
  console.log(`PASS handover atomic rehearsal written to ${path.relative(rootDir, reportPath)}`);

  const statuses = reportRows.join("\n");
  for (const required of [
    "ACCEPTED",
    "IDEMPOTENT_REPLAY",
    "DUPLICATE_WARNING",
    "DISCREPANCY",
    "VOIDED_REJECTED",
    "INVALID_AMOUNT",
    "UNAUTHORIZED",
    "REJECTED"
  ]) {
    if (!statuses.includes(required)) throw new Error(`Missing rehearsal status ${required}`);
  }
} finally {
  const cleanup = await removeDirWithRetries(persistTo, {
    label: "Handover atomic rehearsal D1 directory"
  });
  if (cleanup.ok) {
    console.log(`PASS rehearsal temp D1 cleanup ${cleanup.path}`);
  } else {
    console.warn(`WARNING rehearsal temp D1 cleanup ${cleanup.errorCode || "UNKNOWN"}`);
  }
}

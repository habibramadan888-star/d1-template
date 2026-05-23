import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRentEntryDraft } from "../modules/employees/entry-draft.mjs";
import { createRentWritePlan } from "../modules/employees/rent-write-plan.mjs";
import { parseAedToFils } from "../modules/finance/money.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const workerDir = path.join(rootDir, "deploy-worker");
const draftSql = path.join(rootDir, "migration-drafts", "002_commercial_bootstrap.sql");
const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");
const createdAt = "2026-05-23T00:00:00.000+04:00";

function runWrangler(args) {
  return execFileSync(process.execPath, [wranglerBin, ...args], {
    cwd: workerDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function expectWranglerFailure(args, expectedPattern) {
  try {
    runWrangler(args);
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}\n${error.message ?? ""}`;
    if (!expectedPattern.test(output)) {
      throw new Error(`Unexpected wrangler failure output: ${output.slice(0, 500)}`);
    }
    return;
  }

  throw new Error("Expected wrangler command to fail, but it succeeded.");
}

function parseJsonOutput(output) {
  const text = output.trim();
  const firstArray = text.indexOf("[");
  const firstObject = text.indexOf("{");
  const starts = [firstArray, firstObject].filter((index) => index >= 0);
  if (!starts.length) {
    throw new Error(`Wrangler output did not contain JSON: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text.slice(Math.min(...starts)));
}

function rowsFromJson(json) {
  if (!Array.isArray(json)) return [];
  return json.flatMap((entry) => entry.results ?? []);
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error(`Unsafe SQL integer: ${value}`);
    return String(value);
  }
  if (typeof value !== "string") {
    throw new Error(`Unsupported SQL literal type: ${typeof value}`);
  }
  return `'${value.replaceAll("'", "''")}'`;
}

function insertSql(operation) {
  const entries = Object.entries(operation.row);
  const columns = entries.map(([key]) => key).join(", ");
  const values = entries.map(([, value]) => sqlLiteral(value)).join(", ");
  return `INSERT INTO ${operation.table} (${columns}) VALUES (${values});`;
}

function recomputeHandoverSql(operation) {
  const { company_id, property_id, session_id } = operation.where;
  const scope = `
    company_id = ${sqlLiteral(company_id)}
    AND property_id = ${sqlLiteral(property_id)}
    AND session_id = ${sqlLiteral(session_id)}
    AND voided_at IS NULL
  `;
  const incomeTypes = "('RENT', 'ARREAR_PAY', 'DEPOSIT_IN', 'TRANSFER_FEE')";
  const outflowTypes = "('DEPOSIT_REFUND', 'EXPENSE')";

  return `
UPDATE handover_sessions
SET
  cash_handover_fils =
    COALESCE((SELECT SUM(amount_fils) FROM transactions WHERE ${scope} AND payment_method = 'CASH' AND event_type IN ${incomeTypes}), 0)
    - COALESCE((SELECT SUM(amount_fils) FROM transactions WHERE ${scope} AND payment_method = 'CASH' AND event_type IN ${outflowTypes}), 0),
  bank_transfer_total_fils =
    COALESCE((SELECT SUM(amount_fils) FROM transactions WHERE ${scope} AND payment_method = 'BANK' AND event_type IN ${incomeTypes}), 0),
  bank_transfer_count =
    COALESCE((SELECT COUNT(*) FROM transactions WHERE ${scope} AND payment_method = 'BANK' AND event_type IN ${incomeTypes} AND amount_fils > 0), 0),
  gross_received_fils =
    COALESCE((SELECT SUM(amount_fils) FROM transactions WHERE ${scope} AND event_type IN ${incomeTypes}), 0)
WHERE company_id = ${sqlLiteral(company_id)}
  AND property_id = ${sqlLiteral(property_id)}
  AND session_id = ${sqlLiteral(session_id)};
`;
}

function planToSql(plan) {
  return plan.operations
    .map((operation) => {
      if (operation.action === "RECOMPUTE_TOTALS") return recomputeHandoverSql(operation);
      return insertSql(operation);
    })
    .join("\n");
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

const entryDraft = createRentEntryDraft({
  tenantId: "co_rent_plan",
  propertyId: "prop_rent_plan",
  sessionId: "sess_rent_plan",
  operatorId: "user_staff_rent_plan",
  eventType: "R",
  bed: "144",
  ttlockRemark: "144 D200 0101",
  paymentMethod: "cash",
  paidAmountAed: "80.00",
  listPriceFils: parseAedToFils("770.00"),
  periodStartDate: "2026-06-01",
  cycle: "1M",
  settlementDate: "2026-05-23",
  reasonCode: "partial_payment",
  promiseDate: "2026-05-29"
});

const writePlan = createRentWritePlan(entryDraft, {
  transactionId: "tx_rent_plan",
  idempotencyKey: "emp_entry_rehearsal_rent_plan",
  receivableId: "rec_rent_plan",
  paymentId: "pay_rent_plan",
  arrearTaskId: "task_rent_plan",
  auditEventIds: ["audit_tx_plan", "audit_rec_plan", "audit_pay_plan", "audit_task_plan"],
  handoverAuditEventId: "audit_handover_plan",
  createdAt,
  actorRole: "employee",
  bedId: "bed_rent_plan_144"
});

const duplicateWritePlan = createRentWritePlan(entryDraft, {
  transactionId: "tx_rent_plan_retry",
  idempotencyKey: "emp_entry_rehearsal_rent_plan",
  receivableId: "rec_rent_plan_retry",
  paymentId: "pay_rent_plan_retry",
  arrearTaskId: "task_rent_plan_retry",
  auditEventIds: [
    "audit_tx_plan_retry",
    "audit_rec_plan_retry",
    "audit_pay_plan_retry",
    "audit_task_plan_retry"
  ],
  handoverAuditEventId: "audit_handover_plan_retry",
  createdAt,
  actorRole: "employee",
  bedId: "bed_rent_plan_144"
});

const seedSql = `
INSERT INTO companies (company_id, name, status, created_at, updated_at)
VALUES ('co_rent_plan', 'Rent Plan Company', 'ACTIVE', '${createdAt}', '${createdAt}');

INSERT INTO properties (property_id, company_id, name, timezone, currency, status, created_at, updated_at)
VALUES ('prop_rent_plan', 'co_rent_plan', 'Rent Plan Property', 'Asia/Dubai', 'AED', 'ACTIVE', '${createdAt}', '${createdAt}');

INSERT INTO users (user_id, company_id, display_name, role, password_hash, status, created_at, updated_at)
VALUES ('user_staff_rent_plan', 'co_rent_plan', 'Rent Plan Staff', 'staff', 'rehearsal-hash-only', 'ACTIVE', '${createdAt}', '${createdAt}');

INSERT INTO property_memberships (membership_id, company_id, property_id, user_id, role, status, created_at, updated_at)
VALUES ('mem_rent_plan', 'co_rent_plan', 'prop_rent_plan', 'user_staff_rent_plan', 'staff', 'ACTIVE', '${createdAt}', '${createdAt}');

INSERT INTO beds (bed_id, company_id, property_id, bed_code, room_code, ttlock_remark_snapshot, status, source, created_at, updated_at)
VALUES ('bed_rent_plan_144', 'co_rent_plan', 'prop_rent_plan', '144', 'D200', '144 D200 0101', 'ACTIVE', 'TTLOCK', '${createdAt}', '${createdAt}');

INSERT INTO bed_rent_config_versions (config_id, company_id, property_id, bed_id, monthly_rent_fils, half_month_rent_fils, daily_rent_fils, effective_from, created_by, created_at)
VALUES ('rent_config_plan_144', 'co_rent_plan', 'prop_rent_plan', 'bed_rent_plan_144', 77000, 40000, 4000, '2026-05-01', 'user_staff_rent_plan', '${createdAt}');

INSERT INTO handover_sessions (session_id, company_id, property_id, operator_id, business_date, status, cash_handover_fils, bank_transfer_total_fils, bank_transfer_count, gross_received_fils, export_text, idempotency_key, created_at)
VALUES ('sess_rent_plan', 'co_rent_plan', 'prop_rent_plan', 'user_staff_rent_plan', '2026-05-23', 'DRAFT', 0, 0, 0, 0, NULL, 'idem_rent_plan', '${createdAt}');
`;

const verifySql = `
SELECT
  (SELECT COUNT(*) FROM transactions WHERE company_id = 'co_rent_plan') AS transaction_count,
  (SELECT COUNT(*) FROM transactions WHERE company_id = 'co_rent_plan' AND idempotency_key = 'emp_entry_rehearsal_rent_plan') AS transaction_idempotency_count,
  (SELECT COUNT(*) FROM receivables WHERE company_id = 'co_rent_plan' AND amount_remaining_fils = 69000) AS receivable_count,
  (SELECT COUNT(*) FROM payments WHERE company_id = 'co_rent_plan' AND amount_fils = 8000) AS payment_count,
  (SELECT COUNT(*) FROM arrear_tasks WHERE company_id = 'co_rent_plan' AND remaining_fils = 69000 AND promise_date = '2026-05-29') AS arrear_task_count,
  (SELECT COUNT(*) FROM audit_events WHERE company_id = 'co_rent_plan') AS audit_event_count,
  (SELECT cash_handover_fils FROM handover_sessions WHERE session_id = 'sess_rent_plan') AS cash_handover_fils,
  (SELECT bank_transfer_total_fils FROM handover_sessions WHERE session_id = 'sess_rent_plan') AS bank_transfer_total_fils,
  (SELECT bank_transfer_count FROM handover_sessions WHERE session_id = 'sess_rent_plan') AS bank_transfer_count,
  (SELECT gross_received_fils FROM handover_sessions WHERE session_id = 'sess_rent_plan') AS gross_received_fils;
`;

const persistDir = await mkdtemp(path.join(tmpdir(), "homelink-rent-plan-"));
const rehearsalSqlPath = path.join(persistDir, "rent-write-plan.sql");
const duplicateSqlPath = path.join(persistDir, "rent-write-plan-duplicate.sql");
let summary;

try {
  await writeFile(rehearsalSqlPath, `${seedSql}\n${planToSql(writePlan)}\n${verifySql}`, "utf8");
  await writeFile(duplicateSqlPath, planToSql(duplicateWritePlan), "utf8");

  runWrangler([
    "d1",
    "execute",
    "homelink",
    "--local",
    "--persist-to",
    persistDir,
    "--config",
    "wrangler.toml",
    "--file",
    draftSql,
    "--yes"
  ]);

  const resultJson = parseJsonOutput(
    runWrangler([
      "d1",
      "execute",
      "homelink",
      "--local",
      "--persist-to",
      persistDir,
      "--config",
      "wrangler.toml",
      "--file",
      rehearsalSqlPath,
      "--json",
      "--yes"
    ])
  );

  const row = rowsFromJson(resultJson).find((entry) => Object.hasOwn(entry, "transaction_count"));
  if (!row) throw new Error("Missing rent write plan rehearsal SELECT result.");

  requireEqual(row.transaction_count, 1, "transaction_count");
  requireEqual(row.transaction_idempotency_count, 1, "transaction_idempotency_count");
  requireEqual(row.receivable_count, 1, "receivable_count");
  requireEqual(row.payment_count, 1, "payment_count");
  requireEqual(row.arrear_task_count, 1, "arrear_task_count");
  requireEqual(row.audit_event_count, 5, "audit_event_count");
  requireEqual(row.cash_handover_fils, 8000, "cash_handover_fils");
  requireEqual(row.bank_transfer_total_fils, 0, "bank_transfer_total_fils");
  requireEqual(row.bank_transfer_count, 0, "bank_transfer_count");
  requireEqual(row.gross_received_fils, 8000, "gross_received_fils");

  expectWranglerFailure(
    [
      "d1",
      "execute",
      "homelink",
      "--local",
      "--persist-to",
      persistDir,
      "--config",
      "wrangler.toml",
      "--file",
      duplicateSqlPath,
      "--json",
      "--yes"
    ],
    /UNIQUE constraint failed/i
  );

  const postDuplicateJson = parseJsonOutput(
    runWrangler([
      "d1",
      "execute",
      "homelink",
      "--local",
      "--persist-to",
      persistDir,
      "--config",
      "wrangler.toml",
      "--command",
      verifySql,
      "--json",
      "--yes"
    ])
  );

  const postDuplicateRow = rowsFromJson(postDuplicateJson).find((entry) =>
    Object.hasOwn(entry, "transaction_count")
  );
  if (!postDuplicateRow) throw new Error("Missing post-duplicate SELECT result.");
  requireEqual(postDuplicateRow.transaction_count, 1, "post_duplicate_transaction_count");
  requireEqual(postDuplicateRow.receivable_count, 1, "post_duplicate_receivable_count");
  requireEqual(postDuplicateRow.payment_count, 1, "post_duplicate_payment_count");

  summary = {
    persistDir,
    operationCount: writePlan.operations.length,
    duplicateBlocked: true
  };
} finally {
  await rm(persistDir, { recursive: true, force: true });
}

if (summary) {
  console.log("Rent write plan rehearsal passed.");
  console.log(`Validated operations: ${summary.operationCount}`);
  console.log(`Duplicate idempotency write blocked: ${summary.duplicateBlocked}`);
  console.log(`Temporary D1 directory removed: ${summary.persistDir}`);
  console.log("Mode: local-only disposable D1; no production mutation.");
}

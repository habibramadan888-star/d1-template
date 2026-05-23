import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const workerDir = path.join(rootDir, "deploy-worker");
const draftSql = path.join(rootDir, "migration-drafts", "002_commercial_bootstrap.sql");
const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");

function runWrangler(args) {
  return execFileSync(process.execPath, [wranglerBin, ...args], {
    cwd: workerDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
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

function requireTables(actualTables, requiredTables) {
  const missing = requiredTables.filter((table) => !actualTables.includes(table));
  if (missing.length) {
    throw new Error(`Missing tables after migration rehearsal: ${missing.join(", ")}`);
  }
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

const requiredTables = [
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
  "audit_events",
  "schema_migrations"
];

const fixtureSql = `
INSERT INTO companies (company_id, name, status, created_at, updated_at)
VALUES ('co_rehearsal', 'Rehearsal Company', 'ACTIVE', '2026-05-23T00:00:00+04:00', '2026-05-23T00:00:00+04:00');

INSERT INTO properties (property_id, company_id, name, timezone, currency, status, created_at, updated_at)
VALUES ('prop_rehearsal', 'co_rehearsal', 'Rehearsal Property', 'Asia/Dubai', 'AED', 'ACTIVE', '2026-05-23T00:00:00+04:00', '2026-05-23T00:00:00+04:00');

INSERT INTO users (user_id, company_id, display_name, role, password_hash, status, created_at, updated_at)
VALUES ('user_staff_rehearsal', 'co_rehearsal', 'Rehearsal Staff', 'staff', 'rehearsal-hash-only', 'ACTIVE', '2026-05-23T00:00:00+04:00', '2026-05-23T00:00:00+04:00');

INSERT INTO property_memberships (membership_id, company_id, property_id, user_id, role, status, created_at, updated_at)
VALUES ('mem_rehearsal', 'co_rehearsal', 'prop_rehearsal', 'user_staff_rehearsal', 'staff', 'ACTIVE', '2026-05-23T00:00:00+04:00', '2026-05-23T00:00:00+04:00');

INSERT INTO beds (bed_id, company_id, property_id, bed_code, room_code, ttlock_remark_snapshot, status, source, created_at, updated_at)
VALUES ('bed_rehearsal_144', 'co_rehearsal', 'prop_rehearsal', '144', 'D200', '144 D200 0101', 'ACTIVE', 'TTLOCK', '2026-05-23T00:00:00+04:00', '2026-05-23T00:00:00+04:00');

INSERT INTO bed_rent_config_versions (config_id, company_id, property_id, bed_id, monthly_rent_fils, half_month_rent_fils, daily_rent_fils, effective_from, created_by, created_at)
VALUES ('rent_rehearsal_144', 'co_rehearsal', 'prop_rehearsal', 'bed_rehearsal_144', 77000, 40000, 4000, '2026-05-01', 'user_staff_rehearsal', '2026-05-23T00:00:00+04:00');

INSERT INTO handover_sessions (session_id, company_id, property_id, operator_id, business_date, status, cash_handover_fils, bank_transfer_total_fils, bank_transfer_count, gross_received_fils, export_text, idempotency_key, created_at, submitted_at)
VALUES ('sess_rehearsal', 'co_rehearsal', 'prop_rehearsal', 'user_staff_rehearsal', '2026-05-23', 'SUBMITTED', 28000, 0, 0, 28000, 'REHEARSAL ONLY', 'idem_rehearsal', '2026-05-23T00:00:00+04:00', '2026-05-23T00:00:00+04:00');

INSERT INTO transactions (transaction_id, company_id, property_id, session_id, bed_id, bed_code_snapshot, tenant_card_id, tenant_name_snapshot, event_type, payment_method, amount_fils, due_fils, paid_fils, deficit_fils, currency, period_start, period_end, cycle, period_days, reason_code, source, operator_id, created_at)
VALUES ('txn_rehearsal_rent', 'co_rehearsal', 'prop_rehearsal', 'sess_rehearsal', 'bed_rehearsal_144', '144 D200 0101', '139780080', '144 D200 0101', 'RENT', 'CASH', 8000, 77000, 8000, 69000, 'AED', '2026-06-01', '2026-07-01', '1M', 30, 'INSTALLMENT', 'EMP', 'user_staff_rehearsal', '2026-05-23T00:00:00+04:00');

INSERT INTO transactions (transaction_id, company_id, property_id, session_id, bed_id, bed_code_snapshot, tenant_card_id, tenant_name_snapshot, event_type, payment_method, amount_fils, due_fils, paid_fils, deficit_fils, currency, period_start, period_end, cycle, period_days, reason_code, source, operator_id, created_at)
VALUES ('txn_rehearsal_deposit', 'co_rehearsal', 'prop_rehearsal', 'sess_rehearsal', 'bed_rehearsal_144', '144 D200 0101', '139780080', '144 D200 0101', 'DEPOSIT_IN', 'CASH', 20000, 20000, 20000, 0, 'AED', NULL, NULL, NULL, NULL, NULL, 'EMP', 'user_staff_rehearsal', '2026-05-23T00:00:00+04:00');

INSERT INTO receivables (receivable_id, company_id, property_id, bed_id, tenant_card_id, source_transaction_id, amount_due_fils, amount_paid_fils, amount_remaining_fils, period_start, period_end, due_date, status, created_at, updated_at)
VALUES ('recv_rehearsal_144', 'co_rehearsal', 'prop_rehearsal', 'bed_rehearsal_144', '139780080', 'txn_rehearsal_rent', 77000, 8000, 69000, '2026-06-01', '2026-07-01', '2026-05-29', 'PARTIAL', '2026-05-23T00:00:00+04:00', '2026-05-23T00:00:00+04:00');

INSERT INTO payments (payment_id, company_id, property_id, session_id, transaction_id, receivable_id, amount_fils, payment_method, operator_id, created_at)
VALUES ('pay_rehearsal_rent', 'co_rehearsal', 'prop_rehearsal', 'sess_rehearsal', 'txn_rehearsal_rent', 'recv_rehearsal_144', 8000, 'CASH', 'user_staff_rehearsal', '2026-05-23T00:00:00+04:00');

INSERT INTO arrear_tasks (task_id, company_id, property_id, receivable_id, bed_id, tenant_card_id, remaining_fils, followup_status, promise_date, promise_amount_fils, staff_note, assigned_to, created_at, updated_at)
VALUES ('task_rehearsal_144', 'co_rehearsal', 'prop_rehearsal', 'recv_rehearsal_144', 'bed_rehearsal_144', '139780080', 69000, 'PROMISED', '2026-05-29', 69000, 'rehearsal only', 'user_staff_rehearsal', '2026-05-23T00:00:00+04:00', '2026-05-23T00:00:00+04:00');

INSERT INTO deposit_ledger (ledger_id, company_id, property_id, tenant_card_id, transaction_id, delta_fils, balance_after_fils, movement_type, operator_id, created_at)
VALUES ('dep_rehearsal_144', 'co_rehearsal', 'prop_rehearsal', '139780080', 'txn_rehearsal_deposit', 20000, 20000, 'DEPOSIT_IN', 'user_staff_rehearsal', '2026-05-23T00:00:00+04:00');

INSERT INTO audit_events (event_id, company_id, property_id, actor_id, actor_role, entity_type, entity_id, event_type, before_json, after_json, reason, created_at)
VALUES ('audit_rehearsal_submit', 'co_rehearsal', 'prop_rehearsal', 'user_staff_rehearsal', 'staff', 'handover_sessions', 'sess_rehearsal', 'SUBMIT', NULL, '{"status":"SUBMITTED"}', 'migration rehearsal', '2026-05-23T00:00:00+04:00');

SELECT
  (SELECT COUNT(*) FROM handover_sessions WHERE company_id = 'co_rehearsal') AS session_count,
  (SELECT COUNT(*) FROM transactions WHERE company_id = 'co_rehearsal') AS transaction_count,
  (SELECT SUM(amount_fils) FROM transactions WHERE company_id = 'co_rehearsal') AS transaction_total_fils,
  (SELECT COUNT(*) FROM receivables WHERE company_id = 'co_rehearsal' AND amount_remaining_fils = 69000) AS receivable_count,
  (SELECT COUNT(*) FROM payments WHERE company_id = 'co_rehearsal') AS payment_count,
  (SELECT COUNT(*) FROM arrear_tasks WHERE company_id = 'co_rehearsal' AND remaining_fils = 69000) AS arrear_task_count,
  (SELECT COUNT(*) FROM deposit_ledger WHERE company_id = 'co_rehearsal' AND balance_after_fils = 20000) AS deposit_ledger_count,
  (SELECT COUNT(*) FROM audit_events WHERE company_id = 'co_rehearsal') AS audit_event_count;

`;

const persistDir = await mkdtemp(path.join(tmpdir(), "homelink-d1-rehearsal-"));
const fixturePath = path.join(persistDir, "rehearsal-fixture.sql");
let summary;

try {
  await writeFile(fixturePath, fixtureSql, "utf8");

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

  const tableJson = parseJsonOutput(
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
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
      "--json"
    ])
  );
  const actualTables = rowsFromJson(tableJson).map((row) => row.name);
  requireTables(actualTables, requiredTables);

  const fixtureJson = parseJsonOutput(
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
      fixturePath,
      "--json",
      "--yes"
    ])
  );

  const rows = rowsFromJson(fixtureJson);
  const accountingRow = rows.find((row) => Object.hasOwn(row, "transaction_total_fils"));

  if (!accountingRow) throw new Error("Missing accounting rehearsal SELECT result.");

  requireEqual(accountingRow.session_count, 1, "session_count");
  requireEqual(accountingRow.transaction_count, 2, "transaction_count");
  requireEqual(accountingRow.transaction_total_fils, 28000, "transaction_total_fils");
  requireEqual(accountingRow.receivable_count, 1, "receivable_count");
  requireEqual(accountingRow.payment_count, 1, "payment_count");
  requireEqual(accountingRow.arrear_task_count, 1, "arrear_task_count");
  requireEqual(accountingRow.deposit_ledger_count, 1, "deposit_ledger_count");
  requireEqual(accountingRow.audit_event_count, 1, "audit_event_count");

  summary = {
    persistDir,
    tableCount: requiredTables.length
  };
} finally {
  await rm(persistDir, { recursive: true, force: true });
}

if (summary) {
  console.log("Migration rehearsal passed.");
  console.log(`Temporary D1 directory removed: ${summary.persistDir}`);
  console.log(`Validated tables: ${summary.tableCount}`);
  console.log(
    "Validated accounting fixture: session, transactions, receivable, payment, arrear task, deposit ledger, audit event."
  );
  console.log(
    "Rollback rehearsal note: D1 rejects SQL ROLLBACK in wrangler d1 execute; cleanup is verified by disposable local D1 removal."
  );
}

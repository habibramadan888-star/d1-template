import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const draftDir = "migration-drafts";

async function draftFiles() {
  const names = await readdir(draftDir);
  return names.filter((name) => name.endsWith(".sql")).map((name) => `${draftDir}/${name}`);
}

test("commercial migration drafts do not use floating money types", async () => {
  for (const file of await draftFiles()) {
    const sql = await readFile(file, "utf8");
    assert.doesNotMatch(sql, /\b(REAL|FLOAT|DOUBLE)\b/i, `${file} must not use float types`);
  }
});

test("commercial bootstrap draft creates required accounting tables", async () => {
  const sql = await readFile("migration-drafts/002_commercial_bootstrap.sql", "utf8");
  const requiredTables = [
    "schema_migrations",
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

  for (const table of requiredTables) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, "i"));
  }
});

test("commercial bootstrap draft uses tenant and property scope", async () => {
  const sql = await readFile("migration-drafts/002_commercial_bootstrap.sql", "utf8");
  assert.match(sql, /\bcompany_id TEXT NOT NULL\b/);
  assert.match(sql, /\bproperty_id TEXT NOT NULL\b/);
  assert.match(sql, /\bcompany_id, property_id\b/);
});

test("commercial bootstrap draft stores money as integer fils", async () => {
  const sql = await readFile("migration-drafts/002_commercial_bootstrap.sql", "utf8");
  const requiredMoneyColumns = [
    "monthly_rent_fils",
    "half_month_rent_fils",
    "daily_rent_fils",
    "cash_handover_fils",
    "bank_transfer_total_fils",
    "gross_received_fils",
    "amount_fils",
    "due_fils",
    "paid_fils",
    "deficit_fils",
    "amount_due_fils",
    "amount_paid_fils",
    "amount_remaining_fils",
    "remaining_fils",
    "promise_amount_fils",
    "delta_fils",
    "balance_after_fils"
  ];

  for (const column of requiredMoneyColumns) {
    assert.match(sql, new RegExp(`\\b${column} INTEGER\\b`, "i"));
  }
});

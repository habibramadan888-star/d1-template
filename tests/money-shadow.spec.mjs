import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyzeMoneyValue,
  identifyMoneyColumns,
  summarizeFindings
} from "../scripts/money-shadow-reconcile.mjs";

test("money shadow analysis parses exact legacy decimal values to fils", () => {
  assert.deepEqual(analyzeMoneyValue("100.50"), {
    status: "ok",
    raw: "100.50",
    fils: "10050",
    aed: "100.50",
    canonical: "100.50",
    differs: false,
    negative: false
  });
  assert.equal(analyzeMoneyValue("770").aed, "770.00");
  assert.equal(analyzeMoneyValue("-25.00").negative, true);
});

test("money shadow analysis flags unsafe values without mutating data", () => {
  assert.equal(analyzeMoneyValue(null).status, "empty");
  assert.equal(analyzeMoneyValue("").status, "empty");
  assert.equal(analyzeMoneyValue("NaN").status, "invalid");
  assert.equal(analyzeMoneyValue("Infinity").status, "invalid");
  assert.equal(analyzeMoneyValue("100.999").status, "over_precision");
  assert.equal(analyzeMoneyValue("abc").status, "invalid");
});

test("money shadow column detection includes monetary names and excludes dates or ids", () => {
  const columns = identifyMoneyColumns([
    {
      table: "transactions",
      columns: [
        { name: "amount", type: "REAL" },
        { name: "due", type: "REAL" },
        { name: "due_date", type: "TEXT" },
        { name: "bank_ref", type: "TEXT" },
        { name: "tenant_card_id", type: "TEXT" }
      ]
    },
    {
      table: "sessions",
      columns: [
        { name: "cash_handover", type: "REAL" },
        { name: "bank_transfer_count", type: "INTEGER" },
        { name: "gross_received", type: "REAL" }
      ]
    }
  ]);

  assert.deepEqual(
    columns.map((column) => `${column.table}.${column.column}`),
    ["sessions.cash_handover", "sessions.gross_received", "transactions.amount", "transactions.due"]
  );
});

test("money shadow summary counts parse categories", () => {
  const summary = summarizeFindings([
    { status: "ok", differs: false, negative: false },
    { status: "ok", differs: true, negative: false },
    { status: "invalid" },
    { status: "over_precision" },
    { status: "empty" },
    { status: "ok", differs: false, negative: true }
  ]);

  assert.equal(summary.total, 6);
  assert.equal(summary.ok, 3);
  assert.equal(summary.invalid, 1);
  assert.equal(summary.over_precision, 1);
  assert.equal(summary.empty, 1);
  assert.equal(summary.differs, 1);
  assert.equal(summary.negative, 1);
});

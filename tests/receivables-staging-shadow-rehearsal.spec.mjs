import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import {
  createReceivablesShadowComparisonRows,
  P0_008E_QA_RUN_ID,
  P0_008E_SOURCE,
  RECEIVABLES_SHADOW_FLAG,
  resolveReceivablesShadowMode,
  summarizeReceivablesShadowRows
} from "../scripts/compare-staging-receivables-shadow.mjs";

function note(scenario) {
  return `qa_run_id=${P0_008E_QA_RUN_ID};source=${P0_008E_SOURCE};scenario=${scenario}`;
}

function rehearsalRows() {
  return {
    arrearRows: [
      {
        task_id: "p0_008e_due_today",
        arrear_amount: "500.00",
        actual_received: "0.00",
        due_date: "2026-05-25",
        staff_note: note("due_today")
      },
      {
        task_id: "p0_008e_overdue",
        arrear_amount: "900.00",
        actual_received: "100.00",
        due_date: "2026-05-20",
        staff_note: note("overdue")
      },
      {
        task_id: "p0_008e_short_pay",
        arrear_amount: "770.00",
        actual_received: "80.00",
        due_date: "2026-05-25",
        staff_note: note("short_pay")
      },
      {
        task_id: "p0_008e_partial_repayment",
        arrear_amount: "1000.00",
        actual_received: "400.00",
        due_date: "2026-05-20",
        staff_note: note("partial_repayment")
      },
      {
        task_id: "p0_008e_full_repayment",
        arrear_amount: "300.00",
        actual_received: "300.00",
        due_date: "2026-05-20",
        staff_note: note("full_repayment")
      },
      {
        task_id: "p0_008e_adjustment_credit",
        arrear_amount: "700.00",
        actual_received: "600.00",
        due_date: "2026-05-30",
        staff_note: note("adjustment_credit")
      },
      {
        task_id: "p0_008e_adjustment_debit",
        arrear_amount: "500.00",
        actual_received: "500.00",
        due_date: "2026-05-30",
        staff_note: note("adjustment_debit")
      }
    ],
    transactions: [
      {
        id: "p0_008e_voided_payment",
        type: "R",
        cat: "rent",
        amount: "450.00",
        paid: "450.00",
        status: "VOIDED",
        voided_at: "2026-05-25T12:00:00.000Z"
      },
      {
        id: "p0_008e_deposit_exclusion",
        type: "D",
        cat: "deposit",
        amount: "250.00",
        paid: "250.00"
      }
    ]
  };
}

function scenario(rows, name) {
  return rows.find((row) => row.Scenario === name);
}

test("due today staging scenario computes shadow value", () => {
  const rows = createReceivablesShadowComparisonRows(rehearsalRows());
  assert.equal(scenario(rows, "P0-008E due today")["Receivable Shadow Value"], "500.00");
  assert.equal(scenario(rows, "P0-008E due today").Status, "MATCH");
});

test("overdue staging scenario computes shadow value", () => {
  const rows = createReceivablesShadowComparisonRows(rehearsalRows());
  assert.equal(scenario(rows, "P0-008E overdue")["Receivable Shadow Value"], "800.00");
  assert.equal(scenario(rows, "P0-008E overdue").Status, "MATCH");
});

test("short pay outstanding remains open", () => {
  const rows = createReceivablesShadowComparisonRows(rehearsalRows());
  assert.equal(
    scenario(rows, "P0-008E short pay outstanding")["Receivable Shadow Value"],
    "690.00"
  );
});

test("partial repayment reduces outstanding", () => {
  const rows = createReceivablesShadowComparisonRows(rehearsalRows());
  assert.equal(scenario(rows, "P0-008E partial repayment")["Receivable Shadow Value"], "600.00");
});

test("full repayment closes outstanding", () => {
  const rows = createReceivablesShadowComparisonRows(rehearsalRows());
  assert.equal(scenario(rows, "P0-008E full repayment")["Receivable Shadow Value"], "0.00");
});

test("adjustment credit is explicit expected difference", () => {
  const rows = createReceivablesShadowComparisonRows(rehearsalRows());
  const row = scenario(rows, "P0-008E adjustment credit");
  assert.equal(row["Receivable Shadow Value"], "0.00");
  assert.equal(row.Status, "EXPECTED_DIFFERENCE");
});

test("adjustment debit is explicit expected difference", () => {
  const rows = createReceivablesShadowComparisonRows(rehearsalRows());
  const row = scenario(rows, "P0-008E adjustment debit");
  assert.equal(row["Receivable Shadow Value"], "100.00");
  assert.equal(row.Status, "EXPECTED_DIFFERENCE");
});

test("voided payment impact is excluded from active outstanding", () => {
  const rows = createReceivablesShadowComparisonRows(rehearsalRows());
  assert.equal(scenario(rows, "P0-008E voided payment impact").Status, "MATCH");
});

test("deposit exclusion remains non-receivable by default", () => {
  const rows = createReceivablesShadowComparisonRows(rehearsalRows());
  assert.equal(scenario(rows, "P0-008E deposit exclusion").Status, "MATCH");
});

test("frontend totals are not authority and dashboard remains unchanged", () => {
  const rows = createReceivablesShadowComparisonRows(rehearsalRows());
  assert.equal(scenario(rows, "dashboard live result")["Legacy Value"], "unchanged");
  assert.equal(summarizeReceivablesShadowRows(rows).mismatchCount, 0);
});

test("production remains disabled for receivables shadow", () => {
  const mode = resolveReceivablesShadowMode({
    APP_ENV: "production",
    [RECEIVABLES_SHADOW_FLAG]: "true"
  });
  assert.equal(mode.enabled, false);
  assert.equal(mode.productionDisabled, true);
});

test("cleanup plan exists", () => {
  assert.equal(existsSync("RECEIVABLES_STAGING_TEST_DATA_RETENTION_PLAN.md"), true);
});

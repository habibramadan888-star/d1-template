import assert from "node:assert/strict";
import test from "node:test";

import {
  createReceivablesShadowComparisonRows,
  P0_008E_QA_RUN_ID,
  P0_008E_SOURCE
} from "../scripts/compare-staging-receivables-shadow.mjs";
import {
  createReceivablesAuthorityRehearsalRows,
  summarizeReceivablesAuthorityRehearsalRows
} from "../scripts/rehearse-receivables-staging-authority-switch.mjs";

function note(scenario) {
  return `qa_run_id=${P0_008E_QA_RUN_ID};source=${P0_008E_SOURCE};scenario=${scenario}`;
}

function comparisonRows() {
  return createReceivablesShadowComparisonRows({
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
  });
}

function scenario(rows, name) {
  return rows.find((row) => row.Scenario === name);
}

test("matched candidate switches to receivables authority value during rehearsal", () => {
  const rows = createReceivablesAuthorityRehearsalRows(comparisonRows());
  const dueToday = scenario(rows, "due today");

  assert.match(dueToday["Before Flag"], /^LEGACY:/);
  assert.match(dueToday["During Flag"], /^RECEIVABLES_AUTHORITY_STAGING_GATE:/);
  assert.equal(dueToday["Switch Applied"], "yes");
  assert.equal(dueToday["Rollback OK"], "yes");
});

test("only approved matched candidates switch", () => {
  const rows = createReceivablesAuthorityRehearsalRows(comparisonRows());
  const switched = rows.filter((row) => row["Switch Applied"] === "yes").map((row) => row.Scenario);

  assert.deepEqual(switched, [
    "rent received",
    "rent due",
    "arrears outstanding",
    "due today",
    "overdue amount",
    "arrears total"
  ]);
});

test("adjustment expected differences remain shadow-only", () => {
  const rows = createReceivablesAuthorityRehearsalRows(comparisonRows());
  const credit = scenario(rows, "P0-008E adjustment credit");
  const debit = scenario(rows, "P0-008E adjustment debit");

  assert.equal(credit["Switch Applied"], "no");
  assert.match(credit["During Flag"], /^SHADOW_ONLY:/);
  assert.equal(debit["Switch Applied"], "no");
  assert.match(debit["During Flag"], /^SHADOW_ONLY:/);
});

test("dashboard live result remains unchanged", () => {
  const rows = createReceivablesAuthorityRehearsalRows(comparisonRows());
  const dashboard = scenario(rows, "dashboard live result");

  assert.equal(dashboard["Switch Applied"], "no");
  assert.match(dashboard["Before Flag"], /unchanged/);
  assert.match(dashboard["After Rollback"], /unchanged/);
});

test("rollback restores legacy for all rows", () => {
  const rows = createReceivablesAuthorityRehearsalRows(comparisonRows());

  assert.equal(
    rows.every((row) => row["Rollback OK"] === "yes"),
    true
  );
});

test("summary passes when switch candidates and rollback are clean", () => {
  const rows = createReceivablesAuthorityRehearsalRows(comparisonRows());
  const summary = summarizeReceivablesAuthorityRehearsalRows(rows);

  assert.equal(summary.overall, "PASS");
  assert.equal(summary.switchedCount, 6);
  assert.equal(summary.blockedCount, 0);
  assert.equal(summary.rollbackFailedCount, 0);
});

test("summary blocks rollback failures", () => {
  const summary = summarizeReceivablesAuthorityRehearsalRows([
    {
      Scenario: "due today",
      "Switch Applied": "yes",
      "Rollback OK": "no",
      Result: "PASS"
    }
  ]);

  assert.equal(summary.overall, "BLOCKED");
  assert.equal(summary.rollbackFailedCount, 1);
});

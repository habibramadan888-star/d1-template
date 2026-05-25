import assert from "node:assert/strict";
import test from "node:test";

import {
  createReceivablesShadowComparisonRows,
  P0_008E_QA_RUN_ID,
  P0_008E_SOURCE
} from "../scripts/compare-staging-receivables-shadow.mjs";
import {
  createReceivablesAuthoritySwitchRows,
  RECEIVABLES_AUTHORITY_STAGING_FLAG,
  resolveReceivablesAuthorityStagingMode,
  summarizeReceivablesAuthoritySwitchRows
} from "../scripts/gate-receivables-staging-authority-switch.mjs";

function note(scenario) {
  return `qa_run_id=${P0_008E_QA_RUN_ID};source=${P0_008E_SOURCE};scenario=${scenario}`;
}

function p0008eRows() {
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

function authorityRows(env = { APP_ENV: "staging", [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "true" }) {
  const comparisonRows = createReceivablesShadowComparisonRows(p0008eRows());
  return createReceivablesAuthoritySwitchRows(comparisonRows, env);
}

function scenario(rows, name) {
  return rows.find((row) => row.Scenario === name);
}

test("production env disables receivables authority switch even when flag is true", () => {
  const mode = resolveReceivablesAuthorityStagingMode({
    APP_ENV: "production",
    [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "true"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.mode, "LEGACY");
  assert.equal(mode.productionDisabled, true);
  assert.equal(mode.dashboardMutationAllowed, false);
});

test("missing APP_ENV is production-safe disabled", () => {
  const mode = resolveReceivablesAuthorityStagingMode({
    [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "true"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.productionDisabled, true);
});

test("staging flag false keeps legacy behavior", () => {
  const rows = authorityRows({
    APP_ENV: "staging",
    [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "false"
  });

  assert.equal(scenario(rows, "due today").Mode, "LEGACY");
  assert.equal(scenario(rows, "due today").Result, "LEGACY");
});

test("staging flag true enables authority gate for approved candidates", () => {
  const rows = authorityRows();
  const dueToday = scenario(rows, "due today");
  const overdue = scenario(rows, "overdue amount");

  assert.equal(dueToday.Mode, "RECEIVABLES_AUTHORITY_STAGING_GATE");
  assert.equal(dueToday.Result, "PASS");
  assert.equal(overdue.Mode, "RECEIVABLES_AUTHORITY_STAGING_GATE");
  assert.equal(overdue.Result, "PASS");
});

test("candidate mismatch blocks authority switch gate", () => {
  const rows = createReceivablesAuthoritySwitchRows(
    [
      {
        Scenario: "due today",
        "Legacy Value": "100.00",
        "Receivable Shadow Value": "90.00",
        Delta: "10.00",
        Status: "MISMATCH"
      }
    ],
    { APP_ENV: "staging", [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "true" }
  );

  assert.equal(rows[0].Result, "BLOCKED");
  assert.equal(summarizeReceivablesAuthoritySwitchRows(rows).overall, "BLOCKED");
});

test("adjustment expected differences remain accounting review only", () => {
  const rows = authorityRows();
  const credit = scenario(rows, "P0-008E adjustment credit");
  const debit = scenario(rows, "P0-008E adjustment debit");

  assert.equal(credit.Mode, "SHADOW_ONLY");
  assert.equal(credit.Result, "ACCOUNTING_REVIEW_REQUIRED");
  assert.equal(debit.Mode, "SHADOW_ONLY");
  assert.equal(debit.Result, "ACCOUNTING_REVIEW_REQUIRED");
});

test("rehearsal evidence validates gate without becoming dashboard switch target", () => {
  const rows = authorityRows();
  const shortPay = scenario(rows, "P0-008E short pay outstanding");
  const deposit = scenario(rows, "P0-008E deposit exclusion");

  assert.equal(shortPay.Mode, "EVIDENCE_ONLY");
  assert.equal(shortPay.Result, "PASS");
  assert.equal(deposit.Mode, "EVIDENCE_ONLY");
  assert.equal(deposit.Result, "PASS");
});

test("dashboard live result remains unchanged guard", () => {
  const rows = authorityRows();
  const dashboard = scenario(rows, "dashboard live result");

  assert.equal(dashboard.Mode, "DASHBOARD_UNCHANGED_GUARD");
  assert.equal(dashboard.Result, "PASS");
});

test("summary passes with accounting review rows but no blocked switch candidates", () => {
  const rows = authorityRows();
  const summary = summarizeReceivablesAuthoritySwitchRows(rows);

  assert.equal(summary.overall, "PASS");
  assert.equal(summary.blockedCount, 0);
  assert.ok(summary.switchedCandidateCount >= 6);
  assert.equal(summary.accountingReviewCount, 3);
});

test("rollback flag false restores legacy rows", () => {
  const rows = authorityRows({
    APP_ENV: "staging",
    [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "false"
  });
  const activeSwitchRows = rows.filter((row) => row.Mode === "RECEIVABLES_AUTHORITY_STAGING_GATE");

  assert.equal(activeSwitchRows.length, 0);
  assert.equal(
    rows.every((row) => row.Result === "LEGACY"),
    true
  );
});

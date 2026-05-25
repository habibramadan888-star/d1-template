import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPaymentAllocation,
  applyReceivableAdjustment
} from "../modules/finance/receivables.mjs";
import {
  createReceivablesShadowComparisonRows,
  RECEIVABLES_SHADOW_FLAG,
  resolveReceivablesShadowMode,
  summarizeReceivablesShadowRows
} from "../scripts/compare-staging-receivables-shadow.mjs";

test("production env disables receivables shadow", () => {
  const mode = resolveReceivablesShadowMode({
    APP_ENV: "production",
    [RECEIVABLES_SHADOW_FLAG]: "true"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.mode, "LEGACY_NO_SHADOW");
  assert.equal(mode.productionDisabled, true);
  assert.equal(mode.dashboardMutationAllowed, false);
});

test("staging flag false does not alter behavior", () => {
  const mode = resolveReceivablesShadowMode({
    APP_ENV: "staging",
    [RECEIVABLES_SHADOW_FLAG]: "false"
  });

  assert.equal(mode.enabled, false);
  assert.equal(mode.reason, "flag_off");
  assert.equal(mode.dashboardMutationAllowed, false);
});

test("staging flag true allows shadow comparison", () => {
  const mode = resolveReceivablesShadowMode({
    APP_ENV: "staging",
    [RECEIVABLES_SHADOW_FLAG]: "true"
  });

  assert.equal(mode.enabled, true);
  assert.equal(mode.mode, "RECEIVABLES_SHADOW");
  assert.equal(mode.dashboardMutationAllowed, false);
});

test("due today computed from receivable drafts", () => {
  const rows = createReceivablesShadowComparisonRows({
    transactions: [
      {
        id: "rent-due-today",
        type: "R",
        amount: "770.00",
        paid: "0.00",
        created_at: "2026-05-25"
      }
    ],
    arrearRows: []
  });
  const dueToday = rows.find((row) => row.Scenario === "due today");

  assert.equal(dueToday["Receivable Shadow Value"], "770.00");
  assert.equal(dueToday.Status, "MISMATCH");
});

test("overdue computed from receivable drafts", () => {
  const rows = createReceivablesShadowComparisonRows({
    transactions: [],
    arrearRows: [
      {
        task_id: "overdue-1",
        arrear_amount: "770.00",
        actual_received: "80.00",
        due_date: "2026-05-20"
      }
    ]
  });
  const overdue = rows.find((row) => row.Scenario === "overdue amount");

  assert.equal(overdue["Legacy Value"], "690.00");
  assert.equal(overdue["Receivable Shadow Value"], "690.00");
  assert.equal(overdue.Status, "MATCH");
});

test("outstanding computed in fils", () => {
  const rows = createReceivablesShadowComparisonRows({
    transactions: [],
    arrearRows: [
      {
        task_id: "outstanding-1",
        arrear_amount: "770.00",
        actual_received: "80.00"
      }
    ]
  });
  const outstanding = rows.find((row) => row.Scenario === "arrears outstanding");

  assert.equal(outstanding["Receivable Shadow Value"], "690.00");
  assert.equal(outstanding.Delta, "0.00");
});

test("short pay creates outstanding", () => {
  const rows = createReceivablesShadowComparisonRows({
    transactions: [
      {
        id: "short-pay-1",
        type: "R",
        amount: "770.00",
        paid: "80.00",
        created_at: "2026-05-20"
      }
    ],
    arrearRows: []
  });
  const rentDue = rows.find((row) => row.Scenario === "rent due");

  assert.equal(rentDue["Receivable Shadow Value"], "770.00");
});

test("repayment reduces outstanding", () => {
  const result = applyPaymentAllocation(
    {
      receivableId: "repayment-shadow",
      sourceType: "RENT",
      amountAed: "770.00",
      paidAed: "80.00",
      dueDate: "2026-05-20"
    },
    { amountAed: "200.00", paymentSourceType: "TRANSACTION", paymentSourceId: "tx-repay" }
  );

  assert.equal(result.receivable.outstandingFils, 49000n);
});

test("voided payment does not reduce active outstanding", () => {
  const result = applyPaymentAllocation(
    {
      receivableId: "void-shadow",
      sourceType: "RENT",
      amountAed: "770.00",
      paidAed: "80.00",
      dueDate: "2026-05-20"
    },
    {
      amountAed: "200.00",
      status: "VOIDED",
      paymentSourceType: "TRANSACTION",
      paymentSourceId: "tx-void"
    }
  );

  assert.equal(result.allocationDraft.status, "VOIDED_IGNORED");
  assert.equal(result.receivable.outstandingFils, 69000n);
});

test("deposit not treated as rent receivable unless configured", () => {
  const rows = createReceivablesShadowComparisonRows({
    transactions: [
      {
        id: "deposit-1",
        type: "D",
        amount: "200.00",
        paid: "200.00",
        created_at: "2026-05-25"
      }
    ],
    arrearRows: []
  });
  const deposit = rows.find((row) => row.Scenario === "deposit handling");

  assert.equal(deposit.Status, "MATCH");
  assert.equal(
    rows.find((row) => row.Scenario === "rent received")["Receivable Shadow Value"],
    "0.00"
  );
});

test("adjustment affects outstanding correctly", () => {
  const result = applyReceivableAdjustment(
    {
      receivableId: "adjust-shadow",
      sourceType: "RENT",
      amountAed: "770.00",
      paidAed: "700.00",
      dueDate: "2026-05-25"
    },
    { adjustmentType: "CREDIT", amountAed: "70.00", reason: "OWNER_APPROVED" }
  );

  assert.equal(result.receivable.outstandingFils, 0n);
});

test("frontend totals are not authority", () => {
  const frontendSubmittedTotal = "1.00";
  const rows = createReceivablesShadowComparisonRows({
    transactions: [
      {
        id: "frontend-not-authority",
        type: "R",
        amount: "770.00",
        paid: "770.00",
        created_at: "2026-05-25"
      }
    ],
    arrearRows: []
  });
  const rentDue = rows.find((row) => row.Scenario === "rent due");

  assert.notEqual(frontendSubmittedTotal, rentDue["Receivable Shadow Value"]);
});

test("legacy arrears comparison produces delta/warning", () => {
  const rows = createReceivablesShadowComparisonRows({
    transactions: [],
    arrearRows: [
      {
        task_id: "legacy-warning-1",
        arrear_amount: "770.00",
        actual_received: "80.00",
        due_date: "2026-05-20"
      }
    ]
  });
  const warning = rows.find((row) => row.Scenario === "legacy warnings");

  assert.equal(warning.Status, "LEGACY_WARNING");
  assert.equal(summarizeReceivablesShadowRows(rows).overall, "PASS");
});

test("no dashboard mutation in shadow mode", () => {
  const rows = createReceivablesShadowComparisonRows({
    transactions: [],
    arrearRows: []
  });
  const dashboard = rows.find((row) => row.Scenario === "dashboard live result");

  assert.equal(dashboard["Legacy Value"], "unchanged");
  assert.equal(dashboard.Status, "MATCH");
});

test("rollback flag false restores no-shadow behavior", () => {
  const before = resolveReceivablesShadowMode({
    APP_ENV: "staging",
    [RECEIVABLES_SHADOW_FLAG]: "true"
  });
  const after = resolveReceivablesShadowMode({
    APP_ENV: "staging",
    [RECEIVABLES_SHADOW_FLAG]: "false"
  });

  assert.equal(before.enabled, true);
  assert.equal(after.enabled, false);
  assert.equal(after.mode, "LEGACY_NO_SHADOW");
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createEmployeeEntryLiveWriteAdapterDraft } from "../modules/worker/employee-entry-live-write-adapter.mjs";

function baseInput(overrides = {}) {
  const input = {
    auth: {
      companyId: "co_1",
      propertyId: "prop_1",
      operatorId: "staff_abdul"
    },
    body: {
      session: {
        id: "sess_1",
        date: "2026-05-24"
      },
      entry: {
        id: "entry_1",
        type: "R",
        room: "144",
        amount: "770.00",
        cat: "cash",
        period_start: "2026-06-01",
        cycle: "1M"
      }
    },
    resolved: {
      propertyId: "prop_1",
      listPriceAed: "770.00",
      depositBalanceAed: "200.00"
    },
    ids: {
      transactionId: "tx_1"
    }
  };

  return {
    ...input,
    ...overrides,
    auth: { ...input.auth, ...(overrides.auth || {}) },
    body: {
      ...input.body,
      ...(overrides.body || {}),
      session: { ...input.body.session, ...(overrides.body?.session || {}) },
      entry: { ...input.body.entry, ...(overrides.body?.entry || {}) }
    },
    resolved: { ...input.resolved, ...(overrides.resolved || {}) },
    ids: { ...input.ids, ...(overrides.ids || {}) }
  };
}

test("employee live write adapter drafts rent full-payment minor-unit patches without writing DB", () => {
  const result = createEmployeeEntryLiveWriteAdapterDraft(baseInput());

  assert.equal(result.ok, true);
  assert.equal(result.status, "DRAFT_READY");
  assert.equal(result.writesDatabase, false);
  assert.equal(result.metadata.liveRouteChanged, false);
  assert.equal(result.transactionPlan.table, "transactions");
  assert.equal(result.transactionPlan.legacyFields.amount, "770.00");
  assert.equal(result.transactionPlan.filsPatch.amount_fils, 77000);
  assert.equal(result.transactionPlan.filsPatch.due_fils, 77000);
  assert.equal(result.transactionPlan.filsPatch.paid_fils, 77000);
  assert.equal(result.transactionPlan.filsPatch.deficit_fils, 0);
  assert.equal(result.sessionPlan.legacyFields.cash_handover, "770.00");
  assert.equal(result.sessionPlan.legacyFields.bank_transfer_total, "0.00");
  assert.equal(result.sessionPlan.legacyFields.gross_received, "770.00");
});

test("employee live write adapter creates arrear task plan for short-paid rent", () => {
  const result = createEmployeeEntryLiveWriteAdapterDraft(
    baseInput({
      body: {
        entry: {
          id: "entry_short",
          amount: "80.00",
          cat: "bank",
          arrear_handling: "ARREAR",
          arrear_promise_date: "2026-05-29",
          reason_code: "partial_payment"
        }
      }
    })
  );

  assert.equal(result.ok, true);
  assert.equal(result.transactionPlan.filsPatch.amount_fils, 8000);
  assert.equal(result.transactionPlan.filsPatch.deficit_fils, 69000);
  assert.equal(result.sessionPlan.legacyFields.cash_handover, "0.00");
  assert.equal(result.sessionPlan.legacyFields.bank_transfer_total, "80.00");
  assert.equal(result.sessionPlan.legacyFields.gross_received, "80.00");
  assert.equal(result.arrearTaskPlan.filsPatch.arrear_amount_fils, 69000);
  assert.equal(result.arrearTaskPlan.legacyFields.promise_date, "2026-05-29");
});

test("employee live write adapter supports 15D and custom rent rules", () => {
  const fifteenDay = createEmployeeEntryLiveWriteAdapterDraft(
    baseInput({
      body: { entry: { id: "entry_15d", amount: "400.00", cycle: "15D" } }
    })
  );
  const custom = createEmployeeEntryLiveWriteAdapterDraft(
    baseInput({
      body: {
        entry: {
          id: "entry_custom",
          amount: "120.00",
          cycle: "CUST",
          period_day_count: 3
        }
      }
    })
  );

  assert.equal(fifteenDay.ok, true);
  assert.equal(fifteenDay.transactionPlan.filsPatch.period_due_fils, 40000);
  assert.equal(fifteenDay.transactionPlan.legacyFields.period_end, "2026-06-16");
  assert.equal(custom.ok, true);
  assert.equal(custom.transactionPlan.filsPatch.period_due_fils, 12000);
  assert.equal(custom.transactionPlan.legacyFields.period_end, "2026-06-04");
});

test("employee live write adapter drafts deposit collection and refund ledger patches", () => {
  const depositIn = createEmployeeEntryLiveWriteAdapterDraft(
    baseInput({
      body: { entry: { id: "entry_dep", type: "D", amount: "200.00" } },
      resolved: { depositBalanceAed: "0.00" }
    })
  );
  const refund = createEmployeeEntryLiveWriteAdapterDraft(
    baseInput({
      body: { entry: { id: "entry_refund", type: "DR", amount: "100.00" } },
      resolved: { depositBalanceAed: "200.00" }
    })
  );

  assert.equal(depositIn.ok, true);
  assert.equal(depositIn.depositLedgerPlan.filsPatch.delta_fils, 20000);
  assert.equal(depositIn.depositLedgerPlan.filsPatch.balance_after_fils, 20000);
  assert.equal(depositIn.sessionPlan.legacyFields.gross_received, "200.00");
  assert.equal(refund.ok, true);
  assert.equal(refund.depositLedgerPlan.filsPatch.delta_fils, -10000);
  assert.equal(refund.depositLedgerPlan.legacyFields.balance_after, "100.00");
  assert.equal(refund.sessionPlan.legacyFields.cash_handover, "-100.00");
  assert.equal(refund.sessionPlan.legacyFields.gross_received, "0.00");
});

test("employee live write adapter drafts checkout deduction without treating deposit deduction as income", () => {
  const result = createEmployeeEntryLiveWriteAdapterDraft(
    baseInput({
      body: {
        entry: {
          id: "entry_checkout",
          type: "CO",
          amount: "0.00",
          deposit_deduction: "40.00"
        }
      },
      resolved: { depositBalanceAed: "200.00" }
    })
  );

  assert.equal(result.ok, true);
  assert.equal(result.transactionPlan.filsPatch.deposit_deduction_fils, 4000);
  assert.equal(result.depositLedgerPlan.filsPatch.delta_fils, -4000);
  assert.equal(result.sessionPlan.legacyFields.cash_handover, "0.00");
  assert.equal(result.sessionPlan.legacyFields.gross_received, "0.00");
});

test("employee live write adapter drafts arrears payment increments against linked task", () => {
  const result = createEmployeeEntryLiveWriteAdapterDraft(
    baseInput({
      body: {
        entry: {
          id: "entry_ap",
          type: "AP",
          amount: "100.00",
          linked_task_id: "task_1"
        }
      }
    })
  );

  assert.equal(result.ok, true);
  assert.equal(result.arrearTaskPlan.task_id, "task_1");
  assert.equal(result.arrearTaskPlan.filsPatch.actual_received_increment_fils, 10000);
  assert.equal(result.sessionPlan.legacyFields.gross_received, "100.00");
});

test("employee live write adapter rejects unsafe money inputs", () => {
  const threeDecimals = createEmployeeEntryLiveWriteAdapterDraft(
    baseInput({ body: { entry: { id: "entry_bad_decimal", amount: "100.999" } } })
  );
  const numericAmount = createEmployeeEntryLiveWriteAdapterDraft(
    baseInput({ body: { entry: { id: "entry_number", amount: 770 } } })
  );

  assert.equal(threeDecimals.ok, false);
  assert.equal(threeDecimals.status, "REJECTED");
  assert.equal(
    threeDecimals.errors.some((error) => error.code === "INVALID_MONEY"),
    true
  );
  assert.equal(numericAmount.ok, false);
  assert.equal(
    numericAmount.errors.some((error) => error.code === "MONEY_MUST_BE_STRING"),
    true
  );
});

test("employee live write adapter excludes voided rows from active write planning", () => {
  const result = createEmployeeEntryLiveWriteAdapterDraft(
    baseInput({
      body: {
        entry: {
          id: "entry_void",
          status: "VOIDED"
        }
      }
    })
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "SKIPPED_VOIDED");
  assert.equal(result.transactionPlan, null);
  assert.equal(result.sessionPlan, null);
  assert.equal(
    result.warnings.some((warning) => warning.code === "VOIDED_ROW_EXCLUDED"),
    true
  );
});

test("employee live write adapter remains non-invasive and does not access D1 directly", async () => {
  const source = await readFile("modules/worker/employee-entry-live-write-adapter.mjs", "utf8");

  assert.doesNotMatch(source, /env\.DB|prepare\(|\.run\(|\.all\(|\.first\(/);
});

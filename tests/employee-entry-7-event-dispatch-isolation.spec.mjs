import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const marker = `__name(${name},`;
  const end = source.indexOf(marker, start);
  assert.ok(end > start, `${name} block must end with __name marker`);
  return source.slice(start, end);
}

async function loadDispatchHarness() {
  const worker = await readFile(workerPath, "utf8");
  const sandbox = {
    __name: (fn) => fn,
    cleanText: (value, limit = 1000) => String(value ?? "").trim().slice(0, limit),
    cleanId: (value) => String(value ?? "").trim(),
    entryAnchorEventType: (type) => ({ R: "rent", AP: "arrears_payment", D: "deposit_in", DR: "deposit_out", CO: "checkout", E: "expense", TF: "bed_transfer", TFF: "bed_transfer_fee" })[type] || String(type || "entry").toLowerCase(),
    employeeEntryValidationFailure: (stage, error_code, message, extra = {}) => ({
      ok: false,
      validator: "unknown_event",
      stage,
      error_code,
      message,
      ...extra
    }),
    validateRentUploadFields: () => ({ ok: true, validator: "rent" }),
    validateArrearsPaymentUploadFields: () => ({ ok: true, validator: "arrears_payment" }),
    validateDepositInUploadFields: () => ({ ok: true, validator: "deposit_in" }),
    validateDepositOutUploadFields: () => ({ ok: true, validator: "deposit_out" }),
    validateCheckoutUploadFields: () => ({ ok: true, validator: "checkout" }),
    validateExpenseUploadFields: () => ({ ok: true, validator: "expense" }),
    validateBedTransferUploadFields: () => ({ ok: true, validator: "bed_transfer" })
  };
  vm.createContext(sandbox);
  vm.runInContext(
    [
      functionBlock(worker, "validateEmployeeEntryUploadEventFields"),
      functionBlock(worker, "employeeEntryUploadType"),
      functionBlock(worker, "employeeEntryValidationEntryFromBody"),
      "this.validateEmployeeEntryUploadEventFields=validateEmployeeEntryUploadEventFields;",
      "this.employeeEntryUploadType=employeeEntryUploadType;",
      "this.employeeEntryValidationEntryFromBody=employeeEntryValidationEntryFromBody;"
    ].join("\n"),
    sandbox
  );
  return sandbox;
}

function validateProductionShapedPayload(harness, entry, eventIndex = 0) {
  const body = {
    event_index: eventIndex,
    session: {
      id: `DRYRUN-DISPATCH-${eventIndex}`,
      session_id: `DRYRUN-DISPATCH-${eventIndex}`,
      source: "employee_entry",
      entries: [entry]
    },
    entries: [entry]
  };
  const selected = harness.employeeEntryValidationEntryFromBody(body, eventIndex);
  const type = harness.employeeEntryUploadType(selected);
  return {
    type,
    result: harness.validateEmployeeEntryUploadEventFields(type, selected, {}, eventIndex, {
      type,
      event_type: selected.event_type || ""
    })
  };
}

const eventCases = [
  {
    name: "Rent",
    expected: "rent",
    entry: {
      event_type: "rent",
      type: "R",
      bed: "145",
      room: "145",
      paid_amount: 700,
      amount: 700,
      expected_rent: 700,
      payment_method: "cash",
      rent_period_start: "2026-08-01",
      rent_period_end: "2026-09-01"
    }
  },
  {
    name: "Arrears Payment",
    expected: "arrears_payment",
    entry: {
      event_type: "arrears_payment",
      type: "AP",
      reason_code: "AP",
      bed: "334",
      arrears_ref: "task-mrax794j-cb01ef7d",
      linked_task_id: "task-mrax794j-cb01ef7d",
      original_arrears_amount: 80,
      already_paid_amount: 0,
      payment_amount: 80,
      amount: 80,
      remaining_arrears_before_payment: 80,
      remaining_arrears_after_payment: 0,
      settlement_status: "settled",
      payment_method: "cash"
    }
  },
  {
    name: "Deposit In",
    expected: "deposit_in",
    entry: {
      event_type: "deposit_in",
      type: "D",
      bed: "145",
      deposit_amount: 200,
      amount: 200,
      payment_method: "cash"
    }
  },
  {
    name: "Deposit Out",
    expected: "deposit_out",
    entry: {
      event_type: "deposit_out",
      type: "DR",
      bed: "145",
      refund_amount: 100,
      amount: 100,
      payment_method: "cash",
      refund_reason: "normal refund"
    }
  },
  {
    name: "Checkout",
    expected: "checkout",
    entry: {
      event_type: "checkout",
      type: "CO",
      bed: "145",
      amount: 0,
      checkout_date: "2026-08-01",
      checkout_mode: "normal"
    }
  },
  {
    name: "Expense",
    expected: "expense",
    entry: {
      event_type: "expense",
      type: "E",
      bed: "145",
      target_bed: "145",
      expense_amount: 50,
      amount: 50,
      expense_category: "maintenance",
      reason: "repair",
      payment_method: "cash"
    }
  },
  {
    name: "Bed Transfer",
    expected: "bed_transfer",
    entry: {
      event_type: "bed_transfer",
      type: "TF",
      from_bed: "145",
      to_bed: "146",
      transfer_date: "2026-08-01",
      fee_choice: "paid",
      fee_amount: 50,
      amount: 50,
      payment_method: "cash"
    }
  }
];

for (const eventCase of eventCases) {
  test(`${eventCase.name} production-shaped dry-run payload routes only to its own validator`, async () => {
    const harness = await loadDispatchHarness();
    const { result } = validateProductionShapedPayload(harness, eventCase.entry);

    assert.equal(result.validator, eventCase.expected);
    if (eventCase.expected !== "rent") {
      assert.notEqual(result.validator, "rent");
      assert.notEqual(result.error_code, "RENT_REQUIRED_FIELD_MISSING");
    }
  });
}

test("unknown event_type is rejected and never reaches rent validator", async () => {
  const harness = await loadDispatchHarness();
  const { type, result } = validateProductionShapedPayload(harness, {
    event_type: "unknown_event",
    type: "R",
    bed: "145",
    amount: 700
  });

  assert.equal(type, "");
  assert.equal(result.error_code, "UNKNOWN_EVENT_TYPE");
  assert.notEqual(result.validator, "rent");
});

test("missing event_type and missing legacy type are rejected and never reach rent validator", async () => {
  const harness = await loadDispatchHarness();
  const { type, result } = validateProductionShapedPayload(harness, {
    bed: "145",
    amount: 700
  });

  assert.equal(type, "");
  assert.equal(result.error_code, "UNKNOWN_EVENT_TYPE");
  assert.notEqual(result.validator, "rent");
});

test("legacy type fallback works only when event_type is absent and recognized", async () => {
  const harness = await loadDispatchHarness();
  const { result } = validateProductionShapedPayload(harness, {
    type: "AP",
    reason_code: "AP",
    bed: "334",
    arrears_ref: "task-mrax794j-cb01ef7d",
    payment_amount: 80,
    remaining_arrears_before_payment: 80,
    remaining_arrears_after_payment: 0,
    settlement_status: "settled",
    payment_method: "cash"
  });

  assert.equal(result.validator, "arrears_payment");
  assert.notEqual(result.error_code, "RENT_REQUIRED_FIELD_MISSING");
});

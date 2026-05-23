import assert from "node:assert/strict";
import test from "node:test";

import { createRentEntryDraft } from "../modules/employees/entry-draft.mjs";
import { createRentWritePlan } from "../modules/employees/rent-write-plan.mjs";
import { parseAedToFils } from "../modules/finance/money.mjs";

function draft(overrides = {}) {
  return createRentEntryDraft({
    tenantId: "company_hl_009",
    propertyId: "property_hl_009",
    sessionId: "S20260523-test",
    operatorId: "user_abdul",
    eventType: "R",
    bed: "144",
    ttlockRemark: "144 D200 0101",
    paymentMethod: "cash",
    paidAmountAed: "770.00",
    listPriceFils: parseAedToFils("770.00"),
    periodStartDate: "2026-06-01",
    cycle: "1M",
    settlementDate: "2026-05-23",
    ...overrides
  });
}

function planOptions(overrides = {}) {
  return {
    transactionId: "tx_1",
    receivableId: "rec_1",
    paymentId: "pay_1",
    auditEventIds: ["audit_tx", "audit_rec", "audit_pay"],
    handoverAuditEventId: "audit_handover",
    createdAt: "2026-05-23T00:00:00.000+04:00",
    actorRole: "employee",
    bedId: "bed_144",
    ...overrides
  };
}

test("createRentWritePlan maps a settled rent draft to ordered commercial table operations", () => {
  const plan = createRentWritePlan(draft(), planOptions());
  const tables = plan.operations.map((operation) => operation.table);

  assert.equal(plan.atomic, true);
  assert.deepEqual(tables, [
    "transactions",
    "receivables",
    "payments",
    "audit_events",
    "audit_events",
    "audit_events",
    "handover_sessions",
    "audit_events"
  ]);

  const [transaction, receivable, payment] = plan.operations;
  assert.equal(transaction.row.company_id, "company_hl_009");
  assert.equal(transaction.row.property_id, "property_hl_009");
  assert.equal(transaction.row.amount_fils, 77000);
  assert.equal(transaction.row.due_fils, 77000);
  assert.equal(transaction.row.deficit_fils, 0);
  assert.equal(transaction.row.payment_method, "CASH");
  assert.equal(receivable.row.status, "PAID");
  assert.equal(receivable.row.closed_at, "2026-05-23T00:00:00.000+04:00");
  assert.equal(payment.row.amount_fils, 77000);
});

test("createRentWritePlan creates arrear task operation for partial rent", () => {
  const partialDraft = draft({
    paidAmountAed: "80.00",
    reasonCode: "partial_payment",
    promiseDate: "2026-05-29"
  });
  const plan = createRentWritePlan(
    partialDraft,
    planOptions({
      arrearTaskId: "task_1",
      auditEventIds: ["audit_tx", "audit_rec", "audit_pay", "audit_task"]
    })
  );

  const arrearOperation = plan.operations.find((operation) => operation.table === "arrear_tasks");
  assert.ok(arrearOperation);
  assert.equal(arrearOperation.row.remaining_fils, 69000);
  assert.equal(arrearOperation.row.promise_date, "2026-05-29");
  assert.equal(arrearOperation.row.assigned_to, "user_abdul");
});

test("createRentWritePlan keeps tenant and property scope on all inserted rows", () => {
  const plan = createRentWritePlan(draft(), planOptions());
  const insertedRows = plan.operations
    .filter((operation) => operation.row)
    .map((operation) => operation.row);

  for (const row of insertedRows) {
    assert.equal(row.company_id, "company_hl_009");
    assert.equal(row.property_id, "property_hl_009");
  }
});

test("createRentWritePlan emits SQL-safe integer amounts, not bigint or floating values", () => {
  const plan = createRentWritePlan(draft(), planOptions());
  const moneyKeys = [
    "amount_fils",
    "due_fils",
    "paid_fils",
    "deficit_fils",
    "amount_due_fils",
    "amount_paid_fils",
    "amount_remaining_fils"
  ];

  for (const operation of plan.operations) {
    if (!operation.row) continue;
    for (const key of moneyKeys) {
      if (!(key in operation.row)) continue;
      assert.equal(Number.isInteger(operation.row[key]), true, `${key} must be integer`);
      assert.notEqual(typeof operation.row[key], "bigint", `${key} must be SQL-bindable number`);
    }
  }
});

test("createRentWritePlan rejects incomplete ids and partial plans without arrear task id", () => {
  assert.throws(
    () => createRentWritePlan(draft(), planOptions({ auditEventIds: [] })),
    /audit event ids/
  );
  assert.throws(
    () =>
      createRentWritePlan(
        draft({
          paidAmountAed: "80.00",
          reasonCode: "partial_payment",
          promiseDate: "2026-05-29"
        }),
        planOptions()
      ),
    /arrearTaskId/
  );
});

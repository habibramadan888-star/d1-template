import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createEmployeeEntryCommercialRentPlan } from "../modules/worker/employee-entry-commercial-adapter.mjs";

function baseInput(overrides = {}) {
  return {
    auth: {
      companyId: "co_1",
      propertyId: "prop_1",
      operatorId: "staff_abdul",
      actorRole: "employee"
    },
    body: {
      session: {
        id: "sess_1",
        date: "2026-05-23"
      },
      entry: {
        id: "client_entry_1",
        type: "R",
        room: "144",
        amount: "770.00",
        cat: "cash",
        period_start: "2026-06-01",
        cycle: "1M"
      }
    },
    resolved: {
      bedId: "bed_144",
      ttlockRemark: "144 D200 0101",
      listPriceAed: "770.00"
    },
    ids: {
      transactionId: "tx_1",
      receivableId: "rec_1",
      paymentId: "pay_1",
      auditEventIds: ["audit_tx", "audit_rec", "audit_pay"],
      handoverAuditEventId: "audit_handover",
      createdAt: "2026-05-23T00:00:00.000+04:00"
    },
    ...overrides
  };
}

test("createEmployeeEntryCommercialRentPlan maps legacy employee rent payload to commercial write plan", () => {
  const result = createEmployeeEntryCommercialRentPlan(baseInput());

  assert.equal(result.route, "/api/employee/entry");
  assert.equal(result.mode, "commercial_rent_v1");
  assert.equal(result.response.success, true);
  assert.match(result.response.idempotency_key, /^emp_entry_[a-f0-9]{64}$/);

  const [transaction, receivable, payment] = result.writePlan.operations;
  assert.equal(transaction.table, "transactions");
  assert.equal(transaction.row.company_id, "co_1");
  assert.equal(transaction.row.property_id, "prop_1");
  assert.equal(transaction.row.idempotency_key, result.response.idempotency_key);
  assert.equal(transaction.row.amount_fils, 77000);
  assert.equal(transaction.row.due_fils, 77000);
  assert.equal(receivable.row.status, "PAID");
  assert.equal(payment.row.amount_fils, 77000);
});

test("createEmployeeEntryCommercialRentPlan creates arrears operation for short-paid rent", () => {
  const input = baseInput({
    body: {
      session: { id: "sess_1", date: "2026-05-23" },
      entry: {
        id: "client_entry_2",
        type: "R",
        room: "144",
        amount: "80.00",
        cat: "bank",
        period_start: "2026-06-01",
        cycle: "1M",
        arrear_handling: "ARREAR",
        reason_code: "partial_payment",
        arrear_promise_date: "2026-05-29"
      }
    },
    ids: {
      ...baseInput().ids,
      transactionId: "tx_2",
      receivableId: "rec_2",
      paymentId: "pay_2",
      arrearTaskId: "task_2",
      auditEventIds: ["audit_tx", "audit_rec", "audit_pay", "audit_task"]
    }
  });

  const result = createEmployeeEntryCommercialRentPlan(input);
  const arrearOperation = result.writePlan.operations.find(
    (operation) => operation.table === "arrear_tasks"
  );

  assert.ok(arrearOperation);
  assert.equal(arrearOperation.row.remaining_fils, 69000);
  assert.equal(arrearOperation.row.promise_date, "2026-05-29");
});

test("createEmployeeEntryCommercialRentPlan rejects unsafe or unresolved inputs", () => {
  assert.throws(
    () =>
      createEmployeeEntryCommercialRentPlan(
        baseInput({
          resolved: {
            bedId: "bed_144",
            ttlockRemark: "111 D200 0101",
            listPriceAed: "770.00"
          }
        })
      ),
    /does not match/
  );

  assert.throws(
    () =>
      createEmployeeEntryCommercialRentPlan(
        baseInput({
          body: {
            session: { id: "sess_1", date: "2026-05-23" },
            entry: {
              id: "client_entry_3",
              type: "R",
              room: "144",
              amount: 770,
              cat: "cash",
              period_start: "2026-06-01",
              cycle: "1M"
            }
          }
        })
      ),
    /entry.amount/
  );
});

test("employee entry commercial adapter is not wired to D1 directly", async () => {
  const source = await readFile("modules/worker/employee-entry-commercial-adapter.mjs", "utf8");

  assert.doesNotMatch(source, /env\.DB|prepare\(|\.run\(|\.all\(|\.first\(/);
});

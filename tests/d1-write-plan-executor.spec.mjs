import assert from "node:assert/strict";
import test from "node:test";

import { createRentEntryDraft } from "../modules/employees/entry-draft.mjs";
import { createRentWritePlan } from "../modules/employees/rent-write-plan.mjs";
import {
  createD1WritePlanStatements,
  executeD1WritePlan,
  isD1UniqueConstraintError
} from "../modules/worker/d1-write-plan-executor.mjs";
import { parseAedToFils } from "../modules/finance/money.mjs";

function rentPlan() {
  const draft = createRentEntryDraft({
    tenantId: "co_1",
    propertyId: "prop_1",
    sessionId: "sess_1",
    operatorId: "staff_1",
    eventType: "R",
    bed: "144",
    ttlockRemark: "144 D200 0101",
    paymentMethod: "cash",
    paidAmountAed: "770.00",
    listPriceFils: parseAedToFils("770.00"),
    periodStartDate: "2026-06-01",
    cycle: "1M",
    settlementDate: "2026-05-23"
  });

  return createRentWritePlan(draft, {
    transactionId: "tx_1",
    idempotencyKey: "emp_entry_key",
    receivableId: "rec_1",
    paymentId: "pay_1",
    auditEventIds: ["audit_tx", "audit_rec", "audit_pay"],
    handoverAuditEventId: "audit_handover",
    createdAt: "2026-05-23T00:00:00.000+04:00",
    actorRole: "employee",
    bedId: "bed_144"
  });
}

test("createD1WritePlanStatements builds allowlisted parameterized SQL statements", () => {
  const statements = createD1WritePlanStatements(rentPlan());

  assert.equal(statements[0].table, "transactions");
  assert.match(statements[0].sql, /^INSERT INTO transactions \(/);
  assert.match(statements[0].sql, /VALUES \(\?, /);
  assert.equal(statements[0].bindings.includes("emp_entry_key"), true);
  assert.equal(
    statements.some((statement) => statement.kind === "recompute_totals"),
    true
  );
});

test("createD1WritePlanStatements rejects unsafe operations", () => {
  assert.throws(
    () =>
      createD1WritePlanStatements({
        atomic: true,
        operations: [{ table: "transactions; DROP TABLE users", row: { transaction_id: "tx" } }]
      }),
    /Unsafe SQL identifier/
  );

  assert.throws(
    () =>
      createD1WritePlanStatements({
        atomic: true,
        operations: [{ table: "sessions", row: { session_id: "sess_1" } }]
      }),
    /Unsupported insert table/
  );

  assert.throws(
    () =>
      createD1WritePlanStatements({
        atomic: false,
        operations: []
      }),
    /atomic/
  );
});

test("executeD1WritePlan requires D1 batch semantics and maps unique conflicts", async () => {
  const prepared = [];
  const db = {
    prepare(sql) {
      return {
        bind(...bindings) {
          const statement = { sql, bindings };
          prepared.push(statement);
          return statement;
        }
      };
    },
    async batch(statements) {
      assert.deepEqual(statements, prepared);
      return [{ success: true }];
    }
  };

  const result = await executeD1WritePlan(db, rentPlan());
  assert.equal(result.success, true);
  assert.equal(prepared.length, result.statements.length);

  const conflictDb = {
    prepare: db.prepare,
    async batch() {
      throw new Error(
        "D1_ERROR: UNIQUE constraint failed: transactions.company_id, transactions.property_id, transactions.idempotency_key"
      );
    }
  };

  const conflict = await executeD1WritePlan(conflictDb, rentPlan());
  assert.equal(conflict.success, false);
  assert.equal(conflict.reason, "IDEMPOTENCY_CONFLICT");
});

test("isD1UniqueConstraintError detects wrapped D1 unique errors", () => {
  assert.equal(
    isD1UniqueConstraintError(new Error("UNIQUE constraint failed: transactions.x")),
    true
  );
  assert.equal(isD1UniqueConstraintError(new Error("syntax error near SELECT")), false);
});

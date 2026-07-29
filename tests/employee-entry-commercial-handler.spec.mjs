import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { handleEmployeeCommercialRentEntry } from "../modules/worker/employee-entry-commercial-handler.mjs";

function baseInput(overrides = {}) {
  return {
    auth: {
      companyId: "co_1",
      propertyId: "prop_1",
      operatorId: "staff_1",
      actorRole: "employee",
      hasPropertyMembership: true
    },
    body: {
      session: { id: "sess_1", date: "2026-05-23" },
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
    db: {},
    async executor() {
      return { success: true };
    },
    ...overrides
  };
}

test("handleEmployeeCommercialRentEntry accepts a validated employee rent entry", async () => {
  const result = await handleEmployeeCommercialRentEntry(baseInput());

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.accepted, true);
  assert.equal(result.body.entry_id, "tx_1");
  assert.match(result.body.idempotency_key, /^emp_entry_[a-f0-9]{64}$/);
});

test("handleEmployeeCommercialRentEntry enforces role and property membership before write", async () => {
  const roleDenied = await handleEmployeeCommercialRentEntry(
    baseInput({ auth: { ...baseInput().auth, actorRole: "tenant" } })
  );
  assert.equal(roleDenied.status, 403);
  assert.equal(roleDenied.body.error, "forbidden_role");

  const membershipDenied = await handleEmployeeCommercialRentEntry(
    baseInput({ auth: { ...baseInput().auth, hasPropertyMembership: false } })
  );
  assert.equal(membershipDenied.status, 403);
  assert.equal(membershipDenied.body.error, "property_membership_required");
});

test("handleEmployeeCommercialRentEntry maps idempotency conflicts to staff-safe responses", async () => {
  const duplicate = await handleEmployeeCommercialRentEntry(
    baseInput({
      async executor() {
        return { success: false, reason: "IDEMPOTENCY_CONFLICT" };
      },
      async loadExistingResult(key) {
        assert.match(key, /^emp_entry_[a-f0-9]{64}$/);
        return { entry_id: "tx_existing", session_id: "sess_1" };
      }
    })
  );

  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.duplicate, true);
  assert.equal(duplicate.body.entry_id, "tx_existing");

  const conflict = await handleEmployeeCommercialRentEntry(
    baseInput({
      async executor() {
        return { success: false, reason: "IDEMPOTENCY_CONFLICT" };
      }
    })
  );

  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error, "entry_already_accepted");
});

test("employee entry commercial handler does not expose raw database errors", async () => {
  const source = await readFile("modules/worker/employee-entry-commercial-handler.mjs", "utf8");

  assert.doesNotMatch(source, /SQLITE_ERROR|UNIQUE constraint failed|no such table/);
});

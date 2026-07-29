import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createHandoverCommitIdempotencyKey,
  validateHandoverAtomicRequest
} from "../modules/employees/handover-atomic-contract.mjs";

test("validateHandoverAtomicRequest accepts a complete future commit payload", () => {
  const result = validateHandoverAtomicRequest({
    session_id: "S20260524-001",
    employee_id: "abdul",
    idempotency_key: "handover_commit_key",
    submitted_at: "2026-05-24T03:00:00+04:00",
    client_totals: { cash_handover: "640.00" },
    rows: [{ client_entry_id: "row-1", event_type: "R", payment_method: "C" }]
  });

  assert.equal(result.apiPath, "/api/employee/handover/commit");
  assert.equal(result.method, "POST");
  assert.equal(result.rowCount, 1);
  assert.equal(result.clientTotalsAcceptedAsAuthority, false);
  assert.equal(result.requiresBackendRecompute, true);
  assert.equal(result.requiresAuditEvent, true);
});

test("validateHandoverAtomicRequest rejects missing idempotency or rows", () => {
  assert.throws(
    () =>
      validateHandoverAtomicRequest({
        session_id: "S1",
        employee_id: "abdul",
        submitted_at: "2026-05-24T03:00:00+04:00",
        rows: [{ client_entry_id: "row-1", event_type: "R", payment_method: "C" }]
      }),
    /idempotencyKey/
  );
  assert.throws(
    () =>
      validateHandoverAtomicRequest({
        session_id: "S1",
        employee_id: "abdul",
        idempotency_key: "k1",
        submitted_at: "2026-05-24T03:00:00+04:00",
        rows: []
      }),
    /rows/
  );
});

test("createHandoverCommitIdempotencyKey is stable and scoped", () => {
  const base = {
    companyId: "co1",
    propertyId: "prop1",
    sessionId: "S1",
    employeeId: "abdul",
    clientBatchId: "batch-1"
  };
  const a = createHandoverCommitIdempotencyKey(base);
  const b = createHandoverCommitIdempotencyKey(base);
  const c = createHandoverCommitIdempotencyKey({ ...base, clientBatchId: "batch-2" });

  assert.equal(a.key, b.key);
  assert.notEqual(a.key, c.key);
  assert.match(a.key, /^handover_commit_[a-f0-9]{64}$/);
});

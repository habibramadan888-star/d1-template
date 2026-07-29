import { createHash } from "node:crypto";

const MAX_HANDOVER_ROWS = 500;

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function requireRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("handover rows are required.");
  }
  if (rows.length > MAX_HANDOVER_ROWS) {
    throw new Error(`handover rows exceed limit ${MAX_HANDOVER_ROWS}.`);
  }
  return rows.map((row, index) => {
    if (!row || typeof row !== "object") {
      throw new Error(`handover row ${index + 1} must be an object.`);
    }
    return {
      clientEntryId: requireString(row.client_entry_id ?? row.clientEntryId, "clientEntryId"),
      eventType: requireString(row.event_type ?? row.eventType ?? row.type, "eventType"),
      paymentMethod: requireString(
        row.payment_method ?? row.paymentMethod ?? row.cat,
        "paymentMethod"
      )
    };
  });
}

export function createHandoverCommitIdempotencyKey(input) {
  const parts = [
    requireString(input.companyId, "companyId"),
    requireString(input.propertyId, "propertyId"),
    requireString(input.sessionId, "sessionId"),
    requireString(input.employeeId, "employeeId"),
    requireString(input.clientBatchId, "clientBatchId")
  ];
  const canonical = parts.join("\u001f");
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  return { canonical, key: `handover_commit_${digest}` };
}

export function validateHandoverAtomicRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("handover atomic request must be an object.");
  }

  const sessionId = requireString(input.session_id ?? input.sessionId, "sessionId");
  const employeeId = requireString(input.employee_id ?? input.employeeId, "employeeId");
  const idempotencyKey = requireString(
    input.idempotency_key ?? input.idempotencyKey,
    "idempotencyKey"
  );
  const submittedAt = requireString(input.submitted_at ?? input.submittedAt, "submittedAt");
  const rows = requireRows(input.rows);

  return {
    apiPath: "/api/employee/handover/commit",
    method: "POST",
    sessionId,
    employeeId,
    idempotencyKey,
    submittedAt,
    rowCount: rows.length,
    rows,
    clientTotalsAcceptedAsAuthority: false,
    requiresBackendRecompute: true,
    requiresAuditEvent: true
  };
}

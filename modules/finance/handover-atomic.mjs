import { createHash } from "node:crypto";
import {
  compareFrontendTotalsToBackend,
  computeHandoverTotalsFils,
  formatTotalsForReport,
  normalizeLegacyAmountToFils
} from "./backend-totals.mjs";
import { filsToAedString } from "./money.mjs";
import { normalizeHandoverCategory, normalizePaymentMethod } from "./handover.mjs";

const MAX_HANDOVER_ROWS = 500;
const EMPLOYEE_ROLES = new Set(["employee", "staff"]);
const VOIDED_STATUSES = new Set(["VOID", "VOIDED", "DELETED", "CANCELLED"]);

function issue(code, message, extra = {}) {
  return { code, message, ...extra };
}

function stringValue(value, field, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(issue("MISSING_REQUIRED_FIELD", `${field} is required.`, { field, value }));
    return "";
  }
  return value.trim();
}

function inputValue(row, keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key];
  }
  return undefined;
}

function stableValue(value) {
  if (typeof value === "bigint") return `${value.toString()}n`;
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isVoidedRow(row) {
  if (!row || typeof row !== "object") return false;
  if (row.voided_at || row.session_voided_at || row.transaction_voided_at) return true;
  const status = String(row.status ?? row.session_status ?? row.transaction_status ?? "")
    .trim()
    .toUpperCase();
  return VOIDED_STATUSES.has(status);
}

function normalizeContext(context = {}) {
  return {
    role: String(context.role ?? context.submitterRole ?? "")
      .trim()
      .toLowerCase(),
    employeeId: String(context.employeeId ?? context.employee_id ?? "").trim(),
    allowedEmployeeIds: new Set((context.allowedEmployeeIds || []).map((item) => String(item))),
    allowedPropertyIds: new Set((context.allowedPropertyIds || []).map((item) => String(item))),
    existingCommits: context.existingCommits || context.existing_state?.commits || []
  };
}

function compareSet(set, value) {
  if (!set || set.size === 0) return true;
  return set.has(String(value));
}

export function validateHandoverCommitRequest(input, context = {}) {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      ok: false,
      errors: [issue("INVALID_REQUEST", "Handover commit request must be an object.")],
      warnings
    };
  }

  const ctx = normalizeContext(context);
  const sessionId = stringValue(input.session_id ?? input.sessionId, "session_id", errors);
  const idempotencyKey = stringValue(
    input.idempotency_key ?? input.idempotencyKey,
    "idempotency_key",
    errors
  );
  const employeeId = stringValue(input.employee_id ?? input.employeeId, "employee_id", errors);
  const propertyId = stringValue(input.property_id ?? input.propertyId, "property_id", errors);
  const submittedAt = stringValue(input.submitted_at ?? input.submittedAt, "submitted_at", errors);
  const rows = input.rows;

  if (!EMPLOYEE_ROLES.has(ctx.role)) {
    errors.push(
      issue("INVALID_SUBMITTER_ROLE", "Only employee/staff role may submit handover commits.", {
        field: "role",
        value: ctx.role
      })
    );
  }
  if (ctx.employeeId && employeeId && ctx.employeeId !== employeeId) {
    errors.push(
      issue(
        "EMPLOYEE_CONTEXT_MISMATCH",
        "Authenticated employee does not match request employee.",
        {
          field: "employee_id",
          value: employeeId
        }
      )
    );
  }
  if (employeeId && !compareSet(ctx.allowedEmployeeIds, employeeId)) {
    errors.push(
      issue("UNAUTHORIZED_EMPLOYEE_SCOPE", "Employee is outside allowed handover scope.", {
        field: "employee_id",
        value: employeeId
      })
    );
  }
  if (propertyId && !compareSet(ctx.allowedPropertyIds, propertyId)) {
    errors.push(
      issue("UNAUTHORIZED_PROPERTY_SCOPE", "Property is outside allowed handover scope.", {
        field: "property_id",
        value: propertyId
      })
    );
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push(issue("MISSING_ROWS", "Handover rows are required.", { field: "rows" }));
  } else if (rows.length > MAX_HANDOVER_ROWS) {
    errors.push(
      issue("TOO_MANY_ROWS", `Handover rows exceed limit ${MAX_HANDOVER_ROWS}.`, {
        field: "rows",
        value: rows.length
      })
    );
  }

  const expectedRowCount = input.expected_row_count ?? input.expectedRowCount;
  if (
    expectedRowCount !== undefined &&
    Array.isArray(rows) &&
    rows.length < Number(expectedRowCount)
  ) {
    errors.push(
      issue("PARTIAL_HANDOVER_ROWS", "Submitted rows are fewer than expected row count.", {
        field: "rows",
        value: rows.length,
        expected: Number(expectedRowCount)
      })
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    request: {
      sessionId,
      idempotencyKey,
      employeeId,
      propertyId,
      submittedAt,
      rows: Array.isArray(rows) ? rows : [],
      frontendTotals: input.frontend_totals ?? input.frontendTotals ?? input.client_totals ?? {}
    }
  };
}

function normalizeOneRow(row, index) {
  const errors = [];
  const warnings = [];
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return {
      ok: false,
      rowId: `row-${index + 1}`,
      errors: [
        issue("INVALID_ROW", "Handover row must be an object.", { rowId: `row-${index + 1}` })
      ],
      warnings
    };
  }

  const rowId = String(
    inputValue(row, ["client_entry_id", "clientEntryId", "id"]) ?? `row-${index + 1}`
  );
  const clientEntryId = stringValue(
    inputValue(row, ["client_entry_id", "clientEntryId", "id"]),
    "client_entry_id",
    errors
  );
  const rawType = inputValue(row, ["event_type", "eventType", "type", "category"]);
  const rawPayment = inputValue(row, ["payment_method", "paymentMethod", "pay_type", "pay", "cat"]);
  const amountValue = inputValue(row, ["amount", "paid", "amount_aed", "amountAed"]);

  let category = "";
  let paymentMethod = "";
  try {
    category = normalizeHandoverCategory(String(rawType ?? ""));
  } catch (error) {
    errors.push(
      issue("INVALID_EVENT_TYPE", error?.message || "Unsupported event type.", {
        rowId,
        field: "event_type",
        value: rawType
      })
    );
  }
  try {
    paymentMethod = normalizePaymentMethod(String(rawPayment ?? ""));
  } catch (error) {
    errors.push(
      issue("INVALID_PAYMENT_METHOD", error?.message || "Unsupported payment method.", {
        rowId,
        field: "payment_method",
        value: rawPayment
      })
    );
  }

  const money = normalizeLegacyAmountToFils(amountValue, {
    field: "amount",
    rowId,
    allowNegative: false
  });
  warnings.push(...money.warnings);
  errors.push(...money.errors);

  if (isVoidedRow(row)) {
    errors.push(
      issue("VOIDED_ROW_REJECTED", "Voided session or transaction row cannot be recommitted.", {
        rowId
      })
    );
  }

  const normalized = {
    ...row,
    id: rowId,
    client_entry_id: clientEntryId,
    event_type: String(rawType ?? ""),
    type: String(rawType ?? ""),
    category,
    payment_method: paymentMethod,
    pay_type: paymentMethod === "cash" ? "C" : "B",
    amount: amountValue === undefined || amountValue === null ? "" : String(amountValue).trim(),
    amountFils: money.ok ? money.fils : null,
    amountAed: money.ok ? filsToAedString(money.fils) : null,
    bed: row.bed ?? row.room ?? "",
    tenant: row.tenant ?? row.tenant_name ?? ""
  };

  return {
    ok: errors.length === 0,
    rowId,
    normalized,
    errors,
    warnings
  };
}

export function normalizeHandoverRows(rows) {
  if (!Array.isArray(rows)) throw new TypeError("Handover rows must be an array.");
  return rows.map((row, index) => normalizeOneRow(row, index));
}

export function rejectVoidedRows(rows) {
  const normalized = normalizeHandoverRows(rows);
  return {
    acceptedRows: normalized.filter((item) => item.ok).map((item) => item.normalized),
    rejectedRows: normalized
      .filter((item) => !item.ok)
      .map((item) => ({
        rowId: item.rowId,
        errors: item.errors,
        warnings: item.warnings
      }))
  };
}

export function classifyHandoverRows(rows) {
  const normalized = normalizeHandoverRows(rows);
  const acceptedRows = [];
  const rejectedRows = [];
  const warnings = [];
  const errors = [];

  for (const item of normalized) {
    warnings.push(...item.warnings);
    if (item.ok) {
      acceptedRows.push(item.normalized);
      continue;
    }
    errors.push(...item.errors);
    rejectedRows.push({
      rowId: item.rowId,
      errors: item.errors,
      warnings: item.warnings
    });
  }

  return { acceptedRows, rejectedRows, warnings, errors };
}

export function computeHandoverBackendTotals(rows, options = {}) {
  return computeHandoverTotalsFils(rows, options);
}

export function compareHandoverFrontendTotals(frontendTotals, backendTotals) {
  return compareFrontendTotalsToBackend(frontendTotals || {}, backendTotals);
}

export function generateIdempotencyFingerprint(input) {
  const validation = validateHandoverCommitRequest(input, { role: "staff" });
  const payload = validation.request
    ? {
        sessionId: validation.request.sessionId,
        employeeId: validation.request.employeeId,
        propertyId: validation.request.propertyId,
        rows: validation.request.rows.map((row) => ({
          client_entry_id: inputValue(row, ["client_entry_id", "clientEntryId", "id"]),
          event_type: inputValue(row, ["event_type", "eventType", "type", "category"]),
          payment_method: inputValue(row, [
            "payment_method",
            "paymentMethod",
            "pay_type",
            "pay",
            "cat"
          ]),
          amount: inputValue(row, ["amount", "paid", "amount_aed", "amountAed"]),
          bed: row.bed ?? row.room ?? "",
          tenant: row.tenant ?? row.tenant_name ?? "",
          voided_at: row.voided_at ?? row.session_voided_at ?? row.transaction_voided_at ?? "",
          status: row.status ?? row.session_status ?? row.transaction_status ?? ""
        }))
      }
    : input;
  return sha256(stableStringify(payload));
}

export function detectDuplicateHandoverSubmission(existing = [], incoming) {
  const idempotencyKey = incoming?.idempotencyKey || incoming?.idempotency_key || "";
  const fingerprint =
    incoming?.fingerprint || generateIdempotencyFingerprint(incoming?.input || incoming);
  const list = Array.isArray(existing) ? existing : [];
  const sameKey = list.find(
    (item) => (item.idempotencyKey || item.idempotency_key) === idempotencyKey
  );
  if (sameKey) {
    const existingFingerprint = sameKey.fingerprint || sameKey.request_fingerprint;
    if (!existingFingerprint || existingFingerprint === fingerprint) {
      return {
        status: "IDEMPOTENT_REPLAY",
        replay: true,
        existing: sameKey,
        warnings: [
          issue(
            "IDEMPOTENT_REPLAY",
            "Same idempotency key replayed; no duplicate write is planned."
          )
        ],
        errors: []
      };
    }
    return {
      status: "IDEMPOTENCY_CONFLICT",
      replay: false,
      existing: sameKey,
      warnings: [],
      errors: [
        issue("IDEMPOTENCY_CONFLICT", "Same idempotency key was used with a different payload.")
      ]
    };
  }

  const sameFingerprint = list.find((item) => {
    const existingFingerprint = item.fingerprint || item.request_fingerprint;
    return existingFingerprint && existingFingerprint === fingerprint;
  });
  if (sameFingerprint) {
    return {
      status: "DUPLICATE_WARNING",
      replay: false,
      existing: sameFingerprint,
      warnings: [
        issue(
          "DUPLICATE_FINGERPRINT",
          "Same handover rows were submitted with a different idempotency key."
        )
      ],
      errors: []
    };
  }

  return { status: "NEW", replay: false, existing: null, warnings: [], errors: [] };
}

export function planHandoverAuditEvents(commitDraft) {
  const base = {
    session_id: commitDraft.sessionId,
    employee_id: commitDraft.employeeId,
    property_id: commitDraft.propertyId,
    idempotency_key: commitDraft.idempotencyKey,
    request_fingerprint: commitDraft.fingerprint
  };
  const events = [
    {
      event_type: "handover_commit_attempt",
      status: commitDraft.status,
      ...base
    }
  ];
  events.push({
    event_type: commitDraft.commitAccepted
      ? "handover_commit_accepted"
      : "handover_commit_rejected",
    status: commitDraft.status,
    accepted_rows: commitDraft.acceptedRows.length,
    rejected_rows: commitDraft.rejectedRows.length,
    ...base
  });
  return events;
}

export function planHandoverEntryEvents(commitDraft) {
  const accepted = commitDraft.acceptedRows.map((row) => ({
    event_type: "handover_entry_accepted",
    session_id: commitDraft.sessionId,
    employee_id: commitDraft.employeeId,
    property_id: commitDraft.propertyId,
    client_entry_id: row.client_entry_id,
    amount_aed: row.amountAed
  }));
  const rejected = commitDraft.rejectedRows.map((row) => ({
    event_type: "handover_entry_rejected",
    session_id: commitDraft.sessionId,
    employee_id: commitDraft.employeeId,
    property_id: commitDraft.propertyId,
    client_entry_id: row.rowId,
    reason: row.errors.map((item) => item.code).join(",")
  }));
  return [...accepted, ...rejected];
}

function toTotalsForResult(totals) {
  return {
    ...formatTotalsForReport(totals),
    cashHandoverFils: totals.cashHandoverFils,
    bankTransferTotalFils: totals.bankTransferTotalFils,
    grossReceivedFils: totals.grossReceivedFils,
    sessionTotalFils: totals.sessionTotalFils,
    rentReceivedFils: totals.rentReceivedFils,
    depositReceivedFils: totals.depositReceivedFils,
    arrearsPaidFils: totals.arrearsPaidFils,
    bankTransferCount: totals.bankTransferCount,
    rowCount: totals.rowCount,
    includedRowCount: totals.includedRowCount,
    excludedVoidedRowCount: totals.excludedVoidedRowCount
  };
}

function hasErrorCode(errors, code) {
  return errors.some((item) => item.code === code);
}

function classifyStatus({ errors, warnings, duplicate, comparison, acceptedRows }) {
  if (duplicate.status === "IDEMPOTENT_REPLAY") return "IDEMPOTENT_REPLAY";
  if (duplicate.status === "IDEMPOTENCY_CONFLICT") return "REJECTED";
  if (
    hasErrorCode(errors, "INVALID_SUBMITTER_ROLE") ||
    hasErrorCode(errors, "UNAUTHORIZED_EMPLOYEE_SCOPE") ||
    hasErrorCode(errors, "UNAUTHORIZED_PROPERTY_SCOPE") ||
    hasErrorCode(errors, "EMPLOYEE_CONTEXT_MISMATCH")
  ) {
    return "UNAUTHORIZED";
  }
  if (hasErrorCode(errors, "VOIDED_ROW_REJECTED")) return "VOIDED_REJECTED";
  if (
    hasErrorCode(errors, "INVALID_AMOUNT") ||
    hasErrorCode(errors, "MISSING_AMOUNT") ||
    hasErrorCode(errors, "INVALID_NUMBER_AMOUNT")
  ) {
    return "INVALID_AMOUNT";
  }
  if (errors.length > 0) return "REJECTED";
  if (duplicate.status === "DUPLICATE_WARNING") return "DUPLICATE_WARNING";
  if (comparison && !comparison.matches) return "DISCREPANCY";
  if (acceptedRows.length === 0) return "REJECTED";
  if (warnings.some((item) => item.code === "PARTIAL_HANDOVER_ROWS")) return "REJECTED";
  return "ACCEPTED";
}

export function buildHandoverCommitDraft(input, context = {}) {
  const validation = validateHandoverCommitRequest(input, context);
  const ctx = normalizeContext(context);
  const warnings = [...validation.warnings];
  const errors = [...validation.errors];
  const request = validation.request || {
    sessionId: "",
    idempotencyKey: "",
    employeeId: "",
    propertyId: "",
    submittedAt: "",
    rows: [],
    frontendTotals: {}
  };

  const classified = classifyHandoverRows(request.rows);
  warnings.push(...classified.warnings);
  errors.push(...classified.errors);

  const backendTotals = computeHandoverBackendTotals(classified.acceptedRows);
  warnings.push(...backendTotals.warnings);
  errors.push(...backendTotals.errors);

  const comparison = compareHandoverFrontendTotals(request.frontendTotals, backendTotals);
  warnings.push(...comparison.warnings);
  errors.push(...comparison.errors);

  if (!comparison.matches) {
    warnings.push(
      issue(
        "FRONTEND_TOTAL_DISCREPANCY",
        "Frontend submitted totals do not match backend recompute."
      )
    );
  }

  const fingerprint = generateIdempotencyFingerprint(input);
  const duplicate = detectDuplicateHandoverSubmission(ctx.existingCommits, {
    idempotencyKey: request.idempotencyKey,
    fingerprint,
    input
  });
  warnings.push(...duplicate.warnings);
  errors.push(...duplicate.errors);

  const status = classifyStatus({
    errors,
    warnings,
    duplicate,
    comparison,
    acceptedRows: classified.acceptedRows
  });
  const commitAccepted = status === "ACCEPTED";

  const draft = {
    status,
    commitAccepted,
    writePlanAllowed: commitAccepted,
    sessionId: request.sessionId,
    idempotencyKey: request.idempotencyKey,
    employeeId: request.employeeId,
    propertyId: request.propertyId,
    submittedAt: request.submittedAt,
    fingerprint,
    acceptedRows: classified.acceptedRows,
    rejectedRows: classified.rejectedRows,
    backendTotals: toTotalsForResult(backendTotals),
    frontendTotals: request.frontendTotals,
    discrepancy: comparison,
    idempotency: {
      status: duplicate.status,
      replay: duplicate.replay,
      existingId: duplicate.existing?.commit_id || duplicate.existing?.id || ""
    },
    warnings,
    errors
  };
  draft.auditEventsPlan = planHandoverAuditEvents(draft);
  draft.entryEventsPlan = planHandoverEntryEvents(draft);
  return draft;
}

export function formatHandoverCommitResult(result) {
  return {
    status: result.status,
    commitAccepted: result.commitAccepted,
    idempotencyStatus: result.idempotency?.status || "UNKNOWN",
    acceptedRowCount: result.acceptedRows?.length || 0,
    rejectedRowCount: result.rejectedRows?.length || 0,
    backendTotals: formatTotalsForReport(result.backendTotals),
    frontendTotals: result.frontendTotals,
    discrepancyMatches: Boolean(result.discrepancy?.matches),
    warningCodes: (result.warnings || []).map((item) => item.code),
    errorCodes: (result.errors || []).map((item) => item.code),
    auditEvents: (result.auditEventsPlan || []).map((item) => item.event_type),
    entryEventCount: result.entryEventsPlan?.length || 0
  };
}

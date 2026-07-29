import { createRentEntryDraft } from "../employees/entry-draft.mjs";
import { createEmployeeEntryIdempotencyKey } from "../employees/idempotency.mjs";
import { createRentWritePlan } from "../employees/rent-write-plan.mjs";
import { parseAedToFils } from "../finance/money.mjs";

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function optionalString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

function requireIsoDate(value, label) {
  const text = requireString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }
  return text;
}

function resolveListPriceFils(resolved) {
  if (typeof resolved.listPriceFils === "bigint") return resolved.listPriceFils;
  if (typeof resolved.listPriceAed === "string") return parseAedToFils(resolved.listPriceAed);
  throw new Error("resolved.listPriceFils or resolved.listPriceAed is required.");
}

function normalizeShortfallTreatment(entry) {
  const value = optionalString(
    entry.shortfallTreatment,
    entry.shortfall_treatment,
    entry.arrear_handling
  );
  if (!value) return "arrears";
  if (value.toUpperCase() === "ARREAR") return "arrears";
  return value;
}

function resolvePaymentMethod(entry) {
  return requireString(
    optionalString(
      entry.paymentMethod,
      entry.payment_method,
      entry.pay_type,
      entry.payType,
      entry.cat
    ),
    "paymentMethod"
  );
}

export function createEmployeeEntryCommercialRentPlan(input) {
  const payload = requireObject(input, "adapter input");
  const body = requireObject(payload.body, "body");
  const auth = requireObject(payload.auth, "auth");
  const resolved = requireObject(payload.resolved, "resolved");
  const ids = requireObject(payload.ids, "ids");
  const entry = requireObject(body.entry, "body.entry");
  const session = body.session && typeof body.session === "object" ? body.session : {};

  const companyId = requireString(auth.companyId, "auth.companyId");
  const propertyId = requireString(auth.propertyId, "auth.propertyId");
  const operatorId = requireString(auth.operatorId, "auth.operatorId");
  const sessionId = requireString(
    optionalString(payload.sessionId, session.id, entry.session_id),
    "sessionId"
  );
  const clientEntryId = requireString(
    optionalString(payload.clientEntryId, entry.client_entry_id, entry.id),
    "clientEntryId"
  );
  const settlementDate = requireIsoDate(
    optionalString(entry.settlement_date, session.date, payload.settlementDate),
    "settlementDate"
  );

  const idempotency = createEmployeeEntryIdempotencyKey({
    companyId,
    propertyId,
    sessionId,
    operatorId,
    clientEntryId
  });

  const entryDraft = createRentEntryDraft({
    tenantId: companyId,
    propertyId,
    sessionId,
    operatorId,
    eventType: requireString(entry.type ?? entry.eventType ?? entry.reason_code, "entry.type"),
    bed: requireString(entry.room ?? entry.bed, "entry.bed"),
    ttlockRemark: requireString(resolved.ttlockRemark, "resolved.ttlockRemark"),
    paymentMethod: resolvePaymentMethod(entry),
    paidAmountAed: requireString(entry.amount ?? entry.paidAmountAed, "entry.amount"),
    listPriceFils: resolveListPriceFils(resolved),
    periodStartDate: requireIsoDate(
      entry.period_start ?? entry.periodStartDate,
      "entry.period_start"
    ),
    cycle: requireString(entry.cycle, "entry.cycle"),
    customDays: entry.period_day_count ?? entry.customDays,
    settlementDate,
    shortfallTreatment: normalizeShortfallTreatment(entry),
    reasonCode: optionalString(entry.reason_code, entry.reasonCode),
    promiseDate: optionalString(entry.arrear_promise_date, entry.promise_date, entry.promiseDate),
    approvedBy: optionalString(entry.approved_by, entry.approvedBy)
  });

  const writePlan = createRentWritePlan(entryDraft, {
    transactionId: requireString(ids.transactionId, "ids.transactionId"),
    idempotencyKey: idempotency.key,
    receivableId: requireString(ids.receivableId, "ids.receivableId"),
    paymentId: requireString(ids.paymentId, "ids.paymentId"),
    arrearTaskId: ids.arrearTaskId,
    auditEventIds: ids.auditEventIds,
    handoverAuditEventId: requireString(ids.handoverAuditEventId, "ids.handoverAuditEventId"),
    createdAt: requireString(ids.createdAt, "ids.createdAt"),
    actorRole: requireString(auth.actorRole || "employee", "auth.actorRole"),
    bedId: requireString(resolved.bedId, "resolved.bedId")
  });

  return {
    route: "/api/employee/entry",
    mode: "commercial_rent_v1",
    idempotency,
    entryDraft,
    writePlan,
    response: {
      success: true,
      duplicateSafe: true,
      session_id: sessionId,
      client_entry_id: clientEntryId,
      idempotency_key: idempotency.key
    }
  };
}

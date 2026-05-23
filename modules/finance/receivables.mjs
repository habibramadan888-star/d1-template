import { assertFils } from "./money.mjs";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ARREARS_REASONS = new Set(["PROMISE_LATER", "PARTIAL_PAYMENT", "CASH_SHORT", "OTHER"]);
const ADJUSTMENT_REASONS = new Set(["DISCOUNT", "WAIVED", "OWNER_APPROVED", "DEPOSIT_OFFSET"]);

function assertNonNegativeFils(value, label) {
  const fils = assertFils(value);
  if (fils < 0n) throw new RangeError(`${label} must be non-negative fils.`);
  return fils;
}

function requireDate(value, label) {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }
  return value;
}

function normalizeReason(value, allowedReasons, label) {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string.`);
  const reason = value.trim().toUpperCase();
  if (!allowedReasons.has(reason)) throw new Error(`Unsupported ${label}: ${value}`);
  return reason;
}

export function evaluateReceivableSettlement(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Receivable settlement input must be an object.");
  }

  const dueFils = assertNonNegativeFils(input.dueFils, "dueFils");
  const paidFils = assertNonNegativeFils(input.paidFils, "paidFils");
  const settlementDate = requireDate(input.settlementDate, "settlementDate");

  if (paidFils === dueFils) {
    return {
      status: "SETTLED",
      dueFils,
      paidFils,
      shortfallFils: 0n,
      overpaidFils: 0n,
      settlementDate,
      arrearsTaskDraft: null,
      adjustmentDraft: null
    };
  }

  if (paidFils > dueFils) {
    return {
      status: "OVERPAID",
      dueFils,
      paidFils,
      shortfallFils: 0n,
      overpaidFils: paidFils - dueFils,
      settlementDate,
      arrearsTaskDraft: null,
      adjustmentDraft: null
    };
  }

  const shortfallFils = dueFils - paidFils;
  const treatment = String(input.shortfallTreatment || "arrears")
    .trim()
    .toLowerCase();

  if (treatment === "approved_adjustment") {
    const reasonCode = normalizeReason(input.reasonCode, ADJUSTMENT_REASONS, "adjustment reason");
    return {
      status: "APPROVED_ADJUSTMENT",
      dueFils,
      paidFils,
      shortfallFils,
      overpaidFils: 0n,
      settlementDate,
      arrearsTaskDraft: null,
      adjustmentDraft: {
        bed: input.bed || null,
        tenantSnapshot: input.tenantSnapshot || null,
        adjustmentAmountFils: shortfallFils,
        reasonCode,
        approvedBy: input.approvedBy || null,
        source: "EMPLOYEE_ENTRY"
      }
    };
  }

  if (treatment !== "arrears") {
    throw new Error(`Unsupported shortfall treatment: ${input.shortfallTreatment}`);
  }

  const reasonCode = normalizeReason(input.reasonCode, ARREARS_REASONS, "arrears reason");
  const promiseDate = requireDate(input.promiseDate, "promiseDate");

  return {
    status: "PARTIAL_ARREARS",
    dueFils,
    paidFils,
    shortfallFils,
    overpaidFils: 0n,
    settlementDate,
    arrearsTaskDraft: {
      bed: input.bed || null,
      tenantSnapshot: input.tenantSnapshot || null,
      arrearAmountFils: shortfallFils,
      arrearReason: reasonCode,
      promiseDate,
      followupStatus: "待跟进",
      source: "EMPLOYEE_ENTRY",
      createdBy: input.operatorId || null,
      createdAtDate: settlementDate
    },
    adjustmentDraft: null
  };
}

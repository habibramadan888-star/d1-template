import { normalizePaymentMethod } from "../finance/handover.mjs";
import { parseAedToFils } from "../finance/money.mjs";
import { calculateRentPeriod } from "../finance/periods.mjs";
import { evaluateReceivableSettlement } from "../finance/receivables.mjs";
import { parseTtlockRemark } from "../properties/ttlock-remark.mjs";

const RENT_EVENT_ALIASES = new Set(["R", "RENT", "收租"]);

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function normalizeRentEvent(value) {
  const eventType = requireString(value, "eventType").toUpperCase();
  if (!RENT_EVENT_ALIASES.has(eventType)) {
    throw new Error(`Unsupported employee entry event for rent draft: ${value}`);
  }
  return "RENT";
}

function assertBedMatches(inputBed, remarkBed) {
  if (!remarkBed) throw new Error("TTLock remark bed anchor is required for rent entry.");
  if (inputBed !== remarkBed) {
    throw new Error(`Input bed ${inputBed} does not match TTLock remark bed ${remarkBed}.`);
  }
}

function mapSettlementToTransactionStatus(settlementStatus) {
  if (settlementStatus === "SETTLED") return "SETTLED";
  if (settlementStatus === "PARTIAL_ARREARS") return "PARTIAL_WITH_ARREARS";
  if (settlementStatus === "APPROVED_ADJUSTMENT") return "SETTLED_WITH_ADJUSTMENT";
  if (settlementStatus === "OVERPAID") return "OVERPAID_REVIEW_REQUIRED";
  throw new Error(`Unsupported settlement status: ${settlementStatus}`);
}

export function createRentEntryDraft(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Rent entry draft input must be an object.");
  }

  const tenantId = requireString(input.tenantId, "tenantId");
  const propertyId = requireString(input.propertyId, "propertyId");
  const sessionId = requireString(input.sessionId, "sessionId");
  const operatorId = requireString(input.operatorId, "operatorId");
  const bed = requireString(input.bed, "bed");
  const eventType = normalizeRentEvent(input.eventType);
  const paymentMethod = normalizePaymentMethod(input.paymentMethod);
  const paidFils = parseAedToFils(requireString(input.paidAmountAed, "paidAmountAed"));
  const remark = parseTtlockRemark(input.ttlockRemark);

  assertBedMatches(bed, remark.bed);
  if (remark.excludedFromRentFollowup) {
    throw new Error(`TTLock remark is excluded from rent flow: ${remark.exclusionReason}`);
  }

  const period = calculateRentPeriod({
    startDate: requireString(input.periodStartDate, "periodStartDate"),
    cycle: input.cycle,
    customDays: input.customDays,
    listPriceFils: input.listPriceFils
  });

  const settlement = evaluateReceivableSettlement({
    bed,
    tenantSnapshot: remark.rawRemark,
    dueFils: period.dueFils,
    paidFils,
    settlementDate: requireString(input.settlementDate, "settlementDate"),
    shortfallTreatment: input.shortfallTreatment,
    reasonCode: input.reasonCode,
    promiseDate: input.promiseDate,
    approvedBy: input.approvedBy,
    operatorId
  });

  return {
    transactionDraft: {
      tenantId,
      propertyId,
      sessionId,
      operatorId,
      eventType,
      source: "EMPLOYEE_ENTRY",
      bed,
      tenantSnapshot: remark.rawRemark,
      ttlockRemarkRaw: remark.rawRemark,
      ttlockCheckInMonthDay: remark.checkInMonthDay,
      ttlockDepositFils: remark.depositFils,
      paymentMethod,
      paidFils,
      dueFils: period.dueFils,
      periodStartDate: period.periodStartDate,
      displayEndDate: period.displayEndDate,
      nextDueDate: period.nextDueDate,
      billingDays: period.billingDays,
      cycle: period.cycle,
      pricingRule: period.pricingRule,
      settlementStatus: mapSettlementToTransactionStatus(settlement.status),
      shortfallFils: settlement.shortfallFils,
      overpaidFils: settlement.overpaidFils
    },
    arrearsTaskDraft: settlement.arrearsTaskDraft,
    adjustmentDraft: settlement.adjustmentDraft,
    parsedRemark: remark,
    period,
    settlement
  };
}

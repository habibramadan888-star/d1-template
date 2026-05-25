import { assertFils, filsToAedString, parseAedToFils } from "./money.mjs";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

const ARREARS_REASONS = new Set(["PROMISE_LATER", "PARTIAL_PAYMENT", "CASH_SHORT", "OTHER"]);
const ADJUSTMENT_REASONS = new Set(["DISCOUNT", "WAIVED", "OWNER_APPROVED", "DEPOSIT_OFFSET"]);
const RECEIVABLE_STATUSES = new Set([
  "OPEN",
  "PARTIAL",
  "SETTLED",
  "OVERPAID",
  "VOIDED",
  "WRITTEN_OFF"
]);
const SOURCE_TYPES = new Set(["RENT", "ARREARS", "ADJUSTMENT", "TRANSFER_FEE", "DEPOSIT", "OTHER"]);

function assertNonNegativeFils(value, label) {
  const fils = assertFils(value);
  if (fils < 0n) throw new RangeError(`${label} must be non-negative fils.`);
  return fils;
}

function readFils(value, label, options = {}) {
  if (value === undefined || value === null || value === "") {
    if (Object.hasOwn(options, "defaultValue")) return options.defaultValue;
    throw new Error(`${label} is required.`);
  }
  if (typeof value === "bigint") {
    const fils = assertFils(value);
    if (fils < 0n && !options.allowNegative) {
      throw new RangeError(`${label} must be non-negative fils.`);
    }
    return fils;
  }
  if (typeof value === "string") {
    return parseAedToFils(value, { allowNegative: Boolean(options.allowNegative) });
  }
  throw new TypeError(`${label} must be bigint fils or an AED string; numbers are not authority.`);
}

function requireDate(value, label) {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }
  return value;
}

function optionalTimestamp(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !ISO_TIMESTAMP_PATTERN.test(value)) {
    throw new Error(`${label} must be an ISO timestamp string.`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function optionalString(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim();
}

function normalizeReason(value, allowedReasons, label) {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string.`);
  const reason = value.trim().toUpperCase();
  if (!allowedReasons.has(reason)) throw new Error(`Unsupported ${label}: ${value}`);
  return reason;
}

function normalizeSourceType(value) {
  const raw = String(value || "RENT")
    .trim()
    .toUpperCase();
  const aliases = new Map([
    ["R", "RENT"],
    ["RENT_DUE", "RENT"],
    ["RENT_PAYMENT", "RENT"],
    ["ARREARS_REPAYMENT", "ARREARS"],
    ["REPAYMENT", "ARREARS"],
    ["DEPOSIT_IN", "DEPOSIT"],
    ["DEPOSIT_REFUND", "DEPOSIT"],
    ["TRANSFER", "TRANSFER_FEE"]
  ]);
  const sourceType = aliases.get(raw) || raw;
  if (!SOURCE_TYPES.has(sourceType)) return "OTHER";
  return sourceType;
}

function moneyInput(input, keys) {
  for (const key of keys) {
    if (input?.[key] !== undefined && input?.[key] !== null && input?.[key] !== "") {
      return input[key];
    }
  }
  return undefined;
}

function maxZero(value) {
  return value > 0n ? value : 0n;
}

function normalizeReceivableId(input, context) {
  return (
    optionalString(input.receivableId) ||
    optionalString(input.receivable_id) ||
    optionalString(context.receivableId) ||
    optionalString(context.receivable_id) ||
    null
  );
}

function classifyBalanceStatus({ amountFils, paidFils, adjustmentFils, voidedAt }) {
  if (voidedAt) return "VOIDED";
  const appliedFils = paidFils + adjustmentFils;
  const outstandingFils = maxZero(amountFils - appliedFils);
  if (appliedFils > amountFils) return "OVERPAID";
  if (outstandingFils === 0n) return "SETTLED";
  if (paidFils > 0n || adjustmentFils > 0n) return "PARTIAL";
  return "OPEN";
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

export function computeOutstandingFils(receivable) {
  if (!receivable || typeof receivable !== "object") {
    throw new TypeError("Receivable must be an object.");
  }
  const amountFils = readFils(
    moneyInput(receivable, ["amountFils", "amount_fils", "amount_due_fils", "amountAed"]),
    "receivable amount"
  );
  const paidFils = readFils(
    moneyInput(receivable, ["paidFils", "paid_fils", "amount_paid_fils", "paidAed"]),
    "receivable paid",
    { defaultValue: 0n }
  );
  const adjustmentFils = readFils(
    moneyInput(receivable, [
      "adjustmentFils",
      "adjustment_fils",
      "approved_adjustment_fils",
      "adjustmentAed"
    ]),
    "receivable adjustment",
    { defaultValue: 0n }
  );
  return maxZero(amountFils - paidFils - adjustmentFils);
}

export function classifyReceivableStatus(receivable, businessDate) {
  const currentStatus = String(receivable?.status || "").toUpperCase();
  if (currentStatus === "VOIDED" || receivable?.voidedAt || receivable?.voided_at) return "VOIDED";
  const outstandingFils = computeOutstandingFils(receivable);
  if (outstandingFils === 0n) return "SETTLED";
  const paidFils = readFils(
    moneyInput(receivable, ["paidFils", "paid_fils", "amount_paid_fils", "paidAed"]),
    "receivable paid",
    { defaultValue: 0n }
  );
  const dueDate = requireDate(receivable.dueDate || receivable.due_date, "dueDate");
  const date = requireDate(businessDate, "businessDate");
  if (dueDate < date) return "OVERDUE";
  if (dueDate === date) return "DUE_TODAY";
  return paidFils > 0n ? "PARTIAL" : "OPEN";
}

export function buildReceivableDraft(input, context = {}) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Receivable draft input must be an object.");
  }

  const sourceType = normalizeSourceType(input.sourceType || input.source_type || input.type);
  if (sourceType === "DEPOSIT" && !context.allowDepositReceivable) {
    throw new Error("Deposit is not a rent receivable unless explicitly configured.");
  }

  const amountFils = readFils(
    moneyInput(input, ["amountFils", "amount_fils", "amount_due_fils", "amountAed", "amount"]),
    "amountFils"
  );
  const paidFils = readFils(
    moneyInput(input, ["paidFils", "paid_fils", "amount_paid_fils", "paidAed", "paid"]),
    "paidFils",
    { defaultValue: 0n }
  );
  const adjustmentFils = readFils(
    moneyInput(input, [
      "adjustmentFils",
      "adjustment_fils",
      "approved_adjustment_fils",
      "adjustmentAed"
    ]),
    "adjustmentFils",
    { defaultValue: 0n }
  );
  const dueDate = requireDate(input.dueDate || input.due_date || context.dueDate, "dueDate");
  const voidedAt = optionalTimestamp(input.voidedAt || input.voided_at, "voidedAt");
  const outstandingFils = maxZero(amountFils - paidFils - adjustmentFils);
  const overpaidFils = maxZero(paidFils + adjustmentFils - amountFils);
  const status = classifyBalanceStatus({ amountFils, paidFils, adjustmentFils, voidedAt });
  const warnings = [];

  if (overpaidFils > 0n) {
    warnings.push({
      code: "OVERPAYMENT_REVIEW_REQUIRED",
      message:
        "Paid plus adjustment exceeds receivable amount; overpayment requires separate handling.",
      overpaidFils,
      overpaidAed: filsToAedString(overpaidFils)
    });
  }

  return {
    receivableId: normalizeReceivableId(input, context),
    sourceType,
    sourceId: optionalString(input.sourceId || input.source_id),
    customerId: optionalString(input.customerId || input.customer_id),
    tenantId: optionalString(input.tenantId || input.tenant_id),
    propertyId: optionalString(input.propertyId || input.property_id || context.propertyId),
    roomId: optionalString(input.roomId || input.room_id || input.bedId || input.bed_id),
    amountFils,
    paidFils,
    adjustmentFils,
    outstandingFils,
    overpaidFils,
    status,
    dueDate,
    overdueAt: input.overdueAt || input.overdue_at || null,
    currency: String(input.currency || context.currency || "AED").toUpperCase(),
    createdAt: input.createdAt || input.created_at || context.createdAt || null,
    updatedAt: input.updatedAt || input.updated_at || context.updatedAt || null,
    voidedAt,
    voidReason: optionalString(input.voidReason || input.void_reason),
    warnings,
    metadata: input.metadata || {}
  };
}

export function validateReceivableDraft(draft) {
  const errors = [];
  const warnings = [];

  try {
    if (!draft || typeof draft !== "object") throw new TypeError("draft must be an object");
    if (!draft.receivableId) warnings.push("receivableId missing for draft-only rehearsal.");
    if (!SOURCE_TYPES.has(draft.sourceType)) errors.push("sourceType unsupported.");
    if (!draft.propertyId)
      warnings.push("propertyId missing; P0-006 tenant scope blocks production.");
    if (!draft.dueDate || !ISO_DATE_PATTERN.test(draft.dueDate)) errors.push("dueDate invalid.");
    if (draft.currency !== "AED") errors.push("currency must be AED for this rehearsal.");
    assertNonNegativeFils(draft.amountFils, "amountFils");
    assertNonNegativeFils(draft.paidFils, "paidFils");
    assertNonNegativeFils(draft.adjustmentFils, "adjustmentFils");
    assertNonNegativeFils(draft.outstandingFils, "outstandingFils");
    if (computeOutstandingFils(draft) !== draft.outstandingFils) {
      errors.push("outstandingFils does not equal amount minus paid minus adjustments.");
    }
    if (!RECEIVABLE_STATUSES.has(draft.status)) errors.push("status unsupported.");
  } catch (error) {
    errors.push(error?.message || String(error));
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function buildReceivableEvent(type, amountFils, source = {}, context = {}) {
  const eventType = requireString(type, "event type").toUpperCase();
  const amount = readFils(amountFils, "event amountFils", {
    allowNegative: Boolean(context.allowNegative)
  });
  return {
    eventType,
    receivableId: optionalString(source.receivableId || source.receivable_id),
    amountFils: amount,
    sourceType: optionalString(source.sourceType || source.source_type || source.type),
    sourceId: optionalString(source.sourceId || source.source_id || source.id),
    eventAt: context.eventAt || context.createdAt || null,
    createdBy: context.createdBy || context.operatorId || null,
    metadata: context.metadata || {}
  };
}

export function voidReceivableEvent(event, context = {}) {
  if (!event || typeof event !== "object") throw new TypeError("event must be an object.");
  return {
    ...event,
    eventType: `${String(event.eventType || "EVENT").toUpperCase()}_VOIDED`,
    voidedAt: context.voidedAt || context.eventAt || null,
    voidedBy: context.voidedBy || context.operatorId || null,
    voidReason: requireString(context.voidReason || "voided during rehearsal", "voidReason")
  };
}

export function applyPaymentAllocation(receivable, payment, context = {}) {
  const amountFils = readFils(
    moneyInput(payment, ["amountFils", "allocatedFils", "amount_fils", "amountAed", "amount"]),
    "payment amountFils"
  );
  const paymentVoided =
    Boolean(payment?.voidedAt || payment?.voided_at) ||
    String(payment?.status || "").toUpperCase() === "VOIDED";
  const base = buildReceivableDraft(receivable, { allowDepositReceivable: true });
  const allocationId = optionalString(payment?.allocationId || payment?.allocation_id);
  const paymentSourceId = optionalString(payment?.paymentSourceId || payment?.payment_source_id);

  if (paymentVoided) {
    return {
      receivable: base,
      allocationDraft: {
        allocationId,
        receivableId: base.receivableId,
        paymentSourceType: optionalString(
          payment?.paymentSourceType || payment?.payment_source_type
        ),
        paymentSourceId,
        allocatedFils: 0n,
        status: "VOIDED_IGNORED",
        allocatedAt: context.allocatedAt || null
      },
      event: null,
      warnings: [
        {
          code: "VOIDED_PAYMENT_IGNORED",
          message: "Voided payment does not reduce active receivable outstanding."
        }
      ]
    };
  }

  const allocatedFils = amountFils > base.outstandingFils ? base.outstandingFils : amountFils;
  const overpaidFils = amountFils > base.outstandingFils ? amountFils - base.outstandingFils : 0n;
  const updated = buildReceivableDraft(
    {
      ...base,
      paidFils: base.paidFils + allocatedFils,
      amountFils: base.amountFils,
      adjustmentFils: base.adjustmentFils,
      dueDate: base.dueDate,
      sourceType: base.sourceType
    },
    { allowDepositReceivable: true }
  );
  updated.overpaidFils += overpaidFils;
  if (overpaidFils > 0n) {
    updated.status = "OVERPAID";
    updated.warnings.push({
      code: "PAYMENT_OVERPAYMENT_REVIEW_REQUIRED",
      message:
        "Payment exceeds open receivable outstanding; extra amount must be handled separately.",
      overpaidFils,
      overpaidAed: filsToAedString(overpaidFils)
    });
  }

  return {
    receivable: updated,
    allocationDraft: {
      allocationId,
      receivableId: base.receivableId,
      paymentSourceType: optionalString(payment?.paymentSourceType || payment?.payment_source_type),
      paymentSourceId,
      allocatedFils,
      status: allocatedFils > 0n ? "POSTED" : "NO_OPEN_BALANCE",
      allocatedAt: context.allocatedAt || null
    },
    event: buildReceivableEvent(
      "PAYMENT_ALLOCATED",
      allocatedFils,
      {
        receivableId: base.receivableId,
        sourceType: payment?.paymentSourceType || payment?.payment_source_type,
        sourceId: paymentSourceId
      },
      context
    ),
    warnings: updated.warnings
  };
}

export function applyReceivableAdjustment(receivable, adjustment, context = {}) {
  const amountFils = readFils(
    moneyInput(adjustment, ["amountFils", "adjustmentFils", "amount_fils", "amountAed", "amount"]),
    "adjustment amountFils"
  );
  const type = String(adjustment?.adjustmentType || adjustment?.adjustment_type || "CREDIT")
    .trim()
    .toUpperCase();
  const base = buildReceivableDraft(receivable, { allowDepositReceivable: true });
  const nextAmountFils = type === "DEBIT" ? base.amountFils + amountFils : base.amountFils;
  const nextAdjustmentFils =
    type === "DEBIT" ? base.adjustmentFils : base.adjustmentFils + amountFils;

  const updated = buildReceivableDraft(
    {
      ...base,
      adjustmentFils: nextAdjustmentFils,
      amountFils: nextAmountFils,
      paidFils: base.paidFils,
      dueDate: base.dueDate,
      sourceType: base.sourceType
    },
    { allowDepositReceivable: true }
  );

  return {
    receivable: updated,
    adjustmentDraft: {
      adjustmentId: optionalString(adjustment?.adjustmentId || adjustment?.adjustment_id),
      receivableId: base.receivableId,
      adjustmentType: type,
      amountFils,
      reason: optionalString(adjustment?.reason || adjustment?.reason_code),
      createdAt: context.createdAt || null,
      createdBy: context.createdBy || context.operatorId || null
    },
    event: buildReceivableEvent(
      type === "DEBIT" ? "ADJUSTMENT_DEBIT" : "ADJUSTMENT_CREDIT",
      amountFils,
      { receivableId: base.receivableId, sourceType: "ADJUSTMENT" },
      context
    )
  };
}

function readLegacyOutstandingFils(row) {
  const explicit = moneyInput(row, [
    "amount_remaining_fils",
    "remainingFils",
    "outstandingFils",
    "remain",
    "remaining",
    "outstanding"
  ]);
  if (explicit !== undefined) return readFils(explicit, "legacy outstanding");
  const due = readFils(
    moneyInput(row, [
      "arrear_amount_fils",
      "amount_due_fils",
      "amountDueFils",
      "arrear_amount",
      "due"
    ]),
    "legacy due",
    { defaultValue: 0n }
  );
  const paid = readFils(
    moneyInput(row, [
      "actual_received_fils",
      "amount_paid_fils",
      "paidFils",
      "actual_received",
      "paid"
    ]),
    "legacy paid",
    { defaultValue: 0n }
  );
  return maxZero(due - paid);
}

export function compareLegacyArrearsToReceivable(legacyArrears, receivable) {
  const legacyOutstandingFils = readLegacyOutstandingFils(legacyArrears || {});
  const receivableOutstandingFils = computeOutstandingFils(receivable);
  const deltaFils = legacyOutstandingFils - receivableOutstandingFils;
  return {
    legacyOutstandingFils,
    receivableOutstandingFils,
    deltaFils,
    legacyOutstandingAed: filsToAedString(legacyOutstandingFils),
    receivableOutstandingAed: filsToAedString(receivableOutstandingFils),
    deltaAed: filsToAedString(deltaFils),
    status: deltaFils === 0n ? "MATCH" : "MISMATCH"
  };
}

export function buildReceivablesFromLegacyRows(rows, context = {}) {
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array.");
  const receivables = [];
  const warnings = [];
  const errors = [];

  rows.forEach((row, index) => {
    const sourceType = normalizeSourceType(
      row?.sourceType || row?.source_type || row?.type || row?.category
    );
    if (sourceType === "DEPOSIT" && !context.includeDepositReceivables) {
      warnings.push({
        code: "DEPOSIT_NOT_RECEIVABLE",
        rowId: row?.id || `row-${index}`,
        message:
          "Deposit row skipped; deposits are not rent receivables without explicit configuration."
      });
      return;
    }

    try {
      receivables.push(
        buildReceivableDraft(
          {
            receivableId:
              row?.receivable_id || row?.receivableId || `draft_receivable_${index + 1}`,
            sourceType,
            sourceId: row?.source_id || row?.id || row?.task_id || `legacy-${index + 1}`,
            customerId: row?.customer_id || row?.tenant_card_id,
            tenantId: row?.tenant_id,
            propertyId: row?.property_id || context.propertyId || "local-staging-property",
            roomId: row?.room_id || row?.bed_id || row?.bed,
            amountFils: moneyInput(row, [
              "amount_due_fils",
              "amountFils",
              "dueFils",
              "arrear_amount",
              "due",
              "amount"
            ]),
            paidFils: moneyInput(row, [
              "amount_paid_fils",
              "paidFils",
              "actual_received",
              "paid",
              "paid_amount"
            ]),
            dueDate: row?.due_date || row?.dueDate || context.businessDate,
            voidedAt: row?.voided_at || row?.voidedAt,
            currency: row?.currency || "AED"
          },
          { ...context, allowDepositReceivable: Boolean(context.includeDepositReceivables) }
        )
      );
    } catch (error) {
      errors.push({
        code: "LEGACY_ROW_RECEIVABLE_DRAFT_FAILED",
        rowId: row?.id || row?.task_id || `row-${index}`,
        message: error?.message || String(error)
      });
    }
  });

  return { receivables, warnings, errors };
}

export function buildDashboardReceivableTotals(receivables, options = {}) {
  if (!Array.isArray(receivables)) throw new TypeError("receivables must be an array.");
  const businessDate = requireDate(options.businessDate, "businessDate");
  const totals = {
    receivableCount: receivables.length,
    activeReceivableCount: 0,
    voidedReceivableCount: 0,
    rentDueFils: 0n,
    rentReceivedFils: 0n,
    dueTodayFils: 0n,
    overdueFils: 0n,
    arrearsTotalFils: 0n,
    arrearsOutstandingFils: 0n,
    adjustmentFils: 0n,
    warnings: []
  };

  for (const receivable of receivables) {
    const draft = buildReceivableDraft(receivable, { allowDepositReceivable: true });
    if (draft.status === "VOIDED") {
      totals.voidedReceivableCount += 1;
      totals.warnings.push({
        code: "VOIDED_RECEIVABLE_EXCLUDED",
        receivableId: draft.receivableId,
        message: "Voided receivable excluded from active dashboard authority totals."
      });
      continue;
    }
    totals.activeReceivableCount += 1;
    if (draft.sourceType === "RENT" || draft.sourceType === "ARREARS") {
      totals.rentDueFils += draft.amountFils;
      totals.rentReceivedFils += draft.paidFils;
    }
    totals.adjustmentFils += draft.adjustmentFils;
    if (draft.outstandingFils <= 0n) continue;
    if (draft.dueDate === businessDate) totals.dueTodayFils += draft.outstandingFils;
    if (draft.dueDate < businessDate) totals.overdueFils += draft.outstandingFils;
    if (draft.dueDate <= businessDate) {
      totals.arrearsTotalFils += draft.outstandingFils;
      totals.arrearsOutstandingFils += draft.outstandingFils;
    }
  }

  return totals;
}

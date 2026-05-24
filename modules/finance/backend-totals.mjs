import { addFils, assertFils, filsToAedString, parseAedToFils, subtractFils } from "./money.mjs";
import { normalizeHandoverCategory, normalizePaymentMethod } from "./handover.mjs";

const INCOME_CATEGORIES = new Set(["rent", "deposit_in", "arrears", "transfer_fee"]);
const OUTFLOW_CATEGORIES = new Set(["deposit_refund", "expense"]);
const CLOSED_ARREAR_STATUSES = new Set([
  "PAID",
  "CLEARED",
  "CLOSED",
  "VOID",
  "VOIDED",
  "WRITTEN_OFF",
  "WAIVED",
  "SETTLED",
  "已结清",
  "结清",
  "作废"
]);

function createAccumulator() {
  return {
    cashTotalFils: 0n,
    cashOutflowFils: 0n,
    cashHandoverFils: 0n,
    bankTransferTotalFils: 0n,
    bankTransferOutFils: 0n,
    bankTransferCount: 0,
    grossReceivedFils: 0n,
    rentReceivedFils: 0n,
    depositReceivedFils: 0n,
    arrearsPaidFils: 0n,
    transferFeeFils: 0n,
    refundFils: 0n,
    expenseFils: 0n,
    sessionTotalFils: 0n,
    handoverTotalFils: 0n,
    arrearsOutstandingFils: 0n,
    rowCount: 0,
    includedRowCount: 0,
    excludedVoidedRowCount: 0,
    warnings: [],
    errors: []
  };
}

function pushIssue(target, issue) {
  target.push({
    code: issue.code,
    field: issue.field || "",
    rowId: issue.rowId || "",
    message: issue.message,
    value: issue.value
  });
}

function rowId(row, index) {
  return String(row?.id ?? row?.entry_id ?? row?.task_id ?? row?.ledger_id ?? `row-${index}`);
}

function isVoided(row) {
  if (!row || typeof row !== "object") return false;
  if (row.voided_at) return true;
  if (String(row.status || "").toUpperCase() === "VOIDED") return true;
  if (String(row.close_status || "").toUpperCase() === "VOIDED") return true;
  return false;
}

function pickCategory(row) {
  return row?.category ?? row?.event_type ?? row?.type ?? row?.code ?? row?.tx_type ?? row?.cat;
}

function pickPaymentMethod(row) {
  const candidate =
    row?.paymentMethod ??
    row?.payment_method ??
    row?.pay_type ??
    row?.payment ??
    row?.payMethod ??
    row?.pay;
  if (candidate !== undefined && candidate !== null && candidate !== "") return candidate;
  const cat = String(row?.cat ?? "")
    .trim()
    .toUpperCase();
  if (["C", "CASH", "B", "BANK", "TRANSFER"].includes(cat)) return row.cat;
  return undefined;
}

function addIssueList(target, source) {
  for (const issue of source || []) pushIssue(target, issue);
}

export function normalizeLegacyAmountToFils(value, context = {}) {
  const field = context.field || "amount";
  const rowIdValue = context.rowId || "";
  const warnings = [];
  const errors = [];

  if (value === null || value === undefined || value === "") {
    pushIssue(errors, {
      code: "MISSING_AMOUNT",
      field,
      rowId: rowIdValue,
      value,
      message: `Missing money value for ${field}.`
    });
    return { ok: false, fils: null, aed: null, legacy: true, warnings, errors };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      pushIssue(errors, {
        code: "INVALID_NUMBER_AMOUNT",
        field,
        rowId: rowIdValue,
        value,
        message: `Invalid numeric money value for ${field}.`
      });
      return { ok: false, fils: null, aed: null, legacy: true, warnings, errors };
    }
    warnings.push({
      code: "LEGACY_NUMBER_AMOUNT",
      field,
      rowId: rowIdValue,
      value,
      message: `Legacy numeric money value converted for ${field}; future authority must be string or integer fils.`
    });
  } else {
    warnings.push({
      code: "LEGACY_DECIMAL_AMOUNT",
      field,
      rowId: rowIdValue,
      value,
      message: `Legacy decimal money value converted for ${field}.`
    });
  }

  const raw = String(value).trim();
  try {
    const fils = parseAedToFils(raw, { allowNegative: Boolean(context.allowNegative) });
    return {
      ok: true,
      fils,
      aed: filsToAedString(fils),
      legacy: true,
      warnings,
      errors
    };
  } catch (error) {
    pushIssue(errors, {
      code: "INVALID_AMOUNT",
      field,
      rowId: rowIdValue,
      value,
      message: error?.message || String(error)
    });
    return { ok: false, fils: null, aed: null, legacy: true, warnings, errors };
  }
}

function addTo(summary, key, fils) {
  summary[key] = addFils([summary[key], fils]);
}

function normalizeTransactionRow(row, index) {
  const id = rowId(row, index);
  const category = normalizeHandoverCategory(pickCategory(row));
  const paymentMethod = normalizePaymentMethod(pickPaymentMethod(row));
  const amount = normalizeLegacyAmountToFils(row.amount ?? row.paid, {
    field: "amount",
    rowId: id,
    allowNegative: Boolean(row.allowNegative)
  });
  return { id, category, paymentMethod, amount };
}

export function computeHandoverTotalsFils(rows, options = {}) {
  if (!Array.isArray(rows)) throw new TypeError("Rows must be an array.");
  const summary = createAccumulator();
  const includeVoided = Boolean(options.includeVoided);

  rows.forEach((row, index) => {
    summary.rowCount += 1;
    const id = rowId(row, index);
    if (isVoided(row) && !includeVoided) {
      summary.excludedVoidedRowCount += 1;
      summary.warnings.push({
        code: "VOIDED_ROW_EXCLUDED",
        rowId: id,
        message: "Voided row excluded from active totals."
      });
      return;
    }

    try {
      const normalized = normalizeTransactionRow(row, index);
      addIssueList(summary.warnings, normalized.amount.warnings);
      addIssueList(summary.errors, normalized.amount.errors);
      if (!normalized.amount.ok) return;
      const amountFils = normalized.amount.fils;
      if (amountFils < 0n) {
        pushIssue(summary.errors, {
          code: "NEGATIVE_TRANSACTION_AMOUNT",
          rowId: id,
          field: "amount",
          value: row.amount,
          message: "Negative transaction amount is not accepted for backend active totals."
        });
        return;
      }

      summary.includedRowCount += 1;
      if (normalized.category === "rent") addTo(summary, "rentReceivedFils", amountFils);
      if (normalized.category === "deposit_in") addTo(summary, "depositReceivedFils", amountFils);
      if (normalized.category === "arrears") addTo(summary, "arrearsPaidFils", amountFils);
      if (normalized.category === "transfer_fee") addTo(summary, "transferFeeFils", amountFils);
      if (normalized.category === "deposit_refund") addTo(summary, "refundFils", amountFils);
      if (normalized.category === "expense") addTo(summary, "expenseFils", amountFils);

      if (INCOME_CATEGORIES.has(normalized.category)) {
        addTo(summary, "grossReceivedFils", amountFils);
        addTo(summary, "sessionTotalFils", amountFils);
        addTo(summary, "handoverTotalFils", amountFils);
        if (normalized.paymentMethod === "cash") addTo(summary, "cashTotalFils", amountFils);
        if (normalized.paymentMethod === "bank") {
          addTo(summary, "bankTransferTotalFils", amountFils);
          if (amountFils > 0n) summary.bankTransferCount += 1;
        }
      } else if (OUTFLOW_CATEGORIES.has(normalized.category)) {
        addTo(summary, "sessionTotalFils", -amountFils);
        addTo(summary, "handoverTotalFils", -amountFils);
        if (normalized.paymentMethod === "cash") addTo(summary, "cashOutflowFils", amountFils);
        if (normalized.paymentMethod === "bank") addTo(summary, "bankTransferOutFils", amountFils);
      }
    } catch (error) {
      pushIssue(summary.errors, {
        code: "ROW_NORMALIZATION_ERROR",
        rowId: id,
        message: error?.message || String(error)
      });
    }
  });

  summary.cashHandoverFils = subtractFils(summary.cashTotalFils, summary.cashOutflowFils);
  return summary;
}

export function computeCashTotalFils(rows, options = {}) {
  return computeHandoverTotalsFils(rows, options).cashTotalFils;
}

export function computeBankTransferTotalFils(rows, options = {}) {
  return computeHandoverTotalsFils(rows, options).bankTransferTotalFils;
}

export function computeGrossReceivedFils(rows, options = {}) {
  return computeHandoverTotalsFils(rows, options).grossReceivedFils;
}

export function computeDepositTotalFils(rows, options = {}) {
  return computeHandoverTotalsFils(rows, options).depositReceivedFils;
}

export function computeArrearsPaidFils(rows, options = {}) {
  return computeHandoverTotalsFils(rows, options).arrearsPaidFils;
}

function isClosedArrear(row) {
  const status = String(row?.close_status ?? row?.followup_status ?? row?.status ?? "").trim();
  return CLOSED_ARREAR_STATUSES.has(status.toUpperCase()) || CLOSED_ARREAR_STATUSES.has(status);
}

export function computeArrearsOutstandingFils(rows, options = {}) {
  if (!Array.isArray(rows)) throw new TypeError("Rows must be an array.");
  const includeVoided = Boolean(options.includeVoided);
  const result = {
    arrearsOutstandingFils: 0n,
    rowCount: rows.length,
    includedRowCount: 0,
    excludedVoidedRowCount: 0,
    warnings: [],
    errors: []
  };

  rows.forEach((row, index) => {
    const id = rowId(row, index);
    if (isVoided(row) && !includeVoided) {
      result.excludedVoidedRowCount += 1;
      result.warnings.push({
        code: "VOIDED_ARREAR_EXCLUDED",
        rowId: id,
        message: "Voided arrear row excluded from active outstanding total."
      });
      return;
    }
    if (isClosedArrear(row)) return;

    const explicitRemain = row.remain ?? row.remaining ?? row.amount_remaining;
    let remain;
    if (explicitRemain !== undefined && explicitRemain !== null && explicitRemain !== "") {
      remain = normalizeLegacyAmountToFils(explicitRemain, { field: "remain", rowId: id });
    } else {
      const due = normalizeLegacyAmountToFils(row.arrear_amount ?? row.amount_due ?? "0", {
        field: "arrear_amount",
        rowId: id
      });
      const received = normalizeLegacyAmountToFils(row.actual_received ?? row.amount_paid ?? "0", {
        field: "actual_received",
        rowId: id
      });
      addIssueList(result.warnings, due.warnings);
      addIssueList(result.warnings, received.warnings);
      addIssueList(result.errors, due.errors);
      addIssueList(result.errors, received.errors);
      if (!due.ok || !received.ok) return;
      remain = {
        ok: true,
        fils: due.fils - received.fils,
        warnings: [],
        errors: []
      };
    }

    addIssueList(result.warnings, remain.warnings);
    addIssueList(result.errors, remain.errors);
    if (!remain.ok) return;
    if (remain.fils <= 0n) return;
    result.includedRowCount += 1;
    result.arrearsOutstandingFils += remain.fils;
  });

  return result;
}

export function computeSessionTotalsFils(rows, options = {}) {
  const transactionTotals = computeHandoverTotalsFils(rows, options);
  const comparison = options.frontendTotals
    ? compareFrontendTotalsToBackend(options.frontendTotals, transactionTotals)
    : null;
  return { ...transactionTotals, comparison };
}

export function computeDashboardTotalsFils(rows, options = {}) {
  const transactionTotals = computeHandoverTotalsFils(rows, options);
  const arrears = computeArrearsOutstandingFils(options.arrearsRows || [], options);
  return {
    ...transactionTotals,
    arrearsOutstandingFils: arrears.arrearsOutstandingFils,
    warnings: [...transactionTotals.warnings, ...arrears.warnings],
    errors: [...transactionTotals.errors, ...arrears.errors],
    arrearsRowCount: arrears.rowCount,
    arrearsIncludedRowCount: arrears.includedRowCount
  };
}

function firstFrontendValue(frontendTotals, keys) {
  return keys.map((key) => frontendTotals?.[key]).find((item) => item !== undefined);
}

function frontendMoney(frontendTotals, keys, field, allowNegative = false) {
  const value = keys.map((key) => frontendTotals?.[key]).find((item) => item !== undefined);
  return normalizeLegacyAmountToFils(value ?? "0", { field, allowNegative });
}

export function compareFrontendTotalsToBackend(frontendTotals, backendTotals) {
  const comparisons = [];
  const warnings = [];
  const errors = [];

  const moneyComparisons = [
    {
      field: "cash_handover",
      keys: ["cash_handover", "cashHandover", "cashHandoverAed"],
      backendKey: "cashHandoverFils",
      allowNegative: true
    },
    {
      field: "bank_transfer_total",
      keys: ["bank_transfer_total", "bankTransferTotal", "bankTransferAed"],
      backendKey: "bankTransferTotalFils"
    },
    {
      field: "gross_received",
      keys: ["gross_received", "grossReceived", "grossReceivedAed"],
      backendKey: "grossReceivedFils"
    },
    {
      field: "session_total",
      keys: ["session_total", "sessionTotal", "handover_total", "handoverTotal"],
      backendKey: "sessionTotalFils"
    }
  ];

  for (const item of moneyComparisons) {
    if (firstFrontendValue(frontendTotals, item.keys) === undefined) continue;
    const parsed = frontendMoney(frontendTotals, item.keys, item.field, item.allowNegative);
    addIssueList(warnings, parsed.warnings);
    addIssueList(errors, parsed.errors);
    if (!parsed.ok) {
      comparisons.push({ field: item.field, matches: false, error: true });
      continue;
    }
    const backendFils = assertFils(backendTotals[item.backendKey] ?? 0n);
    comparisons.push({
      field: item.field,
      submittedFils: parsed.fils,
      backendFils,
      submittedAed: filsToAedString(parsed.fils),
      backendAed: filsToAedString(backendFils),
      deltaFils: parsed.fils - backendFils,
      deltaAed: filsToAedString(parsed.fils - backendFils),
      matches: parsed.fils === backendFils
    });
  }

  const submittedBankCount = Number(
    frontendTotals?.bank_transfer_count ?? frontendTotals?.bankTransferCount ?? 0
  );
  const backendBankCount = Number(backendTotals.bankTransferCount || 0);
  comparisons.push({
    field: "bank_transfer_count",
    submittedCount: submittedBankCount,
    backendCount: backendBankCount,
    deltaCount: submittedBankCount - backendBankCount,
    matches: submittedBankCount === backendBankCount
  });

  return {
    matches: comparisons.every((item) => item.matches) && errors.length === 0,
    comparisons,
    warnings,
    errors
  };
}

export function formatTotalsForReport(totals) {
  const formatted = {};
  for (const [key, value] of Object.entries(totals || {})) {
    if (typeof value === "bigint") formatted[key.replace(/Fils$/, "Aed")] = filsToAedString(value);
    else if (Array.isArray(value)) formatted[key] = value;
    else if (value && typeof value === "object") formatted[key] = value;
    else formatted[key] = value;
  }
  return formatted;
}

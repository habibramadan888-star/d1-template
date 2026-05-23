import { addFils, assertFils } from "./money.mjs";

const CATEGORY_ALIASES = new Map([
  ["R", "rent"],
  ["RENT", "rent"],
  ["RENT_INCOME", "rent"],
  ["租金", "rent"],
  ["收租", "rent"],
  ["D", "deposit_in"],
  ["DEPOSIT", "deposit_in"],
  ["DEPOSIT_IN", "deposit_in"],
  ["押金", "deposit_in"],
  ["收押金", "deposit_in"],
  ["AP", "arrears"],
  ["ARREARS", "arrears"],
  ["ARREARS_PAYMENT", "arrears"],
  ["欠款", "arrears"],
  ["还欠款", "arrears"],
  ["欠款回收", "arrears"],
  ["TF", "transfer_fee"],
  ["TRANSFER_FEE", "transfer_fee"],
  ["换床费", "transfer_fee"],
  ["DR", "deposit_refund"],
  ["DEPOSIT_REFUND", "deposit_refund"],
  ["退押金", "deposit_refund"],
  ["押金退款", "deposit_refund"],
  ["E", "expense"],
  ["EXPENSE", "expense"],
  ["支出", "expense"],
  ["其他支出", "expense"]
]);

const PAYMENT_ALIASES = new Map([
  ["C", "cash"],
  ["CASH", "cash"],
  ["现金", "cash"],
  ["B", "bank"],
  ["BANK", "bank"],
  ["银行", "bank"],
  ["银行转账", "bank"],
  ["TRANSFER", "bank"]
]);

const INCOME_CATEGORIES = new Set(["rent", "deposit_in", "arrears", "transfer_fee"]);
const CASH_OUT_CATEGORIES = new Set(["deposit_refund", "expense"]);

function normalizeAlias(value, aliases, label) {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string.`);
  const key = value.trim().toUpperCase();
  const normalized = aliases.get(key);
  if (!normalized) throw new Error(`Unsupported ${label}: ${value}`);
  return normalized;
}

export function normalizeHandoverCategory(value) {
  return normalizeAlias(value, CATEGORY_ALIASES, "handover category");
}

export function normalizePaymentMethod(value) {
  return normalizeAlias(value, PAYMENT_ALIASES, "payment method");
}

function assertNonNegativeFils(value) {
  const fils = assertFils(value);
  if (fils < 0n) throw new RangeError("Handover entry amount must be non-negative fils.");
  return fils;
}

function addTo(summary, key, amountFils) {
  summary[key] = addFils([summary[key], amountFils]);
}

export function computeHandoverSummary(entries) {
  if (!Array.isArray(entries)) throw new TypeError("Handover entries must be an array.");

  const summary = {
    cashInflowFils: 0n,
    cashOutflowFils: 0n,
    cashHandoverFils: 0n,
    bankTransferInFils: 0n,
    bankTransferInCount: 0,
    bankTransferOutFils: 0n,
    bankTransferOutCount: 0,
    grossReceivedFils: 0n,
    rentIncomeFils: 0n,
    depositInFils: 0n,
    arrearsRecoveryFils: 0n,
    transferFeeIncomeFils: 0n,
    depositRefundFils: 0n,
    expenseFils: 0n
  };

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      throw new TypeError("Each handover entry must be an object.");
    }

    const category = normalizeHandoverCategory(entry.category ?? entry.type ?? entry.code);
    const paymentMethod = normalizePaymentMethod(
      entry.paymentMethod ?? entry.payment ?? entry.payMethod ?? entry.pay
    );
    const amountFils = assertNonNegativeFils(entry.amountFils);

    if (category === "rent") addTo(summary, "rentIncomeFils", amountFils);
    if (category === "deposit_in") addTo(summary, "depositInFils", amountFils);
    if (category === "arrears") addTo(summary, "arrearsRecoveryFils", amountFils);
    if (category === "transfer_fee") addTo(summary, "transferFeeIncomeFils", amountFils);
    if (category === "deposit_refund") addTo(summary, "depositRefundFils", amountFils);
    if (category === "expense") addTo(summary, "expenseFils", amountFils);

    if (INCOME_CATEGORIES.has(category)) {
      addTo(summary, "grossReceivedFils", amountFils);
      if (paymentMethod === "cash") addTo(summary, "cashInflowFils", amountFils);
      if (paymentMethod === "bank") {
        addTo(summary, "bankTransferInFils", amountFils);
        summary.bankTransferInCount += amountFils > 0n ? 1 : 0;
      }
      continue;
    }

    if (CASH_OUT_CATEGORIES.has(category)) {
      if (paymentMethod === "cash") addTo(summary, "cashOutflowFils", amountFils);
      if (paymentMethod === "bank") {
        addTo(summary, "bankTransferOutFils", amountFils);
        summary.bankTransferOutCount += amountFils > 0n ? 1 : 0;
      }
      continue;
    }

    throw new Error(`Unsupported handover category after normalization: ${category}`);
  }

  summary.cashHandoverFils = summary.cashInflowFils - summary.cashOutflowFils;
  return summary;
}

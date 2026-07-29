import { computeHandoverSummary } from "./handover.mjs";
import { filsToAedString, parseAedToFils } from "./money.mjs";

function moneyValueToString(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    throw new Error(`Missing money value for ${fieldName}.`);
  }
  return String(value).trim().replaceAll(",", "");
}

function parseLegacyMoneyToFils(value, fieldName, options = {}) {
  return parseAedToFils(moneyValueToString(value, fieldName), options);
}

export function transactionToShadowHandoverEntry(transaction) {
  if (!transaction || typeof transaction !== "object") {
    throw new TypeError("Transaction must be an object.");
  }
  const category =
    transaction.category ??
    transaction.event_type ??
    transaction.type ??
    transaction.code ??
    transaction.tx_type;
  const paymentMethod =
    transaction.paymentMethod ??
    transaction.payment_method ??
    transaction.payment ??
    transaction.payMethod ??
    transaction.pay ??
    transaction.cat;

  return {
    category,
    paymentMethod,
    amountFils: parseLegacyMoneyToFils(transaction.amount, "transaction.amount")
  };
}

export function computeShadowTotalsFromTransactions(transactions) {
  if (!Array.isArray(transactions)) {
    throw new TypeError("Transactions must be an array.");
  }
  return computeHandoverSummary(transactions.map(transactionToShadowHandoverEntry));
}

export function compareSessionTotalsShadow({ session, transactions }) {
  if (!session || typeof session !== "object") throw new TypeError("Session must be an object.");
  const recomputed = computeShadowTotalsFromTransactions(transactions);
  const submitted = {
    cashHandoverFils: parseLegacyMoneyToFils(
      session.cash_handover ?? "0",
      "session.cash_handover",
      {
        allowNegative: true
      }
    ),
    bankTransferInFils: parseLegacyMoneyToFils(
      session.bank_transfer_total ?? "0",
      "session.bank_transfer_total"
    ),
    grossReceivedFils: parseLegacyMoneyToFils(
      session.gross_received ?? "0",
      "session.gross_received"
    ),
    bankTransferInCount: Number(session.bank_transfer_count ?? 0)
  };

  const comparisons = [
    {
      field: "cash_handover",
      submittedFils: submitted.cashHandoverFils,
      recomputedFils: recomputed.cashHandoverFils
    },
    {
      field: "bank_transfer_total",
      submittedFils: submitted.bankTransferInFils,
      recomputedFils: recomputed.bankTransferInFils
    },
    {
      field: "gross_received",
      submittedFils: submitted.grossReceivedFils,
      recomputedFils: recomputed.grossReceivedFils
    },
    {
      field: "bank_transfer_count",
      submittedCount: submitted.bankTransferInCount,
      recomputedCount: recomputed.bankTransferInCount
    }
  ];

  return {
    matches: comparisons.every((item) =>
      item.field === "bank_transfer_count"
        ? item.submittedCount === item.recomputedCount
        : item.submittedFils === item.recomputedFils
    ),
    submitted,
    recomputed,
    comparisons: comparisons.map((item) =>
      item.field === "bank_transfer_count"
        ? {
            ...item,
            matches: item.submittedCount === item.recomputedCount
          }
        : {
            ...item,
            submittedAed: filsToAedString(item.submittedFils),
            recomputedAed: filsToAedString(item.recomputedFils),
            deltaFils: item.submittedFils - item.recomputedFils,
            matches: item.submittedFils === item.recomputedFils
          }
    )
  };
}

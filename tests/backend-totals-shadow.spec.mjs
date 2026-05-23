import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareSessionTotalsShadow,
  computeShadowTotalsFromTransactions,
  transactionToShadowHandoverEntry
} from "../modules/finance/shadow-totals.mjs";
import { filsToAedString } from "../modules/finance/money.mjs";

test("computeShadowTotalsFromTransactions recomputes handover core totals from accepted rows", () => {
  const summary = computeShadowTotalsFromTransactions([
    { type: "R", cat: "cash", amount: "640.00" },
    { type: "D", cat: "bank", amount: "200.00" },
    { type: "AP", cat: "C", amount: "100.00" },
    { type: "DR", cat: "cash", amount: "50.00" },
    { type: "E", cat: "cash", amount: "10.00" }
  ]);

  assert.equal(filsToAedString(summary.cashHandoverFils), "680.00");
  assert.equal(filsToAedString(summary.bankTransferInFils), "200.00");
  assert.equal(summary.bankTransferInCount, 1);
  assert.equal(filsToAedString(summary.grossReceivedFils), "940.00");
});

test("compareSessionTotalsShadow reports matches without changing submitted totals", () => {
  const result = compareSessionTotalsShadow({
    session: {
      cash_handover: "680.00",
      bank_transfer_total: "200.00",
      bank_transfer_count: 1,
      gross_received: "940.00"
    },
    transactions: [
      { category: "rent", payment_method: "cash", amount: "640.00" },
      { category: "deposit_in", payment_method: "bank", amount: "200.00" },
      { category: "arrears", payment_method: "cash", amount: "100.00" },
      { category: "deposit_refund", payment_method: "cash", amount: "50.00" },
      { category: "expense", payment_method: "cash", amount: "10.00" }
    ]
  });

  assert.equal(result.matches, true);
  assert.equal(
    result.comparisons.every((item) => item.matches),
    true
  );
});

test("compareSessionTotalsShadow detects frontend-submitted total mismatch", () => {
  const result = compareSessionTotalsShadow({
    session: {
      cash_handover: "999.00",
      bank_transfer_total: "200.00",
      bank_transfer_count: 1,
      gross_received: "940.00"
    },
    transactions: [
      { type: "R", cat: "cash", amount: "640.00" },
      { type: "D", cat: "bank", amount: "200.00" },
      { type: "AP", cat: "cash", amount: "100.00" },
      { type: "DR", cat: "cash", amount: "50.00" },
      { type: "E", cat: "cash", amount: "10.00" }
    ]
  });

  const cash = result.comparisons.find((item) => item.field === "cash_handover");
  assert.equal(result.matches, false);
  assert.equal(cash.matches, false);
  assert.equal(cash.recomputedAed, "680.00");
});

test("transactionToShadowHandoverEntry rejects unsafe money values", () => {
  assert.throws(
    () => transactionToShadowHandoverEntry({ type: "R", cat: "cash", amount: "100.999" }),
    /Invalid AED amount/
  );
  assert.throws(
    () => transactionToShadowHandoverEntry({ type: "R", cat: "cash", amount: "not-money" }),
    /Invalid AED amount/
  );
});

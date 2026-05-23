import assert from "node:assert/strict";
import test from "node:test";

import { computeHandoverSummary } from "../modules/finance/handover.mjs";
import { formatFilsAsAed, parseAedToFils } from "../modules/finance/money.mjs";

function fils(value) {
  return parseAedToFils(value);
}

test("computeHandoverSummary calculates handover core metrics in integer fils", () => {
  const summary = computeHandoverSummary([
    { category: "R", paymentMethod: "C", amountFils: fils("640.00") },
    { category: "D", paymentMethod: "B", amountFils: fils("500.00") },
    { category: "AP", paymentMethod: "cash", amountFils: fils("100.00") },
    { category: "TF", paymentMethod: "现金", amountFils: fils("30.00") },
    { category: "DR", paymentMethod: "cash", amountFils: fils("200.00") },
    { category: "E", paymentMethod: "C", amountFils: fils("40.00") }
  ]);

  assert.equal(formatFilsAsAed(summary.cashHandoverFils), "530.00");
  assert.equal(formatFilsAsAed(summary.bankTransferInFils), "500.00");
  assert.equal(summary.bankTransferInCount, 1);
  assert.equal(formatFilsAsAed(summary.grossReceivedFils), "1270.00");
});

test("computeHandoverSummary keeps detail breakdowns separate from the three handover core metrics", () => {
  const summary = computeHandoverSummary([
    { type: "rent", pay: "cash", amountFils: fils("770.00") },
    { type: "deposit_in", pay: "cash", amountFils: fils("200.00") },
    { type: "arrears", pay: "bank", amountFils: fils("50.00") },
    { type: "transfer_fee", pay: "bank", amountFils: fils("20.00") },
    { type: "deposit_refund", pay: "bank", amountFils: fils("100.00") },
    { type: "expense", pay: "cash", amountFils: fils("15.00") }
  ]);

  assert.equal(formatFilsAsAed(summary.rentIncomeFils), "770.00");
  assert.equal(formatFilsAsAed(summary.depositInFils), "200.00");
  assert.equal(formatFilsAsAed(summary.arrearsRecoveryFils), "50.00");
  assert.equal(formatFilsAsAed(summary.transferFeeIncomeFils), "20.00");
  assert.equal(formatFilsAsAed(summary.depositRefundFils), "100.00");
  assert.equal(formatFilsAsAed(summary.expenseFils), "15.00");
  assert.equal(formatFilsAsAed(summary.cashHandoverFils), "955.00");
  assert.equal(formatFilsAsAed(summary.bankTransferInFils), "70.00");
  assert.equal(summary.bankTransferInCount, 2);
  assert.equal(formatFilsAsAed(summary.bankTransferOutFils), "100.00");
  assert.equal(summary.bankTransferOutCount, 1);
  assert.equal(formatFilsAsAed(summary.grossReceivedFils), "1040.00");
});

test("computeHandoverSummary rejects unsupported categories and payments", () => {
  assert.throws(
    () => computeHandoverSummary([{ category: "unknown", paymentMethod: "cash", amountFils: 1n }]),
    /Unsupported handover category/
  );
  assert.throws(
    () => computeHandoverSummary([{ category: "R", paymentMethod: "card", amountFils: 1n }]),
    /Unsupported payment method/
  );
});

test("computeHandoverSummary rejects floating or negative money input", () => {
  assert.throws(
    () => computeHandoverSummary([{ category: "R", paymentMethod: "cash", amountFils: 1 }]),
    /minor-unit/
  );
  assert.throws(
    () => computeHandoverSummary([{ category: "R", paymentMethod: "cash", amountFils: -1n }]),
    /non-negative/
  );
});

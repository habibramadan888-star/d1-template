import assert from "node:assert/strict";
import test from "node:test";

import {
  addFils,
  formatFilsAsAed,
  maxFils,
  parseAedToFils,
  subtractFils,
  toSafeSqlInteger
} from "../modules/finance/money.mjs";

test("parseAedToFils converts AED strings to integer fils without floating point input", () => {
  assert.equal(parseAedToFils("0"), 0n);
  assert.equal(parseAedToFils("0.00"), 0n);
  assert.equal(parseAedToFils("0.01"), 1n);
  assert.equal(parseAedToFils("0.10"), 10n);
  assert.equal(parseAedToFils("400"), 40000n);
  assert.equal(parseAedToFils("770.00"), 77000n);
  assert.equal(parseAedToFils("1,234.56"), 123456n);
});

test("parseAedToFils rejects unsafe or ambiguous decimal input", () => {
  assert.throws(() => parseAedToFils(770), /string/);
  assert.throws(() => parseAedToFils("1.234"), /Invalid AED amount/);
  assert.throws(() => parseAedToFils("AED 1"), /Invalid AED amount/);
  assert.throws(() => parseAedToFils(""), /Invalid AED amount/);
  assert.throws(() => parseAedToFils("-1.00"), /Negative AED amount/);
});

test("parseAedToFils supports explicit negative ledger deltas", () => {
  assert.equal(parseAedToFils("-200.00", { allowNegative: true }), -20000n);
});

test("fils helpers perform integer-only arithmetic", () => {
  const cash = parseAedToFils("640.00");
  const refund = parseAedToFils("200.00");
  const expense = parseAedToFils("40.00");
  const handover = subtractFils(subtractFils(cash, refund), expense);

  assert.equal(handover, 40000n);
  assert.equal(addFils([cash, refund, expense]), 88000n);
  assert.equal(maxFils(handover, 0n), 40000n);
});

test("formatFilsAsAed formats stored minor units for display/export", () => {
  assert.equal(formatFilsAsAed(0n), "0.00");
  assert.equal(formatFilsAsAed(1n), "0.01");
  assert.equal(formatFilsAsAed(77000n), "770.00");
  assert.equal(formatFilsAsAed(-20000n), "-200.00");
});

test("toSafeSqlInteger gates BigInt values before D1 INTEGER binding", () => {
  assert.equal(toSafeSqlInteger(77000n), 77000);
  assert.throws(() => toSafeSqlInteger(BigInt(Number.MAX_SAFE_INTEGER) + 1n), /safe integer/);
});

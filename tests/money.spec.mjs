import assert from "node:assert/strict";
import test from "node:test";

import {
  addFils,
  assertValidFils,
  compareFils,
  filsToAedString,
  normalizeMoneyInput,
  parseAedToFils,
  subtractFils
} from "../modules/finance/money.mjs";

test("money helper rejects floating point authority and uses integer fils", () => {
  assert.notEqual(0.1 + 0.2, 0.3);
  assert.throws(() => parseAedToFils(0.3), /string/);
  assert.equal(addFils(parseAedToFils("0.10"), parseAedToFils("0.20")), 30n);
  assert.equal(filsToAedString(30n), "0.30");
});

test("parseAedToFils accepts exact AED decimal strings", () => {
  assert.equal(parseAedToFils("100.50"), 10050n);
  assert.equal(parseAedToFils("100"), 10000n);
  assert.equal(parseAedToFils("0.01"), 1n);
  assert.equal(parseAedToFils("999999.99"), 99999999n);
  assert.equal(parseAedToFils("1,000.00"), 100000n);
});

test("parseAedToFils rejects ambiguous or unsafe AED input", () => {
  assert.throws(() => parseAedToFils("100.999"), /Invalid AED amount/);
  assert.throws(() => parseAedToFils(NaN), /string/);
  assert.throws(() => parseAedToFils(Infinity), /string/);
  assert.throws(() => parseAedToFils("NaN"), /Invalid AED amount/);
  assert.throws(() => parseAedToFils("Infinity"), /Invalid AED amount/);
  assert.throws(() => parseAedToFils(""), /Invalid AED amount/);
  assert.throws(() => parseAedToFils("abc"), /Invalid AED amount/);
  assert.throws(() => parseAedToFils("10,00.00"), /Invalid AED amount/);
});

test("negative money is rejected by default and explicit for refund or adjustment", () => {
  assert.throws(() => parseAedToFils("-1.00"), /Negative AED amount/);
  assert.equal(parseAedToFils("-1.00", { allowNegative: true }), -100n);
  assert.throws(() => assertValidFils(-1n), /Negative money/);
  assert.equal(assertValidFils(-1n, { allowNegative: true }), -1n);
});

test("money helper formats and compares integer fils without floating error", () => {
  assert.equal(filsToAedString(10050n), "100.50");
  assert.equal(filsToAedString(0n), "0.00");
  assert.equal(filsToAedString(-100n), "-1.00");
  assert.equal(subtractFils(parseAedToFils("100.00"), parseAedToFils("0.01")), 9999n);
  assert.equal(compareFils(100n, 100n), 0);
  assert.equal(compareFils(101n, 100n), 1);
  assert.equal(compareFils(99n, 100n), -1);
});

test("normalizeMoneyInput makes grouping support explicit", () => {
  assert.equal(normalizeMoneyInput("1,234.56"), "1234.56");
  assert.equal(normalizeMoneyInput("1234.56"), "1234.56");
  assert.throws(() => normalizeMoneyInput("12,34.56"), /Invalid AED amount/);
});

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  compareFrontendTotalsToBackend,
  computeArrearsOutstandingFils,
  computeBankTransferTotalFils,
  computeCashTotalFils,
  computeDashboardTotalsFils,
  computeDepositTotalFils,
  computeGrossReceivedFils,
  computeHandoverTotalsFils,
  computeSessionTotalsFils,
  formatTotalsForReport,
  normalizeLegacyAmountToFils
} from "../modules/finance/backend-totals.mjs";
import { addFils, filsToAedString, parseAedToFils } from "../modules/finance/money.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(testDir, "fixtures", "backend-totals");

async function loadFixture(name) {
  const text = await readFile(path.join(fixtureDir, `${name}.json`), "utf8");
  return JSON.parse(text);
}

function aed(value) {
  return filsToAedString(value);
}

test("backend totals fixtures cover required scenarios", async () => {
  const files = (await readdir(fixtureDir)).filter((name) => name.endsWith(".json"));
  assert.deepEqual(
    files.sort(),
    [
      "arrears-partial-payment.json",
      "bank-only.json",
      "cash-only.json",
      "deposit-and-rent.json",
      "duplicate-submit-risk.json",
      "empty-and-null-amounts.json",
      "frontend-total-tampered.json",
      "invalid-decimal-3dp.json",
      "mixed-cash-bank.json",
      "multi-session-dashboard.json",
      "negative-refund-or-adjustment.json",
      "voided-records.json"
    ].sort()
  );
});

test("cash-only total is backend computed without frontend authority", async () => {
  const fixture = await loadFixture("cash-only");
  const totals = computeSessionTotalsFils(fixture.rows, {
    frontendTotals: fixture.frontendTotals
  });

  assert.equal(aed(computeCashTotalFils(fixture.rows)), fixture.expected.cashTotalAed);
  assert.equal(aed(totals.cashHandoverFils), fixture.expected.cashHandoverAed);
  assert.equal(aed(totals.grossReceivedFils), fixture.expected.grossReceivedAed);
  assert.equal(totals.comparison.matches, true);
  assert.equal(totals.errors.length, fixture.expected.errors);
});

test("bank-only total and count are backend computed", async () => {
  const fixture = await loadFixture("bank-only");
  const totals = computeSessionTotalsFils(fixture.rows, {
    frontendTotals: fixture.frontendTotals
  });

  assert.equal(aed(computeBankTransferTotalFils(fixture.rows)), fixture.expected.bankTransferAed);
  assert.equal(totals.bankTransferCount, fixture.expected.bankTransferCount);
  assert.equal(aed(totals.transferFeeFils), fixture.expected.transferFeeAed);
  assert.equal(totals.comparison.matches, true);
});

test("mixed cash and bank gross totals are integer-fils based", async () => {
  const fixture = await loadFixture("mixed-cash-bank");
  const totals = computeSessionTotalsFils(fixture.rows, {
    frontendTotals: fixture.frontendTotals
  });

  assert.equal(aed(totals.cashTotalFils), fixture.expected.cashTotalAed);
  assert.equal(aed(totals.cashHandoverFils), fixture.expected.cashHandoverAed);
  assert.equal(aed(totals.bankTransferTotalFils), fixture.expected.bankTransferAed);
  assert.equal(aed(computeGrossReceivedFils(fixture.rows)), fixture.expected.grossReceivedAed);
  assert.equal(aed(totals.sessionTotalFils), fixture.expected.sessionTotalAed);
  assert.equal(totals.errors.length, 0);
});

test("deposit and rent are separated even when both are cash income", async () => {
  const fixture = await loadFixture("deposit-and-rent");
  const totals = computeSessionTotalsFils(fixture.rows, {
    frontendTotals: fixture.frontendTotals
  });

  assert.equal(aed(totals.rentReceivedFils), fixture.expected.rentReceivedAed);
  assert.equal(aed(computeDepositTotalFils(fixture.rows)), fixture.expected.depositReceivedAed);
  assert.equal(aed(totals.grossReceivedFils), fixture.expected.grossReceivedAed);
  assert.equal(totals.comparison.matches, true);
});

test("arrears paid and outstanding are not mixed", async () => {
  const fixture = await loadFixture("arrears-partial-payment");
  const totals = computeDashboardTotalsFils(fixture.rows, {
    arrearsRows: fixture.arrearsRows,
    frontendTotals: fixture.frontendTotals
  });
  const outstanding = computeArrearsOutstandingFils(fixture.arrearsRows);

  assert.equal(aed(totals.arrearsPaidFils), fixture.expected.arrearsPaidAed);
  assert.equal(aed(outstanding.arrearsOutstandingFils), fixture.expected.arrearsOutstandingAed);
  assert.equal(aed(totals.arrearsOutstandingFils), fixture.expected.arrearsOutstandingAed);
  assert.equal(totals.errors.length, 0);
});

test("voided records are excluded by default and visible in audit mode", async () => {
  const fixture = await loadFixture("voided-records");
  const active = computeSessionTotalsFils(fixture.rows, { frontendTotals: fixture.frontendTotals });
  const audit = computeSessionTotalsFils(fixture.rows, {
    frontendTotals: fixture.frontendTotals,
    includeVoided: true
  });

  assert.equal(aed(active.cashHandoverFils), fixture.expected.cashHandoverAed);
  assert.equal(aed(audit.cashHandoverFils), fixture.expected.includeVoidedCashHandoverAed);
  assert.equal(active.excludedVoidedRowCount, fixture.expected.excludedVoidedRowCount);
  assert.equal(active.comparison.matches, false);
});

test("frontend submitted total tampering creates discrepancy report", async () => {
  const fixture = await loadFixture("frontend-total-tampered");
  const totals = computeSessionTotalsFils(fixture.rows, {
    frontendTotals: fixture.frontendTotals
  });
  const cash = totals.comparison.comparisons.find((item) => item.field === "cash_handover");

  assert.equal(aed(totals.cashHandoverFils), fixture.expected.cashHandoverAed);
  assert.equal(aed(totals.grossReceivedFils), fixture.expected.grossReceivedAed);
  assert.equal(totals.comparison.matches, false);
  assert.equal(cash.matches, false);
  assert.equal(cash.deltaAed, "359.00");
});

test("duplicate submission risk is visible because backend recomputes from rows", async () => {
  const fixture = await loadFixture("duplicate-submit-risk");
  const totals = computeSessionTotalsFils(fixture.rows, {
    frontendTotals: fixture.frontendTotals
  });

  assert.equal(aed(totals.cashHandoverFils), fixture.expected.cashHandoverAed);
  assert.equal(totals.comparison.matches, false);
  assert.equal(totals.includedRowCount, 2);
});

test("invalid decimals, nulls, NaN, Infinity, and empty values are structured errors", async () => {
  const invalid3dp = computeHandoverTotalsFils((await loadFixture("invalid-decimal-3dp")).rows);
  const emptyNull = computeHandoverTotalsFils((await loadFixture("empty-and-null-amounts")).rows);

  assert.ok(invalid3dp.errors.length >= 1);
  assert.ok(emptyNull.errors.length >= 2);
  assert.equal(normalizeLegacyAmountToFils("100.999", { field: "amount" }).ok, false);
  assert.equal(normalizeLegacyAmountToFils(Number.NaN, { field: "amount" }).ok, false);
  assert.equal(
    normalizeLegacyAmountToFils(Number.POSITIVE_INFINITY, { field: "amount" }).ok,
    false
  );
  assert.equal(normalizeLegacyAmountToFils("", { field: "amount" }).ok, false);
});

test("legacy numeric decimal can be converted but carries a warning", () => {
  const parsed = normalizeLegacyAmountToFils(100.5, { field: "amount", rowId: "legacy-number" });

  assert.equal(parsed.ok, true);
  assert.equal(parsed.fils, 10050n);
  assert.equal(
    parsed.warnings.some((warning) => warning.code === "LEGACY_NUMBER_AMOUNT"),
    true
  );
});

test("negative refund or adjustment rows are not silently treated as active totals", async () => {
  const fixture = await loadFixture("negative-refund-or-adjustment");
  const totals = computeHandoverTotalsFils(fixture.rows);

  assert.ok(totals.errors.length >= fixture.expected.errorsAtLeast);
  assert.equal(aed(totals.cashHandoverFils), "0.00");
});

test("integer fils addition avoids floating point drift for small decimals", () => {
  assert.equal(0.1 + 0.2 === 0.3, false);
  assert.equal(aed(addFils(parseAedToFils("0.10"), parseAedToFils("0.20"))), "0.30");

  const many = Array.from({ length: 100 }, () => parseAedToFils("0.01"));
  assert.equal(aed(addFils(many)), "1.00");
});

test("large amounts, strings, and explicit number input behavior are covered", () => {
  assert.equal(
    aed(normalizeLegacyAmountToFils("999999.99", { field: "amount" }).fils),
    "999999.99"
  );
  assert.equal(normalizeLegacyAmountToFils("100", { field: "amount" }).ok, true);
  assert.equal(normalizeLegacyAmountToFils("1,234.56", { field: "amount" }).aed, "1234.56");
  assert.equal(normalizeLegacyAmountToFils("not-money", { field: "amount" }).ok, false);
});

test("dashboard totals handle multi-session rows and arrears outstanding", async () => {
  const fixture = await loadFixture("multi-session-dashboard");
  const totals = computeDashboardTotalsFils(fixture.rows, {
    arrearsRows: fixture.arrearsRows
  });
  const report = formatTotalsForReport(totals);

  assert.equal(aed(totals.cashTotalFils), fixture.expected.cashTotalAed);
  assert.equal(aed(totals.cashHandoverFils), fixture.expected.cashHandoverAed);
  assert.equal(aed(totals.bankTransferTotalFils), fixture.expected.bankTransferAed);
  assert.equal(aed(totals.grossReceivedFils), fixture.expected.grossReceivedAed);
  assert.equal(aed(totals.sessionTotalFils), fixture.expected.sessionTotalAed);
  assert.equal(aed(totals.arrearsOutstandingFils), fixture.expected.arrearsOutstandingAed);
  assert.equal(report.grossReceivedAed, fixture.expected.grossReceivedAed);
  assert.equal(totals.errors.length, 0);
});

test("compareFrontendTotalsToBackend does not make frontend totals authoritative", async () => {
  const fixture = await loadFixture("frontend-total-tampered");
  const backend = computeHandoverTotalsFils(fixture.rows);
  const comparison = compareFrontendTotalsToBackend(fixture.frontendTotals, backend);

  assert.equal(comparison.matches, false);
  assert.equal(aed(backend.cashHandoverFils), "640.00");
});

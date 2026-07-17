import assert from "node:assert/strict";
import test from "node:test";

import {
  QA_FULL_AUTOMATION_ONLY,
  QA_FULL_FINANCE_EXPECTED,
  QA_FULL_SCENARIOS,
  QA_MATRIX_VERSION,
  QA_QUICK_SCENARIOS,
  qaAcceptanceMatrix,
} from "./fixtures/employee-qa-acceptance-matrices.mjs";

test("Quick reuses the exact 073 sixteen-scenario engine", () => {
  assert.equal(QA_QUICK_SCENARIOS.length, 16);
  assert.equal(qaAcceptanceMatrix("quick").scenarios.length, 16);
  assert.equal(qaAcceptanceMatrix("quick").matrix_version, QA_MATRIX_VERSION);
});

test("Full derives at least 35 legal upload scenarios plus explicit automation-only rejection boundaries", () => {
  assert.equal(QA_FULL_SCENARIOS.length >= 35, true);
  assert.equal(QA_FULL_SCENARIOS.every(row => row.upload_enabled === true && row.expected_validation === "pass"), true);
  assert.equal(QA_FULL_AUTOMATION_ONLY.length >= 5, true);
  const text = JSON.stringify([...QA_FULL_SCENARIOS, ...QA_FULL_AUTOMATION_ONLY]);
  for (const term of ["rent", "arrears_payment", "deposit_in", "deposit_out", "checkout", "expense", "bed_transfer", "source-vacant", "target-occupied", "existing-fingerprint", "missing-legacy-entry-id", "same-bed"]) assert.match(text, new RegExp(term));
});

test("Full fixtures contain no real identity provider or secret material", () => {
  const text = JSON.stringify(QA_FULL_SCENARIOS);
  assert.doesNotMatch(text, /\+971|00971|99099|tenant_card|card_id|provider|access_token|client_secret|password/i);
});

test("Full publishes one shared financial oracle derived from every legal upload scenario", () => {
  const matrix = qaAcceptanceMatrix("full");
  assert.deepEqual(matrix.expected_finance, QA_FULL_FINANCE_EXPECTED);
  assert.deepEqual(QA_FULL_FINANCE_EXPECTED, {
    cash_received: 3800,
    bank_received: 2620,
    rent_income: 5360,
    arrears_opened: 300,
    outstanding: 300,
    arrears_repaid: 160,
    deposit_included: 700,
    cash_out: 999,
    bank_out: 799,
    deposit_refund: 500,
    expense: 1298,
    bed_transfer_fee: 200,
    total_received: 6420,
    total_expenses: 1798,
    net_funds: 4622,
    cash_net: 2801,
    bank_net: 1821,
  });
});

test("Full uses distinct legal business identities instead of weakening global idempotency", () => {
  const matrix = qaAcceptanceMatrix("full");
  const byCase = new Map(matrix.scenarios.map(row => [row.case_id, row.input]));
  for (const row of matrix.scenarios) assert.equal(row.input.created_at, "2026-07-17T08:00:00.000Z");
  assert.equal(byCase.get("rent-cash-full").rent_period_start, "2026-07-17");
  assert.equal(byCase.get("rent-cash-full-custom-period").rent_period_start, "2026-07-18");
  assert.equal(byCase.get("rent-cash-full-mismatch-period-reviewed").rent_period_start, "2026-08-17");
  assert.equal(byCase.get("arrears-payment-cash-cloud").arrears_ref, "FULL-CLOUD-ARREARS-1");
  assert.equal(byCase.get("arrears-payment-cash-cloud-bank-cloud").arrears_ref, "FULL-CLOUD-ARREARS-2");
  assert.equal(byCase.get("arrears-payment-bank-legacy-cash-legacy").payment_amount, 10);
  assert.equal(byCase.get("arrears-payment-cash-cloud-partial-cloud").arrears_ref, "FULL-CLOUD-ARREARS-3");
  assert.equal(byCase.get("arrears-payment-cash-cloud-partial-cloud").remaining_arrears_after_payment, 20);
});

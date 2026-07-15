import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS,
  GOLDEN_ENTRY_IDS,
  goldenNegativeExpenseRequests,
  goldenValidationRequests,
} from "./fixtures/employee-seven-event-golden-session.mjs";
import {
  GOLDEN_FINANCE_EXPECTED,
  assertAuthAndDraftRecovery,
  assertGoldenFixturePrivacy,
  assertGoldenScenarioManifest,
} from "./helpers/employee-golden-session-oracle.mjs";
import { goldenSessionHumanLines } from "../scripts/generate-employee-golden-session-report.mjs";

test("the golden manifest has 16 explicit, private, stable-entry scenarios", () => {
  assert.equal(assertGoldenScenarioManifest(), true);
  assert.equal(assertGoldenFixturePrivacy(), true);
  assert.equal(new Set(GOLDEN_ENTRY_IDS).size, 16);
  assert.equal(EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS.every(row => row.session_id && row.entry_id), true);
});

test("the negative aggregate fixture changes only one Expense description", () => {
  const positive = goldenValidationRequests();
  const negative = goldenNegativeExpenseRequests();
  assert.equal(negative.length, 16);
  const changed = negative.filter((row, index) => JSON.stringify(row) !== JSON.stringify(positive[index]));
  assert.equal(changed.length, 1);
  assert.equal(changed[0].entry.type, "E");
  assert.equal(Object.hasOwn(changed[0].entry, "expense_description"), false);
});

test("the Finance oracle is a fixed independent constant", () => {
  assert.deepEqual(GOLDEN_FINANCE_EXPECTED, {
    cash_received: 1620,
    bank_received: 880,
    total_received: 2500,
    cash_out: 199,
    bank_out: 600,
    total_expenses: 799,
    net_funds: 1701,
    cash_net: 1421,
    bank_net: 280,
    outstanding: 150,
    arrears_opened: 150,
    arrears_repaid: 70,
    deposit_included: 200,
    deposit_refund: 200,
    expense: 599,
    bed_transfer_fee: 100,
    rent_income: 2130,
  });
});

test("the command reports the required machine-readable PASS lines", () => {
  const report = {
    pass: true,
    scenario_count: 16,
    aggregate_result_count: 16,
    formal_write_count: 16,
    idempotent_retry_new_writes: 0,
    cross_event_error_count: 0,
    duplicate_anchor_count: 0,
    finance_result: "PASS",
    owner_history_result: "PASS",
    partial_resume_result: "PASS",
    auth_stability_result: "PASS",
    ttlock_external_calls: 0,
    report_path: "temporary-report.json",
  };
  assert.deepEqual(goldenSessionHumanLines(report).slice(0, 12), [
    "SEVEN_EVENT_GOLDEN_SESSION: PASS",
    "SCENARIO_COUNT: 16",
    "VALIDATION_RESULT_COUNT: 16",
    "FORMAL_WRITE_COUNT: 16",
    "IDEMPOTENT_RETRY_NEW_WRITES: 0",
    "CROSS_EVENT_ERROR_COUNT: 0",
    "DUPLICATE_ANCHOR_COUNT: 0",
    "FINANCE_RESULT: PASS",
    "OWNER_HISTORY_RESULT: PASS",
    "PARTIAL_RESUME_RESULT: PASS",
    "AUTH_STABILITY_RESULT: PASS",
    "TTLOCK_EXTERNAL_CALLS: 0",
  ]);
});

test("the harness is local-only and uses formal routes without a production QA surface", async () => {
  const source = await readFile(new URL("../scripts/verify-employee-golden-session.mjs", import.meta.url), "utf8");
  assert.match(source, /wrangler[\s\S]*dev/);
  assert.match(source, /\/api\/employee\/entry\/validate/);
  assert.match(source, /\/api\/employee\/entry/);
  assert.match(source, /\/api\/history/);
  assert.doesNotMatch(source, /--remote|workers\.dev|api\.sciener\.com/);
  assert.equal(assertAuthAndDraftRecovery(), true);
});

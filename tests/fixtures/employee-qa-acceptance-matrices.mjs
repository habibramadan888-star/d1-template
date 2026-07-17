import {
  EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS,
  GOLDEN_TTLOCK_SNAPSHOT,
} from "./employee-seven-event-golden-session.mjs";
import { GOLDEN_FINANCE_EXPECTED } from "../helpers/employee-golden-session-oracle.mjs";

export const QA_MATRIX_VERSION = "employee-qa-matrix-v2";

const clone = value => structuredClone(value);

function templateScenario(row, index, extra = {}) {
  const input = clone(row.input || {});
  for (const key of ["id", "entry_id", "event_id", "anchor_id", "session_id", "created_at"]) delete input[key];
  return {
    case_id: extra.case_id || row.case_id,
    event_type: extra.event_type || row.event_type,
    input: { ...input, ...(extra.input || {}) },
    expected_validation: extra.expected_validation || (row.expected_validation?.ok === false ? "fail" : "pass"),
    expected_error_code: extra.expected_error_code || "",
    upload_enabled: extra.upload_enabled !== false,
    expected_anchor_type: extra.expected_anchor_type || row.expected_anchor_type,
    expected_finance_delta: clone(extra.expected_finance_delta || row.expected_finance_delta || {}),
    expected_owner_projection: clone(extra.expected_owner_projection || row.expected_owner_projection || {}),
    expected_arrears_delta: clone(extra.expected_arrears_delta || row.expected_arrears_delta || {}),
    expected_todo_delta: clone(extra.expected_todo_delta || row.expected_todo_delta || {}),
    expected_ttlock_calls: 0,
  };
}

export const QA_QUICK_SCENARIOS = Object.freeze(
  EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS.map((row, index) => templateScenario(row, index)),
);

const baseByCase = new Map(EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS.map(row => [row.case_id, row]));
const variant = (base, suffix, input, expected = {}) => templateScenario(baseByCase.get(base), 0, {
  case_id: `${base}-${suffix}`,
  input,
  ...expected,
});

const FULL_EXTENSIONS = [
  variant("rent-cash-full", "bank-full", { payment_method: "bank", pay_type: "bank" }, { expected_finance_delta: { bank_received: 700, rent_income: 700 } }),
  variant("rent-bank-short", "cash-short", { payment_method: "cash", pay_type: "cash" }, { expected_finance_delta: { cash_received: 700, outstanding: 70, arrears_opened: 70, rent_income: 700 } }),
  variant("rent-cash-excess", "bank-excess", { payment_method: "bank", pay_type: "bank" }, { expected_finance_delta: { bank_received: 730, rent_income: 730 } }),
  variant("rent-cash-full", "custom-period", { cycle: "CUST", period_day_count: 10, period_start: "2026-07-16", period_end: "2026-07-25", due: 400, paid: 400, amount: 400, expected_rent: 400, paid_amount: 400 }, { expected_finance_delta: { cash_received: 400, rent_income: 400 } }),
  variant("rent-cash-full", "mismatch-period-reviewed", { cycle: "1M", note: "qa period mismatch manually confirmed" }),
  variant("arrears-payment-cash-cloud", "bank-cloud", { payment_method: "bank", pay_type: "bank" }, { expected_finance_delta: { bank_received: 60, arrears_repaid: 60, rent_income: 0 } }),
  variant("arrears-payment-bank-legacy", "cash-legacy", { payment_method: "cash", pay_type: "cash" }, { expected_finance_delta: { cash_received: 10, arrears_repaid: 10, rent_income: 0 } }),
  variant("arrears-payment-cash-cloud", "partial-cloud", { amount: 40, payment_amount: 40, paid_amount: 40 }, { expected_finance_delta: { cash_received: 40, arrears_repaid: 40, rent_income: 0 } }),
  variant("deposit-in-cash", "d0", { room: "501", bed: "501", amount: 100, deposit_amount: 100 }),
  variant("deposit-in-bank", "expired", { room: "502", bed: "502", amount: 200, deposit_amount: 200 }, { expected_finance_delta: { bank_received: 200, deposit_included: 200 } }),
  variant("deposit-in-cash", "removed", { room: "503", bed: "503", amount: 200, deposit_amount: 200 }, { expected_finance_delta: { cash_received: 200, deposit_included: 200 } }),
  variant("deposit-out-cash", "known", { room: "504", bed: "504" }),
  variant("deposit-out-bank", "unknown", { room: "505", bed: "505" }),
  variant("deposit-out-cash", "mismatch-reviewed", { room: "506", bed: "506", note: "qa deposit mismatch reviewed" }),
  variant("checkout-clear", "expired", { room: "507", bed: "507" }),
  variant("checkout-clear", "deleted", { room: "508", bed: "508" }),
  variant("checkout-clear", "controlled", { room: "509", bed: "509" }),
  variant("checkout-clear", "vacant", { room: "510", bed: "510" }),
  variant("checkout-left-with-arrears", "controlled", { room: "511", bed: "511" }),
  variant("expense-cash-99", "cash-100", { amount: 100, expense_amount: 100, room: "601", target_bed: "601" }, { expected_finance_delta: { cash_out: 100, expense: 100 } }),
  variant("expense-bank-500", "bank-99", { amount: 99, expense_amount: 99, room: "602", target_bed: "602" }, { expected_finance_delta: { bank_out: 99, expense: 99 } }),
  variant("expense-cash-99", "cash-500", { amount: 500, expense_amount: 500, room: "603", target_bed: "603" }, { expected_finance_delta: { cash_out: 500, expense: 500 } }),
  variant("bed-transfer-paid-cash", "pair-2", { from_bed: "307", to_bed: "308" }),
  variant("bed-transfer-paid-bank", "pair-2", { from_bed: "309", to_bed: "310" }),
  variant("bed-transfer-waived", "pair-2", { from_bed: "311", to_bed: "312" }),
];

export const QA_FULL_SCENARIOS = Object.freeze([...QA_QUICK_SCENARIOS.map(clone), ...FULL_EXTENSIONS]);

function aggregateScenarioFinanceExpected(scenarios = []) {
  const totals = {};
  for (const scenario of scenarios) {
    for (const [field, value] of Object.entries(scenario.expected_finance_delta || {})) {
      totals[field] = Number(totals[field] || 0) + Number(value || 0);
    }
  }
  const cashReceived = Number(totals.cash_received || 0);
  const bankReceived = Number(totals.bank_received || 0);
  const cashOut = Number(totals.cash_out || 0);
  const bankOut = Number(totals.bank_out || 0);
  const arrearsOpened = Number(totals.arrears_opened || 0);
  return {
    ...totals,
    total_received: cashReceived + bankReceived,
    total_expenses: cashOut + bankOut,
    net_funds: cashReceived + bankReceived - cashOut - bankOut,
    cash_net: cashReceived - cashOut,
    bank_net: bankReceived - bankOut,
    outstanding: arrearsOpened,
  };
}

export const QA_FULL_FINANCE_EXPECTED = Object.freeze(aggregateScenarioFinanceExpected(QA_FULL_SCENARIOS));

export const QA_FULL_AUTOMATION_ONLY = Object.freeze([
  { case_id: "bed-transfer-source-vacant-rejected", event_type: "bed_transfer", expected_validation: "fail", expected_error_code: "BED_TRANSFER_SOURCE_CONTEXT_UNAVAILABLE" },
  { case_id: "bed-transfer-target-occupied-rejected", event_type: "bed_transfer", expected_validation: "fail", expected_error_code: "BED_TRANSFER_TARGET_NOT_VACANT" },
  { case_id: "bed-transfer-existing-fingerprint-idempotent", event_type: "bed_transfer", expected_validation: "idempotent" },
  { case_id: "bed-transfer-missing-legacy-entry-id-idempotent", event_type: "bed_transfer", expected_validation: "idempotent" },
  { case_id: "bed-transfer-same-bed-finance-isolated", event_type: "bed_transfer", expected_validation: "fail", expected_error_code: "BED_TRANSFER_SAME_BED" },
]);

export const QA_RECOVERY_SCENARIOS = Object.freeze([
  "aggregate_503",
  "aggregate_malformed_response",
  "non_string_error_code",
  "validation_interrupted",
  "single_failure_in_16",
  "eight_written_then_interrupted",
  "relogin_resume",
  "duplicate_upload",
  "response_lost_after_write",
  "local_storage_memory_dom_divergence",
  "explicit_401",
  "transient_error_does_not_logout",
].map((case_id, index) => ({ case_id, sequence: index + 1, formal_write_expected: case_id === "eight_written_then_interrupted" ? 8 : 0 })));

export const QA_TTLOCK_SNAPSHOT_V1 = Object.freeze({
  ...clone(GOLDEN_TTLOCK_SNAPSHOT),
  snapshot_version: "qa-ttlock-snapshot-v1",
  roomsData: {
    "HL-QA": [
      { room: "HL-QA", cardName: "301 D100 0716 exp 0816", remark: "301 D100 0716 exp 0816", endDate: 0 },
      { room: "HL-QA", cardName: "302 E", remark: "302 E", endDate: 0 },
      { room: "HL-QA", cardName: "303 D200 0716 exp 0816", remark: "303 D200 0716 exp 0816", endDate: 0 },
      { room: "HL-QA", cardName: "304 e", remark: "304 e", endDate: 0 },
      { room: "HL-QA", cardName: "305 D0 0716 exp 0816", remark: "305 D0 0716 exp 0816", endDate: 0 },
      { room: "HL-QA", cardName: "306 E", remark: "306 E", endDate: 0 },
      { room: "HL-QA", cardName: "307 D100 0716 exp 0816", remark: "307 D100 0716 exp 0816", endDate: 0 },
      { room: "HL-QA", cardName: "308 E", remark: "308 E", endDate: 0 },
      { room: "HL-QA", cardName: "309 D100 0716 exp 0816", remark: "309 D100 0716 exp 0816", endDate: 0 },
      { room: "HL-QA", cardName: "310 E", remark: "310 E", endDate: 0 },
      { room: "HL-QA", cardName: "311 D100 0716 exp 0816", remark: "311 D100 0716 exp 0816", endDate: 0 },
      { room: "HL-QA", cardName: "312 E", remark: "312 E", endDate: 0 },
      { room: "HL-QA", cardName: "701 D100 0716 exp 0816", remark: "701 D100 0716 exp 0816", endDate: 0 },
      { room: "HL-QA", cardName: "702 D100 0716 exp 0816", remark: "702 D100 0716 exp 0816", endDate: 0 },
      { room: "HL-QA", cardName: "703 E", remark: "703 E", endDate: 0 },
      { room: "HL-QA", cardName: "704 D100 0716 exp 0715", remark: "704 D100 0716 exp 0715", endDate: 0 },
      { room: "HL-QA", cardName: "705 CONTROLLED", remark: "705 CONTROLLED", endDate: 0 },
      { room: "HL-QA", cardName: "706 D100 0716", remark: "706 D100 0716", endDate: 0 },
      { room: "HL-QA", cardName: "707 D100 D200 0716 exp 0816", remark: "707 D100 D200 0716 exp 0816", endDate: 0 },
    ],
  },
});

export function qaAcceptanceMatrix(mode = "quick") {
  const normalized = String(mode).toLowerCase();
  if (normalized === "quick") return { mode: "quick", matrix_version: QA_MATRIX_VERSION, scenarios: clone(QA_QUICK_SCENARIOS), automation_only: [], expected_finance: clone(GOLDEN_FINANCE_EXPECTED) };
  if (normalized === "full") return { mode: "full", matrix_version: QA_MATRIX_VERSION, scenarios: clone(QA_FULL_SCENARIOS), automation_only: clone(QA_FULL_AUTOMATION_ONLY), expected_finance: clone(QA_FULL_FINANCE_EXPECTED) };
  if (normalized === "recovery") return { mode: "recovery", matrix_version: QA_MATRIX_VERSION, scenarios: [], recovery_scenarios: clone(QA_RECOVERY_SCENARIOS), expected_finance: null };
  throw new Error(`unsupported QA mode: ${mode}`);
}

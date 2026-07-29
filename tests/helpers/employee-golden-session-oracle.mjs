import assert from "node:assert/strict";

import {
  EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS,
  GOLDEN_ENTRY_IDS,
} from "../fixtures/employee-seven-event-golden-session.mjs";

export const GOLDEN_FINANCE_EXPECTED = Object.freeze({
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

function money(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function canonicalFinanceActual(projection = {}) {
  const cashReceived = money(projection.cash_received);
  const bankReceived = money(projection.bank_received);
  const cashOut = money(projection.cash_out);
  const bankOut = money(projection.bank_out);
  return {
    cash_received: cashReceived,
    bank_received: bankReceived,
    total_received: money(projection.gross_received ?? cashReceived + bankReceived),
    cash_out: cashOut,
    bank_out: bankOut,
    total_expenses: money(cashOut + bankOut),
    net_funds: money(cashReceived + bankReceived - cashOut - bankOut),
    cash_net: money(cashReceived - cashOut),
    bank_net: money(bankReceived - bankOut),
    outstanding: money(projection.arrears_opened_amount),
    arrears_opened: money(projection.arrears_opened_amount),
    arrears_repaid: money(projection.arrears_repaid),
    deposit_included: money(projection.deposit_received),
    deposit_refund: money(projection.deposit_refund),
    expense: money(projection.expenses),
    bed_transfer_fee: money(projection.bed_transfer_fee),
    rent_income: money(projection.rent_income),
  };
}

export function assertGoldenFinance(projection = {}) {
  const actual = canonicalFinanceActual(projection);
  assert.deepEqual(actual, GOLDEN_FINANCE_EXPECTED);
  return actual;
}

export function assertGoldenScenarioManifest() {
  assert.equal(EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS.length, 16);
  assert.equal(new Set(GOLDEN_ENTRY_IDS).size, 16);
  const covered = new Set(EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS.map(row => row.event_type));
  for (const type of [
    "rent",
    "arrears_payment",
    "deposit_in",
    "deposit_out",
    "checkout",
    "left_with_arrears",
    "expense",
    "bed_transfer",
  ]) assert.equal(covered.has(type), true, `${type} must be represented`);
  for (const row of EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS) {
    for (const field of [
      "case_id",
      "event_type",
      "session_id",
      "entry_id",
      "input",
      "expected_validation",
      "expected_anchor_type",
      "expected_finance_delta",
      "expected_owner_projection",
      "expected_arrears_delta",
      "expected_todo_delta",
      "expected_ttlock_calls",
    ]) assert.equal(Object.hasOwn(row, field), true, `${row.case_id}.${field}`);
  }
  return true;
}

const FORBIDDEN_FIXTURE_FIELDS = /(?:tenant_?card|card_?id|provider|phone|99099|ttlock_(?:username|password|client|token))/i;

export function assertGoldenFixturePrivacy() {
  const serialized = JSON.stringify(EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS);
  assert.doesNotMatch(serialized, FORBIDDEN_FIXTURE_FIELDS);
  assert.doesNotMatch(serialized, /\+971|00971/i);
  return true;
}

export function aggregateIdentityContract(results = []) {
  const ids = results.map(row => String(row?.entry_identity || ""));
  const expected = new Set(GOLDEN_ENTRY_IDS);
  const duplicates = ids.filter((id, index) => id && ids.indexOf(id) !== index);
  const unknown = ids.filter(id => !expected.has(id));
  const missing = GOLDEN_ENTRY_IDS.filter(id => !ids.includes(id));
  return {
    ok: results.length === 16 && duplicates.length === 0 && unknown.length === 0 && missing.length === 0,
    duplicate_entry_id_count: new Set(duplicates).size,
    unmatched_result_count: unknown.length + missing.length,
    missing,
    unknown,
  };
}

export function simulateDraftRecovery(drafts, failure) {
  const original = structuredClone(drafts);
  const status = Number(failure?.status || 0);
  const explicitAuthFailure = status === 401 && typeof failure?.error_code === "string" && [
    "UNAUTHORIZED",
    "AUTH_SESSION_EXPIRED",
    "session_revoked",
    "unauthenticated",
  ].includes(failure.error_code);
  return {
    drafts: original,
    redirect_to_login: explicitAuthFailure,
    session_error: explicitAuthFailure ? null : "Server validation unavailable. Please retry.",
    record_failure_count: 0,
  };
}

export function assertAuthAndDraftRecovery() {
  const drafts = GOLDEN_ENTRY_IDS.map(id => ({ id, upload_status: "LOCAL" }));
  for (const failure of [
    { status: 503, error_code: "SERVER_PROCESSING_TIMEOUT" },
    { status: 422, error_code: { unexpected: true } },
    { status: 200, error_code: "SERVER_VALIDATE_MALFORMED_RESPONSE" },
  ]) {
    const recovered = simulateDraftRecovery(drafts, failure);
    assert.deepEqual(recovered.drafts, drafts);
    assert.equal(recovered.redirect_to_login, false);
    assert.equal(recovered.record_failure_count, 0);
  }
  const auth = simulateDraftRecovery(drafts, { status: 401, error_code: "UNAUTHORIZED" });
  assert.equal(auth.redirect_to_login, true);
  assert.deepEqual(auth.drafts, drafts);
  return true;
}

export function countDuplicateAnchors(anchors = []) {
  const ids = anchors.map(anchor => String(anchor?.transfer_anchor_id || anchor?.event_id || anchor?.anchor_id || anchor?.id || "")).filter(Boolean);
  return ids.length - new Set(ids).size;
}

export function assertEventIsolation(anchors = []) {
  const errors = [];
  for (const anchor of anchors) {
    const type = String(anchor?.event_type || "").toLowerCase();
    if (type === "deposit_out" && Number(anchor.expense_amount || 0) !== 0) errors.push("deposit_out_as_expense");
    if (type === "expense" && Number(anchor.refund_amount || 0) !== 0) errors.push("expense_as_deposit_refund");
    if (type === "arrears_payment" && Number(anchor.rent_income || 0) !== 0) errors.push("arrears_payment_as_rent");
    if (type === "bed_transfer" && /card_id|provider|phone|99099/i.test(JSON.stringify(anchor))) errors.push("bed_transfer_provider_identity");
  }
  return errors;
}

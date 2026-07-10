import assert from "node:assert/strict";
import test from "node:test";
import { validateBedTransferPhase1Contract } from "../modules/employees/bed-transfer-phase1-contract.mjs";

const base = {
  from_bed: "145",
  to_bed: "146",
  fee_choice: "charged",
  fee_amount_aed: 50,
  fee_amount_fils: 5000,
  payment_method: "cash",
  waiver_reason: "",
  transfer_reason: "customer_request",
  cloud_arrears_ref: "",
  arrears_carryover: false,
  carried_arrears_amount: 0,
  company_scope: "corp-a",
  source_context: {
    company_scope: "corp-a",
    property_id: "property-a",
    physical_bed_status: "not_marked_vacant",
    physical_bed_status_source: "access_snapshot_no_E",
    parsed_vacancy_marker: false,
    data_source: "live_api",
    fallback: false,
    candidate_count: 1,
    ambiguous: false,
    conflict: false,
    stale: false,
    parse_status: "parsed",
    parsed_deposit_amount: 0,
    current_rent_coverage_start: "2026-08-01",
    current_rent_coverage_end: "2026-09-01",
    open_arrears: []
  },
  target_context: {
    company_scope: "corp-a",
    property_id: "property-b",
    physical_bed_status: "vacant",
    physical_bed_status_source: "access_snapshot_E_marker",
    parsed_vacancy_marker: true,
    data_source: "live_api",
    fallback: false,
    candidate_count: 1,
    ambiguous: false,
    conflict: false,
    stale: false,
    parse_status: "parsed",
    parsed_deposit_amount: 0,
    open_arrears: []
  }
};

function input(overrides = {}) {
  return structuredClone({ ...base, ...overrides });
}

function assertPass(overrides = {}) {
  const result = validateBedTransferPhase1Contract(input(overrides));
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
}

function assertReject(overrides, code) {
  const result = validateBedTransferPhase1Contract(input(overrides));
  assert.equal(result.ok, false, JSON.stringify(result));
  if (code) assert.equal(result.error_code, code);
  return result;
}

test("charged 50 AED / 5000 fils passes", () => {
  const result = assertPass();
  assert.equal(result.fee_amount_aed, 50);
  assert.equal(result.fee_amount_fils, 5000);
});

test("waived zero fee with reason passes", () => {
  const result = assertPass({ fee_choice: "waived", fee_amount_aed: 0, fee_amount_fils: 0, payment_method: "", waiver_reason: "medical exception" });
  assert.equal(result.fee_choice, "waived");
});

test("invalid fee choices and amounts reject", () => {
  for (const fee_choice of ["none", "free", "no_fee", "1", "49", "51", "partial", "unpaid"]) {
    assertReject({ fee_choice }, "BED_TRANSFER_FEE_CHOICE_INVALID");
  }
  assertReject({ fee_amount_aed: 49, fee_amount_fils: 4900 }, "BED_TRANSFER_FEE_AMOUNT_INVALID");
  assertReject({ fee_amount_aed: 51, fee_amount_fils: 5100 }, "BED_TRANSFER_FEE_AMOUNT_INVALID");
  assertReject({ fee_amount_aed: 50, fee_amount_fils: 5001 }, "BED_TRANSFER_FEE_AMOUNT_INVALID");
  assertReject({ fee_choice: "charged", payment_method: "" }, "BED_TRANSFER_PAYMENT_METHOD_REQUIRED");
});

test("same bed and bed 334 are rejected", () => {
  assertReject({ to_bed: "145" }, "BED_TRANSFER_SAME_BED_NOT_ALLOWED");
  assertReject({ from_bed: "334" }, "BED_TRANSFER_334_FORBIDDEN");
  assertReject({ to_bed: "334" }, "BED_TRANSFER_334_FORBIDDEN");
});

test("source E/e and target non-E/e are rejected", () => {
  assertReject({ source_context: { ...base.source_context, physical_bed_status: "vacant", physical_bed_status_source: "access_snapshot_E_marker", parsed_vacancy_marker: true } }, "BED_TRANSFER_SOURCE_ALREADY_TTLOCK_VACANT");
  assertReject({ target_context: { ...base.target_context, physical_bed_status: "not_marked_vacant", physical_bed_status_source: "access_snapshot_no_E", parsed_vacancy_marker: false } }, "BED_TRANSFER_TARGET_NOT_TTLOCK_VACANT");
});

test("missing, fallback, ambiguous, stale, and conflicting snapshots reject", () => {
  for (const patch of [
    { physical_bed_status: "unknown", physical_bed_status_source: "missing_access_snapshot", candidate_count: 0 },
    { data_source: "materialized_cache", fallback: true },
    { candidate_count: 2, ambiguous: true, conflict: true },
    { stale: true },
    { conflict: true }
  ]) {
    assertReject({ source_context: { ...base.source_context, ...patch } }, "BED_TRANSFER_ACCESS_SNAPSHOT_UNAVAILABLE");
  }
});

test("missing source D rejects but D0 passes", () => {
  assertReject({ source_context: { ...base.source_context, parsed_deposit_amount: null } }, "BED_TRANSFER_SOURCE_DEPOSIT_D_UNAVAILABLE");
  assertPass({ source_context: { ...base.source_context, parsed_deposit_amount: 0 } });
});

test("arrears carryover requires one exact ref and full remaining amount", () => {
  assertPass();
  const one = { id: "arrears-145", remaining_arrears: 80 };
  assertPass({ cloud_arrears_ref: "arrears-145", arrears_carryover: true, carried_arrears_amount: 80, source_context: { ...base.source_context, open_arrears: [one] } });
  assertReject({ source_context: { ...base.source_context, open_arrears: [one] } }, "BED_TRANSFER_ARREARS_CARRYOVER_INVALID");
  assertReject({ cloud_arrears_ref: "wrong", arrears_carryover: true, carried_arrears_amount: 80, source_context: { ...base.source_context, open_arrears: [one] } }, "BED_TRANSFER_ARREARS_CARRYOVER_INVALID");
  assertReject({ cloud_arrears_ref: "arrears-145", arrears_carryover: true, carried_arrears_amount: 40, source_context: { ...base.source_context, open_arrears: [one] } }, "BED_TRANSFER_ARREARS_CARRYOVER_INVALID");
  assertReject({ cloud_arrears_ref: "arrears-145", arrears_carryover: true, carried_arrears_amount: 80, source_context: { ...base.source_context, open_arrears: [one, { id: "arrears-146", remaining_arrears: 20 }] } }, "BED_TRANSFER_MULTIPLE_OPEN_ARREARS_UNSUPPORTED");
});

test("different properties pass within the same company scope", () => {
  const result = assertPass();
  assert.equal(result.company_scope, "corp-a");
  assert.equal(result.source_context.rent_coverage_start, "2026-08-01");
  assert.equal(result.source_context.rent_coverage_end, "2026-09-01");
});

test("provider identity is rejected and never returned", () => {
  const result = assertReject({ tenant_card_id: "provider-only" }, "BED_TRANSFER_FORBIDDEN_IDENTITY_FIELD");
  assert.equal(JSON.stringify(result).includes("tenant_card_id"), false);
  assert.equal(JSON.stringify(assertPass()).includes("card_id"), false);
});

test("rent coverage requires absolute start and end dates", () => {
  assertReject({ source_context: { ...base.source_context, current_rent_coverage_start: "08/01/2026" } }, "BED_TRANSFER_RENT_COVERAGE_REQUIRED");
  assertReject({ source_context: { ...base.source_context, current_rent_coverage_end: "" } }, "BED_TRANSFER_RENT_COVERAGE_REQUIRED");
});

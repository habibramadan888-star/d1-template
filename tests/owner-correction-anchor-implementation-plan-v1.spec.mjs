import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/OWNER_CORRECTION_ANCHOR_IMPLEMENTATION_PLAN_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("correction anchor implementation plan exists and is planning-only", async () => {
  const text = await doc();
  assert.match(text, /Owner Correction Anchor Implementation Plan V1/);
  assert.match(text, /implementation planning only/i);
  assert.match(text, /No runtime correction code/i);
  assert.match(text, /No production data changes/i);
  assert.match(text, /No migration/i);
  assert.match(text, /No deploy/i);
});

test("plan defines owner_correction_anchor_v1", async () => {
  const text = await doc();
  assert.match(text, /owner_correction_anchor_v1/);
  assert.match(text, /correction_anchor_contract_version = owner_correction_anchor_v1/);
  assert.match(text, /CORRECTION ANCHORS JSON/);
});

test("plan defines no-migration storage strategy", async () => {
  const text = await doc();
  assert.match(text, /No-Migration Storage Strategy/);
  assert.match(text, /existing `sessions` and `export_text` mechanism/);
  assert.match(text, /First implementation should not require a new table or new columns/i);
  assert.match(text, /correction session must be owner\/system sourced/i);
  assert.match(text, /must not rewrite the target employee session/i);
});

test("plan defines correction session common fields", async () => {
  const text = await doc();
  for (const field of [
    "correction_session_id",
    "correction_anchor_id",
    "correction_type",
    "target_session_id",
    "target_session_anchor",
    "target_employee_userid",
    "target_business_date",
    "created_by",
    "created_by_role",
    "authorized_by",
    "authorized_role",
    "created_at",
    "effective_date",
    "correction_reason",
    "evidence_summary",
    "status = pending / applied / rejected / reversed / voided",
    "production_write_scope",
    "no_hard_delete = true",
    "original_events_immutable = true"
  ]) {
    assert.match(text, new RegExp(escaped(field), "i"));
  }
});

test("plan defines correction event fields", async () => {
  const text = await doc();
  for (const field of [
    "correction_event_id",
    "correction_event_type",
    "original_event_id",
    "original_entry_id",
    "original_session_id",
    "original_anchor",
    "affected_bed",
    "affected_event_type",
    "affected_arrears_ref",
    "affected_deposit_ref",
    "affected_occupancy_candidate_id",
    "financial_effect",
    "projection_effect",
    "audit_note",
    "evidence_summary"
  ]) {
    assert.match(text, new RegExp(escaped(field), "i"));
  }
});

test("plan defines correction event types", async () => {
  const text = await doc();
  for (const eventType of [
    "void_duplicate_event",
    "reverse_event",
    "correction_adjustment_event",
    "arrears_waiver_event",
    "deposit_adjustment_event",
    "repayment_reversal_event",
    "dispute_marker_event",
    "owner_note_event"
  ]) {
    assert.match(text, new RegExp(escaped(eventType)));
  }
});

test("plan defines financial_effect schema", async () => {
  const text = await doc();
  for (const field of [
    "cash_delta",
    "bank_delta",
    "gross_delta",
    "rent_income_delta",
    "deposit_liability_delta",
    "arrears_repaid_delta",
    "arrears_open_delta",
    "expense_delta",
    "transfer_fee_delta"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
  assert.match(text, /Duplicate rent void/i);
  assert.match(text, /Repayment reversal/i);
  assert.match(text, /Arrears waiver/i);
  assert.match(text, /Deposit offset to arrears/i);
});

test("plan defines projection_effect schema", async () => {
  const text = await doc();
  for (const field of [
    "affects_owner_finance",
    "affects_arrears_state",
    "affects_deposit_state",
    "affects_occupancy_state",
    "affects_checkout_eligibility",
    "affects_access_network_future"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
  assert.match(text, /first no-migration implementation may adjust only owner detail and owner summary projection/i);
});

test("plan defines owner parser raw adjusted and audit modes", async () => {
  const text = await doc();
  assert.match(text, /Owner Parser Strategy/);
  assert.match(text, /Raw Mode/);
  assert.match(text, /Adjusted Mode/);
  assert.match(text, /Audit Mode/);
  assert.match(text, /Correction-adjusted totals must be derived additively/i);
  assert.match(text, /Parser must not remove original lines/i);
  assert.match(text, /Parser must not silently mutate source session/i);
});

test("plan includes x6wio example and adjusted total 80", async () => {
  const text = await doc();
  assert.match(text, /EMPV3-20260707-abdul-w1ofc/);
  assert.match(text, /EMPV3-20260707-abdul-x6wio/);
  assert.match(text, /#334 arrears_payment 80/);
  assert.match(text, /cash_delta": -700/);
  assert.match(text, /cash_delta": -770/);
  assert.match(text, /cash_delta = -1470/);
  assert.match(text, /gross_delta = -1470/);
  assert.match(text, /rent_income_delta = -1470/);
  assert.match(text, /1550 - 1470 = 80/);
  assert.match(text, /Do not touch:[\s\S]*EMPV3-20260707-abdul-w1ofc/);
});

test("plan defines original immutability and forbidden mutation rules", async () => {
  const text = await doc();
  assert.match(text, /Original employee events remain immutable/i);
  assert.match(text, /must not rewrite the target employee session/i);
  assert.match(text, /must not silently edit source employee events/i);
  assert.match(text, /correction does not hard-delete/i);
  assert.match(text, /correction does not silently mutate original/i);
});

test("plan forbids card tenant provider identity dependencies", async () => {
  const text = await doc();
  assert.match(text, /card_id/);
  assert.match(text, /tenant_card_id/);
  assert.match(text, /hardware card id/i);
  assert.match(text, /provider phone/i);
  assert.match(text, /access-card metadata phone/i);
  assert.match(text, /99099/);
});

test("plan defines safety validation rules", async () => {
  const text = await doc();
  for (const rule of [
    "original_event_id` exists",
    "original session exists",
    "original event is not already voided by another active correction",
    "financial_effect` matches original event amount",
    "correction reason is present",
    "authorized_by` is present",
    "does not hard-delete",
    "does not silently mutate original",
    "negative impossible deposit state",
    "negative impossible arrears state"
  ]) {
    assert.match(text, new RegExp(escaped(rule), "i"));
  }
});

test("plan defines owner approval workflow", async () => {
  const text = await doc();
  assert.match(text, /Owner Approval Workflow/);
  for (const state of ["draft", "reviewed", "approved", "applied", "reversed", "voided"]) {
    assert.match(text, new RegExp(escaped(state)));
  }
  assert.match(text, /owner can create and apply/i);
  assert.match(text, /admin may draft/i);
  assert.match(text, /employee may request only and cannot apply/i);
  assert.match(text, /preview adjusted total/i);
  assert.match(text, /confirmation before apply/i);
});

test("plan defines no-go conditions", async () => {
  const text = await doc();
  for (const condition of [
    "no unique `original_event_id`",
    "correction requires hard delete",
    "correction requires direct edit of original event",
    "parser cannot apply additive correction",
    "adjusted totals cannot be reconciled",
    "correction requires migration but task forbids migration",
    "correction depends on `card_id`",
    "correction would break owner parser",
    "correction would alter existing source facts"
  ]) {
    assert.match(text, new RegExp(escaped(condition), "i"));
  }
});

test("plan defines future phases H1 through H6", async () => {
  const text = await doc();
  for (const phase of ["Phase H1", "Phase H2", "Phase H3", "Phase H4", "Phase H5", "Phase H6"]) {
    assert.match(text, new RegExp(escaped(phase)));
  }
  assert.match(text, /Correction anchor parser only, with fixtures/i);
  assert.match(text, /Owner correction draft\/preview API, no write/i);
  assert.match(text, /Owner correction write using existing sessions\/export_text, no migration/i);
  assert.match(text, /Future durable `correction_events` table migration/i);
});

test("plan defines future runtime tests and next step", async () => {
  const text = await doc();
  for (const required of [
    "parse correction anchor",
    "apply duplicate rent void",
    "x6wio fixture adjusted from `1550` to `80`",
    "original w1ofc unchanged",
    "old sessions without corrections still parse",
    "correction with missing `original_event_id` rejected",
    "double correction rejected",
    "repayment reversal restores arrears",
    "waiver does not create cash income",
    "bed transfer correction preserves from/to audit"
  ]) {
    assert.match(text, new RegExp(escaped(required), "i"));
  }
  assert.match(text, /STEP H1: Implement correction anchor parser only with fixtures, no writes and no owner UI changes/i);
  assert.match(text, /GO_TO_H1_CORRECTION_PARSER_IMPLEMENTATION/);
  assert.match(text, /Runtime behavior changed in this step: no/i);
  assert.match(text, /Production data changed in this step: no/i);
  assert.match(text, /Migration in this step: no/i);
  assert.match(text, /Deploy in this step: no/i);
});

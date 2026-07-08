import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/OWNER_CORRECTION_VOID_REVERSAL_PLAN_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("owner correction plan document exists and is planning-only", async () => {
  const text = await doc();
  assert.match(text, /Owner Correction \/ Void \/ Reversal Plan V1/);
  assert.match(text, /planning only/i);
  assert.match(text, /No runtime implementation/i);
  assert.match(text, /No production data changes/i);
  assert.match(text, /No deploy/i);
});

test("plan defines immutable original events and additive corrections", async () => {
  const text = await doc();
  assert.match(text, /Original uploaded employee events must be immutable/i);
  assert.match(text, /Corrections must be represented as new additive owner\/system events/i);
  assert.match(text, /original event remains visible/i);
});

test("plan defines correction event types", async () => {
  const text = await doc();
  for (const eventType of [
    "void_event",
    "reversal_event",
    "correction_event",
    "owner_adjustment_event",
    "arrears_waiver_event",
    "deposit_adjustment_event",
    "repayment_reversal_event",
    "duplicate_upload_correction_event",
    "dispute_marker_event"
  ]) {
    assert.match(text, new RegExp(escaped(eventType)));
  }
});

test("plan defines common correction fields", async () => {
  const text = await doc();
  for (const field of [
    "correction_event_id",
    "correction_type",
    "original_event_id",
    "original_session_id",
    "original_anchor",
    "affected_bed",
    "affected_occupancy_candidate_id",
    "affected_arrears_ref",
    "affected_deposit_ref",
    "correction_reason",
    "authorized_by",
    "authorized_role",
    "created_at",
    "effective_date",
    "financial_effect",
    "projection_effect",
    "audit_note",
    "evidence_summary",
    "status = pending / applied / rejected / reversed / voided"
  ]) {
    assert.match(text, new RegExp(escaped(field), "i"));
  }
});

test("plan defines financial effect model", async () => {
  const text = await doc();
  for (const phrase of [
    "Duplicate Rent Void",
    "rent_adjustment = -700",
    "Duplicate Deposit Void",
    "deposit_liability_adjustment = -200",
    "Wrong Arrears Payment Reversal",
    "arrears_remaining_adjustment = +80",
    "Arrears Waiver",
    "waiver does not create cash income",
    "Deposit Offset to Arrears"
  ]) {
    assert.match(text, new RegExp(escaped(phrase), "i"));
  }
});

test("plan defines projection effect model", async () => {
  const text = await doc();
  for (const phrase of [
    "owner finance summary",
    "cash total",
    "bank total",
    "gross received",
    "rent income",
    "deposit liability",
    "arrears_state",
    "deposit_balance_state",
    "occupancy_state",
    "checkout eligibility",
    "owner history detail",
    "employee history audit"
  ]) {
    assert.match(text, new RegExp(escaped(phrase), "i"));
  }
});

test("plan defines duplicate upload correction model and x6wio example", async () => {
  const text = await doc();
  assert.match(text, /Duplicate Upload Correction Model/);
  assert.match(text, /EMPV3-20260707-abdul-w1ofc/);
  assert.match(text, /EMPV3-20260707-abdul-x6wio/);
  assert.match(text, /keep `#334 arrears_payment 80`/);
  assert.match(text, /void duplicate `#334 rent 700`/);
  assert.match(text, /void duplicate `#134 rent 770`/);
  assert.match(text, /reduce x6wio correction-adjusted total from `1550` to `80`/);
  assert.match(text, /No x6wio production correction is applied in this step/i);
});

test("plan defines owner approval workflow", async () => {
  const text = await doc();
  assert.match(text, /Owner Approval Workflow/);
  assert.match(text, /Only owner-authorized users may apply correction events/i);
  assert.match(text, /Employees may request correction review/i);
  assert.match(text, /mandatory reason/i);
  assert.match(text, /attachment\/proof or evidence summary/i);
  assert.match(text, /approved correction becomes `applied`/);
  assert.match(text, /reversed by a new `reversal_event`/);
});

test("plan forbids hard delete silent overwrite and forbidden identity fields", async () => {
  const text = await doc();
  assert.match(text, /no hard delete/i);
  assert.match(text, /no silent overwrite/i);
  assert.match(text, /no direct production mutation without correction event/i);
  assert.match(text, /no correction based only on bed/i);
  assert.match(text, /card_id/);
  assert.match(text, /tenant_card_id/);
  assert.match(text, /provider phone/i);
  assert.match(text, /99099/);
});

test("plan defines event-specific correction rules for all events", async () => {
  const text = await doc();
  for (const eventType of [
    "Rent",
    "Arrears Payment",
    "Deposit In",
    "Deposit Out",
    "Checkout",
    "Left With Arrears",
    "Expense",
    "Bed Transfer"
  ]) {
    assert.match(text, new RegExp(`### [A-H]\\. ${escaped(eventType)}`));
  }
});

test("plan defines bed transfer correction", async () => {
  const text = await doc();
  assert.match(text, /Bed Transfer Correction/);
  assert.match(text, /reverse transfer fee/i);
  assert.match(text, /reverse occupancy movement/i);
  assert.match(text, /restore old bed expected state/i);
  assert.match(text, /restore new bed expected state/i);
  assert.match(text, /restore deposit movement/i);
  assert.match(text, /restore rent coverage movement/i);
  assert.match(text, /restore arrears movement/i);
  assert.match(text, /owner approval/i);
});

test("plan defines arrears correction", async () => {
  const text = await doc();
  assert.match(text, /Arrears Correction/);
  assert.match(text, /void short-paid arrears/i);
  assert.match(text, /adjust remaining arrears/i);
  assert.match(text, /reverse repayment/i);
  assert.match(text, /waive arrears/i);
  assert.match(text, /mark disputed arrears/i);
  assert.match(text, /never settle by bed only/i);
  assert.match(text, /affected_arrears_ref/);
});

test("plan defines deposit correction", async () => {
  const text = await doc();
  assert.match(text, /Deposit Correction/);
  assert.match(text, /adjust deposit balance/i);
  assert.match(text, /reverse wrong deposit in/i);
  assert.match(text, /reverse wrong deposit out/i);
  assert.match(text, /offset deposit to arrears/i);
  assert.match(text, /owner override required/i);
  assert.match(text, /D200` is context only, not authority/i);
});

test("plan defines storage strategy and future tests", async () => {
  const text = await doc();
  assert.match(text, /Existing Sessions \/ Export Text Anchor Block/);
  assert.match(text, /Existing Transaction Rows/);
  assert.match(text, /Future `correction_events` Table/);
  assert.match(text, /duplicate rent void reduces totals/i);
  assert.match(text, /original event remains immutable/i);
  assert.match(text, /owner parser displays original plus correction/i);
  assert.match(text, /old sessions without correction still parse/i);
});

test("plan defines no-go conditions and next step", async () => {
  const text = await doc();
  for (const condition of [
    "correction requires hard delete",
    "original event cannot be uniquely identified",
    "correction would silently alter original event",
    "correction would break owner parser",
    "correction would break financial totals",
    "correction requires migration but task forbids migration",
    "arrears projection cannot be safely updated",
    "deposit projection cannot be safely updated"
  ]) {
    assert.match(text, new RegExp(escaped(condition), "i"));
  }
  assert.match(text, /GO_TO_OWNER_CORRECTION_IMPLEMENTATION_PLAN/);
  assert.match(text, /Runtime behavior changed in this step: no/i);
  assert.match(text, /Production data changed in this step: no/i);
  assert.match(text, /Migration in this step: no/i);
  assert.match(text, /Deploy in this step: no/i);
});

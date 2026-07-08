import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/OCCUPANCY_CANDIDATE_DRY_RUN_PREVIEW_CONTRACT_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("dry-run preview contract exists and remains planning-only", async () => {
  const text = await doc();
  assert.match(text, /Occupancy Candidate Dry-run Preview Contract V1/);
  assert.match(text, /planning only/i);
  assert.match(text, /No runtime implementation/i);
  assert.match(text, /No production data changes/i);
  assert.match(text, /No deploy/i);
});

test("contract defines occupancy_candidate_preview response shape", async () => {
  const text = await doc();
  for (const field of [
    "occupancy_candidate_preview",
    "enabled",
    "mode",
    "dry_run_preview_only",
    "no_write",
    "source",
    "server_dry_run",
    "candidate_persistence",
    "not_persisted",
    "migration_required_for_durable_id",
    "batch_id",
    "preview_generated_at",
    "events",
    "batch_warnings",
    "batch_anomalies"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
});

test("contract defines event preview object and candidate basis", async () => {
  const text = await doc();
  for (const field of [
    "event_index",
    "event_id",
    "event_type",
    "bed",
    "from_bed",
    "to_bed",
    "occupancy_candidate_id",
    "occupancy_candidate_status",
    "candidate_basis",
    "property_id",
    "business_date",
    "access_snapshot_summary",
    "linked_event_id",
    "linked_arrears_ref",
    "staff_entered_customer_phone_present"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
});

test("contract defines no-write proof pack", async () => {
  const text = await doc();
  for (const field of [
    "no_write_proof",
    "dry_run = true",
    "write_endpoints_called = []",
    "d1_write_count = 0",
    "session_write_attempted = false",
    "transaction_write_attempted = false",
    "arrear_task_write_attempted = false",
    "deposit_write_attempted = false",
    "access_snapshot_write_attempted = false",
    "occupancy_write_attempted = false",
    "owner_history_write_attempted = false",
    "real_upload_called = false"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
});

test("contract defines no-write fallback proof limitation", async () => {
  const text = await doc();
  assert.match(text, /write_guard_mode/);
  assert.match(text, /route_level_no_write/);
  assert.match(text, /proof_limitations/);
  assert.match(text, /D1 write count not measured, but validate route does not call write functions/);
});

test("contract forbids provider and card identity inputs", async () => {
  const text = await doc();
  for (const forbidden of [
    "card_id",
    "tenant_card_id",
    "hardware card id",
    "provider phone",
    "access-card metadata phone",
    "99099",
    "forbidden_inputs_used",
    "provider_phone",
    "phone_99099"
  ]) {
    assert.match(text, new RegExp(escaped(forbidden), "i"));
  }
  assert.match(text, /no confident candidate is generated/i);
});

test("contract defines all event-by-event preview rules", async () => {
  const text = await doc();
  for (const heading of [
    "### A. Rent",
    "### B. Arrears Payment",
    "### C. Deposit In",
    "### D. Deposit Out",
    "### E. Checkout Normal",
    "### F. Left With Arrears",
    "### G. Expense",
    "### H. Bed Transfer"
  ]) {
    assert.match(text, new RegExp(escaped(heading)));
  }
});

test("rent and arrears payment preview rules are explicit", async () => {
  const text = await doc();
  assert.match(text, /`candidate_created` if no active candidate exists/i);
  assert.match(text, /`candidate_continued` if the bed has an active candidate/i);
  assert.match(text, /Short-paid rent links future arrears to the same candidate/i);
  assert.match(text, /inherit candidate from selected `arrears_ref` \/ `original_event_id`/i);
  assert.match(text, /must not create a new candidate from payment alone/i);
  assert.match(text, /must not derive candidate only by bed/i);
});

test("deposit and checkout preview rules are explicit", async () => {
  const text = await doc();
  assert.match(text, /candidate_created` when `deposit_reason = new/i);
  assert.match(text, /candidate_continued` when `deposit_reason = balance` or `additional`/i);
  assert.match(text, /candidate_unresolved` if deposit reason is unclear/i);
  assert.match(text, /open arrears for same candidate blocks refund/i);
  assert.match(text, /candidate_checkout_pending/i);
  assert.match(text, /candidate_closed_preview/i);
  assert.match(text, /CHECKOUT_WITH_OPEN_ARREARS/);
});

test("left with arrears and expense preview rules are explicit", async () => {
  const text = await doc();
  assert.match(text, /candidate_left_with_arrears/i);
  assert.match(text, /old candidate remains financially open/i);
  assert.match(text, /bed may become available for a future new candidate/i);
  assert.match(text, /staff-entered phone is allowed/i);
  assert.match(text, /candidate_not_applicable/i);
  assert.match(text, /property\/company expense/i);
});

test("bed transfer preview defines same candidate migration", async () => {
  const text = await doc();
  for (const phrase of [
    "same candidate migration",
    "from_bed",
    "to_bed",
    "candidate_transferred",
    "from_state_before",
    "to_state_before",
    "from_state_after_expected",
    "to_state_after_expected",
    "deposit_moved",
    "rent_coverage_moved",
    "arrears_moved",
    "access_validity_moved",
    "BED_TRANSFER_TO_OCCUPIED_BED",
    "candidate_conflict",
    "must never create a new candidate"
  ]) {
    assert.match(text, new RegExp(escaped(phrase), "i"));
  }
});

test("contract defines candidate status enum", async () => {
  const text = await doc();
  for (const status of [
    "candidate_created",
    "candidate_continued",
    "candidate_unresolved",
    "candidate_conflict",
    "candidate_transferred",
    "candidate_left_with_arrears",
    "candidate_checkout_pending",
    "candidate_closed_preview",
    "candidate_not_applicable"
  ]) {
    assert.match(text, new RegExp(escaped(status)));
  }
});

test("contract defines anomaly model and required risk codes", async () => {
  const text = await doc();
  for (const field of [
    "risk_code",
    "risk_level",
    "confidence_score",
    "event_index",
    "event_id",
    "suggested_action",
    "source_fields",
    "low",
    "medium",
    "high",
    "critical"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
  for (const risk of [
    "SAME_BED_NEW_CUSTOMER_WITH_ACTIVE_CANDIDATE",
    "ARREARS_PAYMENT_WITHOUT_ORIGINAL_CANDIDATE",
    "DEPOSIT_OUT_WITHOUT_ACTIVE_CANDIDATE",
    "CHECKOUT_WITHOUT_ACTIVE_CANDIDATE",
    "CHECKOUT_WITH_OPEN_ARREARS",
    "BED_TRANSFER_WITHOUT_FROM_CANDIDATE",
    "BED_TRANSFER_TO_OCCUPIED_BED",
    "PROVIDER_METADATA_USED_FOR_CANDIDATE",
    "CARD_ID_USED_FOR_CANDIDATE",
    "TENANT_CARD_ID_USED_FOR_CANDIDATE",
    "PHONE_99099_USED_FOR_CANDIDATE",
    "CANDIDATE_AMBIGUOUS"
  ]) {
    assert.match(text, new RegExp(escaped(risk)));
  }
});

test("contract defines future live verification proof pack", async () => {
  const text = await doc();
  assert.match(text, /Future implementation cannot be called `LIVE_VERIFIED` unless this proof exists/i);
  assert.match(text, /Only `POST \/api\/employee\/entry\/validate` is called/i);
  assert.match(text, /`POST \/api\/employee\/entry` is blocked/i);
  assert.match(text, /One normal Rent fixture/i);
  assert.match(text, /One Arrears Payment fixture/i);
  assert.match(text, /One Bed Transfer fixture/i);
  assert.match(text, /Raw request payload is captured/i);
  assert.match(text, /Raw response body is captured/i);
  assert.match(text, /Evidence states what was not verified/i);
});

test("contract defines no-go conditions for future implementation", async () => {
  const text = await doc();
  for (const condition of [
    "active candidate lookup requires migration",
    "candidate generation requires `card_id`",
    "candidate generation requires `tenant_card_id`",
    "candidate generation requires provider phone",
    "candidate generation requires `99099` phone",
    "current runtime cannot identify active bed state safely",
    "bed transfer target status cannot be determined",
    "dry-run cannot prove no write",
    "response would confuse candidate preview with durable `occupancy_session_id`"
  ]) {
    assert.match(text, new RegExp(escaped(condition), "i"));
  }
});

test("contract does not authorize runtime implementation", async () => {
  const text = await doc();
  assert.match(text, /This document does not authorize runtime implementation/i);
  assert.match(text, /Runtime behavior changed in this step: no/i);
  assert.match(text, /Production data changed in this step: no/i);
  assert.match(text, /Migration in this step: no/i);
  assert.match(text, /Deploy in this step: no/i);
});

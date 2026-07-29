import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/OWNER_CORRECTION_APPLY_WRITE_PLAN_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("H3 apply write plan exists and is planning only", async () => {
  const text = await doc();
  assert.match(text, /Owner Correction Apply \/ Write Plan V1/);
  assert.match(text, /planning only/i);
  assert.match(text, /No apply endpoint implemented/i);
  assert.match(text, /No correction anchors written/i);
  assert.match(text, /No production data changes/i);
  assert.match(text, /No migration/i);
  assert.match(text, /No deploy/i);
});

test("plan defines no-migration correction session write strategy", async () => {
  const text = await doc();
  assert.match(text, /No-Migration Write Strategy/);
  assert.match(text, /existing `sessions` \/ `export_text` mechanism/);
  assert.match(text, /HOMELINK OWNER CORRECTION/);
  assert.match(text, /CORRECTION ANCHORS JSON/);
  assert.match(text, /Do not require a new DB table/i);
  assert.match(text, /Do not require new columns/i);
  assert.match(text, /Future migration may add a durable `correction_events` table/i);
});

test("plan defines apply endpoint and access model", async () => {
  const text = await doc();
  assert.match(text, /POST \/api\/owner\/corrections\/apply/);
  assert.match(text, /Owner can apply/i);
  assert.match(text, /Admin may draft or preview only/i);
  assert.match(text, /Employee must never apply correction/i);
  for (const field of [
    "target_session_anchor",
    "target_session_id",
    "correction_type",
    "correction_reason",
    "evidence_summary",
    "correction_events",
    "preview_hash",
    "idempotency_key",
    "explicit_owner_confirmation"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
});

test("plan defines preview_hash binding and rejection rules", async () => {
  const text = await doc();
  assert.match(text, /Preview-to-Apply Binding/);
  for (const required of [
    "preview_hash",
    "target_session_anchor",
    "target_session_id",
    "financial_effect",
    "original_totals",
    "correction_totals",
    "adjusted_totals",
    "target session content hash",
    "owner identity",
    "preview timestamp window"
  ]) {
    assert.match(text, new RegExp(escaped(required), "i"));
  }
  assert.match(text, /target session changed since preview/i);
  assert.match(text, /original totals changed since preview/i);
  assert.match(text, /correction totals changed/i);
  assert.match(text, /adjusted totals changed/i);
});

test("plan defines explicit owner confirmation contract", async () => {
  const text = await doc();
  assert.match(text, /Owner Confirmation Contract/);
  for (const field of [
    "confirmed",
    "understands_original_events_immutable",
    "understands_no_hard_delete",
    "understands_correction_is_additive",
    "confirmed_adjusted_gross",
    "confirmed_correction_gross_delta",
    "confirmed_target_session_anchor"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
  assert.match(text, /Reject if confirmation is missing/i);
});

test("plan defines idempotency and duplicate correction guard", async () => {
  const text = await doc();
  assert.match(text, /Idempotency and Duplicate Correction Guard/);
  assert.match(text, /idempotency_key/);
  assert.match(text, /correction_request_fingerprint/);
  assert.match(text, /Same `idempotency_key` with identical fingerprint returns the existing correction result/);
  assert.match(text, /Same `idempotency_key` with different fingerprint is rejected/);
  assert.match(text, /Never double-void the same `original_event_id`/);
  assert.match(text, /already voided by an active correction is rejected/);
});

test("plan defines correction session and event fields", async () => {
  const text = await doc();
  for (const field of [
    "correction_session_id",
    "correction_anchor_id",
    "correction_anchor_contract_version",
    "target_session_id",
    "target_session_anchor",
    "target_employee_userid",
    "target_business_date",
    "authorized_by",
    "authorized_role",
    "applied_at",
    "status = applied",
    "preview_hash",
    "idempotency_key",
    "correction_request_fingerprint",
    "production_write_scope = correction_anchor_only",
    "correction_event_id",
    "correction_event_type",
    "original_event_id",
    "original_session_id",
    "original_anchor",
    "affected_bed",
    "affected_event_type",
    "affected_arrears_ref",
    "affected_deposit_ref",
    "affected_occupancy_candidate_id",
    "financial_effect",
    "projection_effect",
    "audit_note"
  ]) {
    assert.match(text, new RegExp(escaped(field), "i"));
  }
});

test("plan includes x6wio apply example with adjusted total 80", async () => {
  const text = await doc();
  assert.match(text, /EMPV3-20260707-abdul-x6wio/);
  assert.match(text, /S20260707-x6wio/);
  assert.match(text, /ent20260707-x6wio-01/);
  assert.match(text, /#334 arrears_payment 80/);
  assert.match(text, /ent20260707-x6wio-02/);
  assert.match(text, /ent20260707-x6wip-03/);
  assert.match(text, /cash_delta = -1470/);
  assert.match(text, /gross_delta = -1470/);
  assert.match(text, /rent_income_delta = -1470/);
  assert.match(text, /cash = 80/);
  assert.match(text, /gross = 80/);
  assert.match(text, /rent_income = 0/);
  assert.match(text, /arrears_repaid = 80/);
  assert.match(text, /Do not apply this in H3 planning/);
});

test("plan defines atomicity failure handling and staged owner history integration", async () => {
  const text = await doc();
  assert.match(text, /Atomicity and Failure Handling/);
  assert.match(text, /No partial correction events without a correction session/i);
  assert.match(text, /No original source session mutation/i);
  assert.match(text, /No transaction row mutation/i);
  assert.match(text, /No `arrear_tasks` mutation/i);
  assert.match(text, /No deposit ledger mutation/i);
  assert.match(text, /Owner History Integration Plan/);
  assert.match(text, /Owner adjusted summary must not change in H3/i);
  assert.match(text, /H4: Owner parser reads correction sessions/i);
  assert.match(text, /H5: Owner History displays original total, correction total, adjusted total/i);
  assert.match(text, /H6: Correction reversal support/i);
});

test("plan defines security authorization and validation rules", async () => {
  const text = await doc();
  assert.match(text, /Security and Authorization/);
  assert.match(text, /Employee forbidden/i);
  assert.match(text, /Owner required for apply/i);
  assert.match(text, /same `corpid` \/ tenant/i);
  assert.match(text, /card_id/);
  assert.match(text, /tenant_card_id/);
  assert.match(text, /provider phone/);
  assert.match(text, /99099/);
  assert.match(text, /Validation Rules/);
  for (const rule of [
    "target_session_anchor` missing",
    "Target session not found",
    "correction_events` empty",
    "original_event_id` missing",
    "original_event_id` not found",
    "already corrected by active correction",
    "financial_effect` missing",
    "financial_effect` mismatch",
    "hard_delete = true",
    "silent_overwrite = true",
    "preview_hash` invalid",
    "Owner confirmation missing",
    "idempotency_key` missing",
    "Target session changed since preview"
  ]) {
    assert.match(text, new RegExp(escaped(rule), "i"));
  }
});

test("plan defines no-go conditions and required future tests", async () => {
  const text = await doc();
  assert.match(text, /No-Go Conditions/);
  for (const condition of [
    "Apply requires migration",
    "Apply requires direct edit of original session",
    "Apply requires hard delete",
    "Apply cannot ensure idempotency",
    "Apply cannot prevent double correction",
    "Apply cannot bind to a successful preview",
    "Apply cannot verify owner authorization",
    "Apply would silently change owner History totals",
    "Apply depends on `card_id`"
  ]) {
    assert.match(text, new RegExp(escaped(condition), "i"));
  }
  assert.match(text, /Required Future Tests/);
  for (const required of [
    "Owner can apply correction anchor",
    "Employee forbidden",
    "Preview hash required",
    "Invalid preview hash rejected",
    "Changed target session rejected",
    "Missing confirmation rejected",
    "Idempotency repeat returns existing correction",
    "Double correction rejected",
    "Original x6wio session unchanged",
    "No transaction row mutation",
    "Forbidden identity rejected"
  ]) {
    assert.match(text, new RegExp(escaped(required), "i"));
  }
});

test("plan recommends next implementation gate", async () => {
  const text = await doc();
  assert.match(text, /GO_TO_H3_APPLY_ENDPOINT_IMPLEMENTATION/);
  assert.match(text, /recomputes H2 preview/i);
  assert.match(text, /validates preview hash/i);
  assert.match(text, /writes only a new owner\/system correction session/i);
  assert.match(text, /PRODUCTION_NO_GO/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/OWNER_HISTORY_RESPONSE_FIELDS_H4B_PLAN_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("H4B endpoint audit plan document exists and is planning only", async () => {
  const text = await doc();
  assert.match(text, /Owner History Response Fields H4B Plan V1/);
  assert.match(text, /planning only/i);
  assert.match(text, /does not implement runtime Owner History response changes/i);
  assert.match(text, /additive response fields only/i);
  assert.match(text, /Existing visible totals remain raw\/source totals/i);
});

test("plan identifies owner History endpoint inventory", async () => {
  const text = await doc();
  for (const route of [
    "GET /api/history",
    "GET /api/session_detail?id=...",
    "GET /api/owner/history",
    "GET /api/owner/overview/comparative-summary"
  ]) {
    assert.match(text, new RegExp(escaped(route)));
  }
  for (const handler of [
    "handleRequest",
    "phase0Entries",
    "phase0OwnerOverviewComparativeSummary"
  ]) {
    assert.match(text, new RegExp(escaped(handler)));
  }
});

test("plan defines current response contract and current owner UI dependencies", async () => {
  const text = await doc();
  for (const field of [
    "id",
    "anchor_id",
    "date",
    "entries_count",
    "operator_name",
    "export_text",
    "cash_handover",
    "bank_transfer_total",
    "gross_received",
    "event_type",
    "amount",
    "payment_method"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
  assert.match(text, /expects an array/i);
  assert.match(text, /raw\/source fields/i);
});

test("plan defines additive correction_summary contract", async () => {
  const text = await doc();
  assert.match(text, /correction_summary/);
  for (const field of [
    "correction_aware",
    "correction_applied",
    "raw_totals",
    "correction_totals",
    "adjusted_totals",
    "correction_events_count",
    "invalid_corrections_count",
    "warnings"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
});

test("plan defines optional correction_audit contract", async () => {
  const text = await doc();
  assert.match(text, /correction_audit/);
  for (const field of [
    "raw_mode_available",
    "adjusted_mode_available",
    "audit_mode_available",
    "original_events_visible",
    "correction_events_visible",
    "correction_sessions",
    "correction_events",
    "invalid_corrections"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
});

test("plan states existing top-level raw totals remain unchanged", async () => {
  const text = await doc();
  assert.match(text, /top-level `cash_handover`, `bank_transfer_total`, `gross_received`/);
  assert.match(text, /remain unchanged/i);
  assert.match(text, /Default current fields remain raw totals/i);
  assert.match(text, /must not replace that array with an object/i);
});

test("plan defines correction session discovery strategy", async () => {
  const text = await doc();
  for (const required of [
    "HOMELINK OWNER CORRECTION",
    "CORRECTION ANCHORS JSON",
    "anchor_contract_version = owner_correction_anchor_v1",
    "target_session_anchor",
    "target_session_id",
    "status = applied",
    "pending",
    "rejected",
    "reversed",
    "voided",
    "original_event_id"
  ]) {
    assert.match(text, new RegExp(escaped(required), "i"));
  }
});

test("plan defines performance and scope strategy", async () => {
  const text = await doc();
  assert.match(text, /Do not scan entire production history/i);
  assert.match(text, /Detail endpoint first/i);
  assert.match(text, /List endpoint second/i);
  assert.match(text, /Summary endpoints later/i);
  assert.match(text, /include_corrections=1/i);
  assert.match(text, /Preserve the default array response/i);
});

test("plan includes x6wio expected future behavior", async () => {
  const text = await doc();
  assert.match(text, /EMPV3-20260707-abdul-x6wio/);
  assert.match(text, /S20260707-x6wio/);
  assert.match(text, /gross = 1550/);
  assert.match(text, /cash = 1550/);
  assert.match(text, /correction_totals\.gross_delta = -1470/);
  assert.match(text, /adjusted_totals\.gross = 80/);
  assert.match(text, /adjusted_totals\.cash = 80/);
  assert.match(text, /adjusted_totals\.rent_income = 0/);
  assert.match(text, /adjusted_totals\.arrears_repaid = 80/);
});

test("plan defines safety rules and no-go conditions", async () => {
  const text = await doc();
  for (const rule of [
    "not mutate original sessions",
    "not hide original source events",
    "not change old top-level total fields",
    "not enable production apply",
    "not write production data",
    "not add migration",
    "not double-apply corrections",
    "fail closed"
  ]) {
    assert.match(text, new RegExp(escaped(rule), "i"));
  }
  for (const noGo of [
    "exact owner History endpoint cannot be identified",
    "adding fields would break existing response consumers",
    "expensive full-history scan",
    "silently replace raw totals"
  ]) {
    assert.match(text, new RegExp(escaped(noGo), "i"));
  }
});

test("plan defines future H4B implementation tests", async () => {
  const text = await doc();
  for (const futureTest of [
    "old owner history response unchanged at top level",
    "new `correction_summary` exists where enabled",
    "no correction sessions returns `correction_applied = false`",
    "fixture correction session returns adjusted total 80",
    "raw totals remain 1550",
    "correction totals are -1470",
    "adjusted totals are 80",
    "original events visible",
    "correction events visible",
    "invalid correction gives warning",
    "duplicate correction not double-applied",
    "owner UI compatibility regression",
    "duplicate guard regression",
    "rent upload regression",
    "arrears payment regression",
    "bed transfer regression"
  ]) {
    assert.match(text, new RegExp(escaped(futureTest), "i"));
  }
});

test("plan forbids production write apply migration UI changes and raw total replacement", async () => {
  const text = await doc();
  for (const forbidden of [
    "Production data changed: no",
    "Deploy: no",
    "Migration: no",
    "Owner UI changed: no",
    "Employee UI changed: no",
    "Production apply enabled: no",
    "x6wio production data corrected: no",
    "Default current fields remain raw totals",
    "new fields are additive only"
  ]) {
    assert.match(text, new RegExp(escaped(forbidden), "i"));
  }
});

test("plan forbids provider identity linkage", async () => {
  const text = await doc();
  for (const forbiddenIdentity of [
    "card_id",
    "tenant_card_id",
    "provider phone",
    "99099",
    "old_ttlock_ref"
  ]) {
    assert.match(text, new RegExp(escaped(forbiddenIdentity), "i"));
  }
});

test("H4B.0 does not wire runtime correction-aware parser into worker", async () => {
  const workerText = await readFile("deploy-worker/src/index.js", "utf8");
  assert.doesNotMatch(workerText, /correction-aware-history-parser\.mjs/);
  assert.doesNotMatch(workerText, /buildCorrectionAwareOwnerHistoryView/);
  assert.doesNotMatch(workerText, /OWNER_HISTORY_RESPONSE_FIELDS_H4B/);
});

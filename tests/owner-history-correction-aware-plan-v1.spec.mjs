import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/OWNER_HISTORY_CORRECTION_AWARE_PLAN_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("H4 owner history correction-aware plan exists and is planning only", async () => {
  const text = await doc();
  assert.match(text, /Owner History Correction-Aware Plan V1/);
  assert.match(text, /planning only/i);
  assert.match(text, /No runtime owner parser changes/i);
  assert.match(text, /No production apply enablement/i);
  assert.match(text, /No production data changes/i);
  assert.match(text, /No migration/i);
  assert.match(text, /No deploy/i);
});

test("plan defines raw adjusted and audit modes", async () => {
  const text = await doc();
  assert.match(text, /Raw Mode/);
  assert.match(text, /original sessions only/i);
  assert.match(text, /existing behavior/i);
  assert.match(text, /Adjusted Mode/);
  assert.match(text, /adjusted_totals = raw_totals \+ correction_totals/);
  assert.match(text, /Audit Mode/);
  assert.match(text, /original session/i);
  assert.match(text, /correction session/i);
  assert.match(text, /linked correction events/i);
});

test("plan defines correction session discovery and owner_correction_anchor_v1 parsing", async () => {
  const text = await doc();
  assert.match(text, /Correction Session Discovery/);
  assert.match(text, /sessions` \/ `export_text` mechanism/);
  assert.match(text, /HOMELINK OWNER CORRECTION/);
  assert.match(text, /CORRECTION ANCHORS JSON/);
  assert.match(text, /anchor_contract_version = owner_correction_anchor_v1/);
  for (const field of ["target_session_id", "target_session_anchor", "original_event_id", "correction_event_id"]) {
    assert.match(text, new RegExp(escaped(field)));
  }
});

test("plan defines correction application rules", async () => {
  const text = await doc();
  assert.match(text, /Correction Application Rules/);
  for (const rule of [
    "status = applied",
    "no_hard_delete = true",
    "original_events_immutable = true",
    "target session exists",
    "original_event_id` exists in target session",
    "correction event not reversed",
    "correction event not voided",
    "same `corpid`"
  ]) {
    assert.match(text, new RegExp(escaped(rule), "i"));
  }
  for (const blocked of [
    "pending correction",
    "rejected correction",
    "reversed correction",
    "voided correction",
    "correction missing `original_event_id`",
    "invalid `financial_effect`",
    "another company",
    "card_id",
    "tenant_card_id",
    "provider phone",
    "99099"
  ]) {
    assert.match(text, new RegExp(escaped(blocked), "i"));
  }
});

test("plan defines financial aggregation model", async () => {
  const text = await doc();
  assert.match(text, /Financial Aggregation Model/);
  assert.match(text, /raw_totals/);
  assert.match(text, /correction_totals/);
  assert.match(text, /adjusted_totals/);
  assert.match(text, /raw_totals \+ correction_totals/);
  for (const field of [
    "cash",
    "bank",
    "gross",
    "rent_income",
    "deposit_liability",
    "arrears_repaid",
    "arrears_open",
    "expense",
    "transfer_fee"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
  assert.match(text, /Do not infer correction amounts from free text/i);
  assert.match(text, /Do not double-apply/i);
});

test("plan includes x6wio display example with adjusted total 80", async () => {
  const text = await doc();
  assert.match(text, /EMPV3-20260707-abdul-x6wio/);
  assert.match(text, /S20260707-x6wio/);
  assert.match(text, /cash = 1550/);
  assert.match(text, /gross = 1550/);
  assert.match(text, /rent_income = 1470/);
  assert.match(text, /arrears_repaid = 80/);
  assert.match(text, /cash_delta = -1470/);
  assert.match(text, /gross_delta = -1470/);
  assert.match(text, /rent_income_delta = -1470/);
  assert.match(text, /cash = 80/);
  assert.match(text, /gross = 80/);
  assert.match(text, /rent_income = 0/);
  assert.match(text, /#334 arrears_payment 80/);
  assert.match(text, /#334 rent 700 duplicate/);
  assert.match(text, /#134 rent 770 duplicate/);
  assert.match(text, /void #334 rent 700/);
  assert.match(text, /void #134 rent 770/);
});

test("plan defines owner summary impact and raw adjusted separation", async () => {
  const text = await doc();
  assert.match(text, /Owner Summary Impact/);
  for (const metric of [
    "daily total",
    "employee total",
    "cash total",
    "bank total",
    "rent income",
    "arrears repayment total",
    "deposit liability",
    "expense total"
  ]) {
    assert.match(text, new RegExp(escaped(metric), "i"));
  }
  assert.match(text, /Do not silently hide raw totals/i);
  assert.match(text, /Adjusted totals must be visibly labeled/i);
});

test("plan defines audit requirements", async () => {
  const text = await doc();
  assert.match(text, /Audit Requirements/);
  for (const field of [
    "correction anchor id",
    "correction session id",
    "correction type",
    "correction reason",
    "evidence summary",
    "authorized_by",
    "applied_at",
    "idempotency_key",
    "preview_hash",
    "original_event_id",
    "financial_effect"
  ]) {
    assert.match(text, new RegExp(escaped(field), "i"));
  }
  assert.match(text, /Original records remain visible/i);
  assert.match(text, /unchanged/i);
});

test("plan defines safety fallback rules", async () => {
  const text = await doc();
  assert.match(text, /Safety and Fallback Rules/);
  assert.match(text, /do not corrupt original history/i);
  assert.match(text, /raw mode must still work/i);
  assert.match(text, /adjusted mode should report warning/i);
  assert.match(text, /invalid \/ unresolved/i);
  assert.match(text, /do not partially apply ambiguous correction/i);
  assert.match(text, /correction session remains visible as unresolved/i);
  assert.match(text, /fail closed/i);
  assert.match(text, /do not double subtract/i);
});

test("plan defines no-go conditions", async () => {
  const text = await doc();
  assert.match(text, /No-Go Conditions/);
  for (const condition of [
    "parser would mutate original sessions",
    "parser would hide original source events",
    "parser cannot link correction to `original_event_id`",
    "parser could double-apply correction",
    "adjusted totals cannot be reconciled",
    "correction parsing breaks old owner history",
    "implementation requires migration",
    "implementation requires enabling production apply",
    "card_id",
    "tenant_card_id",
    "provider phone"
  ]) {
    assert.match(text, new RegExp(escaped(condition), "i"));
  }
});

test("plan defines future H4A through H4E phases and required future tests", async () => {
  const text = await doc();
  for (const phase of ["H4A", "H4B", "H4C", "H4D", "H4E"]) {
    assert.match(text, new RegExp(escaped(phase)));
  }
  assert.match(text, /fixture-only correction-aware owner parser tests/i);
  assert.match(text, /Runtime Owner History response includes `raw_totals`, `correction_totals`, and `adjusted_totals`/);
  assert.match(text, /Owner detail audit mode displays original \+ correction \+ adjusted/);
  assert.match(text, /allow controlled correction apply/i);
  assert.match(text, /Optional UI polish/i);
  for (const required of [
    "old owner history without corrections unchanged",
    "parse correction sessions",
    "link correction to target session",
    "x6wio adjusted total = `80`",
    "original events visible",
    "correction events visible",
    "raw totals unchanged",
    "adjusted totals correct",
    "duplicate correction not double-applied",
    "invalid correction ignored with warning",
    "pending / rejected corrections not applied",
    "reversed corrections not applied",
    "forbidden identity rejected",
    "owner parser regression passes",
    "daily summary raw / adjusted separation",
    "employee summary raw / adjusted separation",
    "no migration",
    "no production write"
  ]) {
    assert.match(text, new RegExp(escaped(required), "i"));
  }
});

test("plan recommends H4A fixture parser implementation next", async () => {
  const text = await doc();
  assert.match(text, /GO_TO_H4A_FIXTURE_OWNER_HISTORY_PARSER_IMPLEMENTATION/);
  assert.match(text, /fixture-only first/i);
  assert.match(text, /should not change runtime Owner History behavior/i);
});

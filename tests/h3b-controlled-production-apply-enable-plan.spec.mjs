import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/H3B_CONTROLLED_PRODUCTION_APPLY_ENABLE_PLAN_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("H3B controlled production apply enable plan exists and is planning only", async () => {
  const text = await doc();
  assert.match(text, /H3B Controlled Production Apply Enable Plan V1/);
  assert.match(text, /planning only/i);
  assert.match(text, /No production apply enabled/i);
  assert.match(text, /No correction applied to x6wio/i);
  assert.match(text, /No correction anchor written/i);
  assert.match(text, /No production data changed/i);
  assert.match(text, /No migration/i);
  assert.match(text, /No deploy/i);
});

test("plan defines target-scoped allow mechanism instead of broad apply", async () => {
  const text = await doc();
  assert.match(text, /target-scoped allow mechanism/i);
  assert.match(text, /one-time, target-scoped, and disabled by default/i);
  assert.match(text, /reject every other target/i);
  assert.match(text, /Do Not Use Broad Global Write Gate Alone/);
  assert.match(text, /OWNER_CORRECTION_APPLY_ENABLED=true/);
  assert.match(text, /broad global apply flag may allow unintended correction writes/i);
  assert.match(text, /add a second narrow allowlist gate/i);
});

test("plan includes exact x6wio target session id and anchor", async () => {
  const text = await doc();
  for (const value of [
    "S20260707-x6wio",
    "EMPV3-20260707-abdul-x6wio",
    "duplicate_upload_correction"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("plan includes exact original_event_id allowlist", async () => {
  const text = await doc();
  assert.match(text, /allowed `original_event_id` list must exactly equal/);
  assert.match(text, /ent20260707-x6wio-02/);
  assert.match(text, /ent20260707-x6wip-03/);
  assert.match(text, /allowed original_event_id list exactly equals `ent20260707-x6wio-02` and `ent20260707-x6wip-03`/);
});

test("plan includes exact correction and adjusted totals", async () => {
  const text = await doc();
  for (const value of [
    "correction_gross_delta` must equal `-1470`",
    "adjusted_gross` must equal `80`",
    "correction_cash_delta` must equal `-1470`",
    "adjusted_cash` must equal `80`",
    "raw gross = `1550`",
    "raw cash = `1550`",
    "raw rent_income = `1470`",
    "raw arrears_repaid = `80`"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("plan requires preview_hash idempotency_key and explicit owner confirmation", async () => {
  const text = await doc();
  assert.match(text, /`idempotency_key` is required/);
  assert.match(text, /`preview_hash` is required/);
  assert.match(text, /explicit owner confirmation is required/i);
  for (const field of [
    "confirmed",
    "understands_original_events_immutable",
    "understands_no_hard_delete",
    "understands_correction_is_additive",
    "confirmed_target_session_anchor",
    "confirmed_target_session_id",
    "confirmed_correction_gross_delta",
    "confirmed_adjusted_gross",
    "confirmed_correction_cash_delta",
    "confirmed_adjusted_cash"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
});

test("plan defines required pre-apply checks", async () => {
  const text = await doc();
  assert.match(text, /Required Pre-Apply Checks/);
  for (const check of [
    "original gross still `1550`",
    "original cash still `1550`",
    "correction gross_delta still `-1470`",
    "correction cash_delta still `-1470`",
    "adjusted gross still `80`",
    "adjusted cash still `80`",
    "original events still exist",
    "correction events list exactly `2`",
    "no existing active correction already voided these event IDs",
    "`preview_hash` matches the recomputed preview",
    "`idempotency_key` is present",
    "production apply is disabled unless narrow one-time authorization is present"
  ]) {
    assert.match(text, new RegExp(escaped(check), "i"));
  }
});

test("plan defines required post-apply verification", async () => {
  const text = await doc();
  assert.match(text, /Required Post-Apply Verification/);
  for (const check of [
    "correction anchor session exists",
    "original x6wio data remains unchanged",
    "no hard delete occurred",
    "no transaction row mutation occurred",
    "no `arrear_tasks` mutation occurred",
    "no deposit mutation occurred",
    "`correction_applied = true`",
    "`correction_totals.gross_delta = -1470`",
    "`adjusted_totals.gross = 80`",
    "`correction_totals.cash_delta = -1470`",
    "`adjusted_totals.cash = 80`",
    "legacy endpoint remains compatible",
    "production apply gate is disabled again"
  ]) {
    assert.match(text, new RegExp(escaped(check), "i"));
  }
});

test("plan defines rollback and reversal without deletion", async () => {
  const text = await doc();
  assert.match(text, /Rollback \/ Reversal Plan/);
  for (const check of [
    "Do not delete the correction anchor",
    "Do not mutate the original employee session",
    "Do not mutate transaction rows",
    "Do not mutate `arrear_tasks`",
    "Do not mutate deposit ledger rows",
    "Create a reversal correction anchor",
    "original correction and the reversal"
  ]) {
    assert.match(text, new RegExp(escaped(check), "i"));
  }
});

test("plan defines no-go conditions", async () => {
  const text = await doc();
  assert.match(text, /No-Go Conditions/);
  for (const condition of [
    "cannot implement target-scoped apply authorization",
    "broad global apply is the only protection",
    "`preview_hash` cannot be verified",
    "original session changed",
    "event IDs changed",
    "existing correction already applies",
    "H4B detail endpoint cannot show adjusted result",
    "applying requires migration",
    "applying requires mutating original session",
    "applying requires modifying `arrear_tasks`",
    "applying requires modifying deposit ledger rows",
    "applying requires modifying transactions",
    "owner confirmation is missing"
  ]) {
    assert.match(text, new RegExp(escaped(condition), "i"));
  }
});

test("plan defines H3B.1 through H3B.7 future phases", async () => {
  const text = await doc();
  for (const phase of [
    "H3B.1: implement target-scoped production apply authorization gate, disabled by default",
    "H3B.2: live verify gate rejects non-x6wio targets",
    "H3B.3: prepare final x6wio apply payload and `preview_hash`",
    "H3B.4: owner explicit confirmation",
    "H3B.5: single controlled apply",
    "H3B.6: immediate post-apply verification",
    "H3B.7: disable gate again"
  ]) {
    assert.match(text, new RegExp(escaped(phase)));
  }
});

test("plan preserves planning-step forbidden boundaries", async () => {
  const text = await doc();
  for (const boundary of [
    "production write",
    "enabling production apply",
    "applying correction to x6wio",
    "writing correction anchor",
    "migration",
    "owner UI changes",
    "employee UI changes",
    "employee upload changes",
    "owner History visible total changes",
    "transaction mutation",
    "`arrear_tasks` mutation",
    "deposit ledger mutation",
    "replacing `tenant_card_id` legacy matching",
    "implementing WhatsApp compiler"
  ]) {
    assert.match(text, new RegExp(escaped(boundary), "i"));
  }
  assert.match(text, /GO_TO_H3B1_TARGET_SCOPED_APPLY_AUTHORIZATION_GATE/);
  assert.match(text, /DO_NOT_IMPLEMENT_YET/);
  assert.match(text, /PRODUCTION_NO_GO/);
});

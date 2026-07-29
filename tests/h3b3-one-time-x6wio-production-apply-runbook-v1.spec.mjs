import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/H3B3_ONE_TIME_X6WIO_PRODUCTION_APPLY_RUNBOOK_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scriptBlock(text) {
  const label = "11. One-Time Apply Browser Console Script";
  const heading = new RegExp(`^#{1,6}\\s+${escaped(label)}\\s*$`, "m").exec(text);
  assert.ok(heading, "manual script heading should exist");
  const sectionStart = heading.index + heading[0].length;
  const remainder = text.slice(sectionStart);
  const nextHeading = /\r?\n#{1,6}\s+/.exec(remainder);
  const section = remainder.slice(0, nextHeading ? nextHeading.index : remainder.length);
  const openingFence = /```(?:js|javascript)[^\S\r\n]*\r?\n/i.exec(section);
  assert.ok(openingFence, "manual js block should exist");
  const bodyStart = openingFence.index + openingFence[0].length;
  const closingFence = /\r?\n```[^\S\r\n]*(?:\r?\n|$)/.exec(section.slice(bodyStart));
  assert.ok(closingFence, "manual js block should terminate");
  return section.slice(bodyStart, bodyStart + closingFence.index);
}

test("H3B3 one-time x6wio runbook exists and is documentation only", async () => {
  const text = await doc();
  assert.match(text, /H3B3 One-Time x6wio Production Apply Runbook V1/);
  assert.match(text, /execution runbook only/i);
  assert.match(text, /No production apply enabled in this step/i);
  assert.match(text, /No correction applied to x6wio in this step/i);
  assert.match(text, /No correction anchor written in this step/i);
  assert.match(text, /No production data changed/i);
  assert.match(text, /No migration/i);
  assert.match(text, /No deploy/i);
});

test("runbook records owner business confirmation and kept arrears payment", async () => {
  const text = await doc();
  assert.match(text, /Owner confirmed the 80 AED arrears_payment in x6wio was real cash received/);
  assert.match(text, /keep `ent20260707-x6wio-01`/);
  assert.match(text, /#334 arrears_payment 80/);
  assert.match(text, /void duplicate rent `ent20260707-x6wio-02`/);
  assert.match(text, /void duplicate rent `ent20260707-x6wip-03`/);
});

test("runbook includes exact x6wio target and correction type", async () => {
  const text = await doc();
  for (const value of [
    "S20260707-x6wio",
    "EMPV3-20260707-abdul-x6wio",
    "duplicate_upload_correction"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("runbook includes exact original_event_id allowlist only", async () => {
  const text = await doc();
  assert.match(text, /Allowed original_event_id list must be exactly/);
  assert.match(text, /ent20260707-x6wio-02/);
  assert.match(text, /ent20260707-x6wip-03/);
  assert.match(text, /No extra event IDs/);
  assert.match(text, /No missing event IDs/);
  assert.match(text, /Do not include `ent20260707-x6wio-01`/);
});

test("runbook includes expected before correction and after totals", async () => {
  const text = await doc();
  for (const value of [
    "gross = `1550`",
    "cash = `1550`",
    "rent_income = `1470`",
    "arrears_repaid = `80`",
    "gross_delta = `-1470`",
    "cash_delta = `-1470`",
    "rent_income_delta = `-1470`",
    "arrears_repaid_delta = `0`",
    "gross = `80`",
    "cash = `80`",
    "rent_income = `0`"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("runbook documents actual H3B1 target-scoped gate values", async () => {
  const text = await doc();
  for (const value of [
    "OWNER_CORRECTION_APPLY_ENABLED=true",
    "OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED=true",
    "OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ID=S20260707-x6wio",
    "OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ANCHOR=EMPV3-20260707-abdul-x6wio",
    "OWNER_CORRECTION_ALLOWED_TYPE=duplicate_upload_correction",
    "OWNER_CORRECTION_ALLOWED_ORIGINAL_EVENT_IDS=ent20260707-x6wio-02,ent20260707-x6wip-03",
    "OWNER_CORRECTION_EXPECTED_GROSS_DELTA=-1470",
    "OWNER_CORRECTION_EXPECTED_CASH_DELTA=-1470",
    "OWNER_CORRECTION_EXPECTED_ADJUSTED_GROSS=80",
    "OWNER_CORRECTION_EXPECTED_ADJUSTED_CASH=80",
    "OWNER_CORRECTION_EXPECTED_RENT_INCOME_DELTA=-1470",
    "OWNER_CORRECTION_EXPECTED_ADJUSTED_RENT_INCOME=0",
    "OWNER_CORRECTION_EXPECTED_ADJUSTED_ARREARS_REPAID=80"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
  assert.match(text, /Do not set these variables in H3B3/);
  assert.match(text, /Broad global apply alone is not sufficient/);
});

test("runbook requires fresh preview hash and records stale prior hash only as reference", async () => {
  const text = await doc();
  assert.match(text, /Fresh preview_hash Requirement/);
  assert.match(text, /Do not rely on stale preview_hash/);
  assert.match(text, /och_16z8y2f/);
  assert.match(text, /re-run preview immediately before apply and use the fresh server-returned `preview_hash`/);
});

test("runbook includes explicit owner confirmation including 80 AED real payment field", async () => {
  const text = await doc();
  for (const value of [
    "\"confirmed\": true",
    "\"understands_original_events_immutable\": true",
    "\"understands_no_hard_delete\": true",
    "\"understands_correction_is_additive\": true",
    "\"confirmed_target_session_anchor\": \"EMPV3-20260707-abdul-x6wio\"",
    "\"confirmed_target_session_id\": \"S20260707-x6wio\"",
    "\"confirmed_correction_gross_delta\": -1470",
    "\"confirmed_adjusted_gross\": 80",
    "\"confirmed_correction_cash_delta\": -1470",
    "\"confirmed_adjusted_cash\": 80",
    "\"confirmed_80_aed_arrears_payment_was_real\": true"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("runbook includes exact final correction events and deltas", async () => {
  const text = await doc();
  for (const value of [
    "\"original_event_id\": \"ent20260707-x6wio-02\"",
    "\"affected_bed\": \"334\"",
    "\"cash_delta\": -700",
    "\"gross_delta\": -700",
    "\"rent_income_delta\": -700",
    "\"original_event_id\": \"ent20260707-x6wip-03\"",
    "\"affected_bed\": \"134\"",
    "\"cash_delta\": -770",
    "\"gross_delta\": -770",
    "\"rent_income_delta\": -770"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("one-time script checks H4B before apply and H2 preview before typed confirmation", async () => {
  const script = scriptBlock(await doc());
  const beforeIndex = script.indexOf("/api/session_detail");
  const previewIndex = script.indexOf("/api/owner/corrections/preview");
  const promptIndex = script.indexOf("window.prompt");
  const applyIndex = script.indexOf("/api/owner/corrections/apply");

  assert.ok(beforeIndex > -1);
  assert.ok(previewIndex > beforeIndex);
  assert.ok(promptIndex > previewIndex);
  assert.ok(applyIndex > promptIndex);
  assert.match(script, /beforeSummary\.correction_applied === false/);
  assert.match(script, /beforeSummary\.adjusted_totals\?\.gross === 1550/);
  assert.match(script, /beforeSummary\.correction_events_count === 0/);
  assert.match(script, /preview\.json\.correction_totals\?\.gross_delta === -1470/);
  assert.match(script, /preview\.json\.adjusted_totals\?\.gross === 80/);
  assert.match(script, /preview_hash\.length > 0/);
});

test("one-time script requires exact typed confirmation before apply", async () => {
  const script = scriptBlock(await doc());
  assert.match(script, /REQUIRED_TYPED_CONFIRMATION = "APPLY_X6WIO_CORRECTION_80_REAL"/);
  assert.match(script, /typed !== REQUIRED_TYPED_CONFIRMATION/);
  assert.match(script, /APPLY_CANCELLED_TYPED_CONFIRMATION_MISMATCH/);
  assert.match(script, /body: JSON\.stringify\(applyPayload\)/);
});

test("one-time script validates H4B after apply", async () => {
  const script = scriptBlock(await doc());
  assert.match(script, /POST APPLY H4B DETAIL RESULT/);
  assert.match(script, /correction_applied: afterSummary\.correction_applied === true/);
  assert.match(script, /correction_gross_delta: afterSummary\.correction_totals\?\.gross_delta/);
  assert.match(script, /adjusted_gross: afterSummary\.adjusted_totals\?\.gross/);
  assert.match(script, /adjusted_cash: afterSummary\.adjusted_totals\?\.cash/);
  assert.match(script, /adjusted_rent_income: afterSummary\.adjusted_totals\?\.rent_income/);
  assert.match(script, /adjusted_arrears_repaid: afterSummary\.adjusted_totals\?\.arrears_repaid/);
});

test("runbook includes pre apply post apply disable gate rollback and no-go sections", async () => {
  const text = await doc();
  for (const heading of [
    "Pre-Apply Checklist",
    "Post-Apply Verification Checklist",
    "Disable Gate Checklist",
    "Rollback / Reversal Reminder",
    "No-Go Conditions"
  ]) {
    assert.match(text, new RegExp(escaped(heading)));
  }
});

test("runbook post-apply and disable-gate checklists include required safety checks", async () => {
  const text = await doc();
  for (const value of [
    "apply returns `ok = true`",
    "correction anchor session exists",
    "original x6wio rows remain unchanged",
    "no hard delete",
    "no transaction row mutation",
    "no `arrear_tasks` mutation",
    "no deposit mutation",
    "legacy detail endpoint remains compatible",
    "`/api/history` list remains compatible",
    "disable `OWNER_CORRECTION_APPLY_ENABLED`",
    "disable `OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED`",
    "verify `/api/owner/corrections/apply` returns `OWNER_CORRECTION_APPLY_DISABLED`"
  ]) {
    assert.match(text, new RegExp(escaped(value), "i"));
  }
});

test("runbook rollback reminder and no-go conditions forbid unsafe apply", async () => {
  const text = await doc();
  for (const value of [
    "do not delete correction anchor",
    "create reversal correction anchor",
    "target session not found",
    "preview_hash missing",
    "preview totals changed",
    "original gross no longer `1550`",
    "adjusted gross not `80`",
    "event IDs changed",
    "existing correction already applied",
    "target-scoped gate cannot be confirmed",
    "owner confirmation missing",
    "80 AED real-payment confirmation missing",
    "production apply would require migration",
    "apply would mutate original rows directly"
  ]) {
    assert.match(text, new RegExp(escaped(value), "i"));
  }
});

test("runbook does not expose secrets or implement unrelated scope", async () => {
  const text = await doc();
  assert.doesNotMatch(text, /token|cookie|password|secret/i);
  assert.match(text, /No production data changed/);
  assert.match(text, /No migration/);
  assert.match(text, /No deploy/);
  assert.match(text, /PRODUCTION_NO_GO/);
  assert.match(text, /PREPARE_H3B4_TEMPORARY_TARGET_SCOPED_GATE_ENABLE/);
  assert.match(text, /DO_NOT_PROCEED/);
});

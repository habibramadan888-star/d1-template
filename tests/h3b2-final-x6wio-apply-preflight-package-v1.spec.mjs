import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/H3B2_FINAL_X6WIO_APPLY_PREFLIGHT_PACKAGE_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scriptBlock(text) {
  const label = "15. Manual Live Verification Script";
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

test("H3B2 final x6wio apply preflight package exists and is no-write only", async () => {
  const text = await doc();
  assert.match(text, /H3B2 Final x6wio Apply Preflight Package V1/);
  assert.match(text, /preflight package only/i);
  assert.match(text, /No production apply enabled/i);
  assert.match(text, /No correction applied to x6wio/i);
  assert.match(text, /No correction anchor written/i);
  assert.match(text, /No production data changed/i);
  assert.match(text, /No migration/i);
  assert.match(text, /No deploy required by this document/i);
});

test("package contains exact x6wio target id anchor and current totals", async () => {
  const text = await doc();
  for (const value of [
    "S20260707-x6wio",
    "EMPV3-20260707-abdul-x6wio",
    "raw gross = `1550`",
    "raw cash = `1550`",
    "raw rent_income = `1470`",
    "raw arrears_repaid = `80`"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("package requires owner confirmation that 80 AED arrears payment was real", async () => {
  const text = await doc();
  assert.match(text, /The 80 AED arrears_payment in x6wio was real cash received/);
  assert.match(text, /confirmed_80_aed_arrears_payment_was_real/);
  assert.match(text, /If 80 AED was not real:/);
  assert.match(text, /this apply package is invalid/);
});

test("package contains exact correction event ids and financial effects", async () => {
  const text = await doc();
  for (const value of [
    "ent20260707-x6wio-02",
    "ent20260707-x6wip-03",
    "\"affected_bed\": \"334\"",
    "\"affected_bed\": \"134\"",
    "\"cash_delta\": -700",
    "\"gross_delta\": -700",
    "\"rent_income_delta\": -700",
    "\"cash_delta\": -770",
    "\"gross_delta\": -770",
    "\"rent_income_delta\": -770",
    "\"bank_delta\": 0",
    "\"deposit_liability_delta\": 0",
    "\"arrears_repaid_delta\": 0",
    "\"arrears_open_delta\": 0",
    "\"expense_delta\": 0",
    "\"transfer_fee_delta\": 0"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("package defines final preview and adjusted totals", async () => {
  const text = await doc();
  for (const value of [
    "correction gross_delta = `-1470`",
    "correction cash_delta = `-1470`",
    "correction rent_income_delta = `-1470`",
    "adjusted gross = `80`",
    "adjusted cash = `80`",
    "adjusted rent_income = `0`",
    "adjusted arrears_repaid = `80`",
    "original gross = `1550`",
    "original cash = `1550`"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("package requires preview_hash and stable idempotency key", async () => {
  const text = await doc();
  assert.match(text, /preview_hash Requirement/);
  assert.match(text, /exact `preview_hash` returned by the server preview response/);
  assert.match(text, /Do not hand-type or invent `preview_hash`/);
  assert.match(text, /idempotency_key Format/);
  assert.match(text, /H3B2-x6wio-duplicate-rent-1470-\$\{preview_hash_prefix\}/);
  assert.match(text, /Do not use a timestamp for the final apply payload idempotency key/);
});

test("package includes final apply payload shape and explicit owner confirmation payload", async () => {
  const text = await doc();
  assert.match(text, /Final Apply Payload Shape/);
  assert.match(text, /Explicit Owner Confirmation Payload/);
  for (const field of [
    "\"target_session_anchor\": \"EMPV3-20260707-abdul-x6wio\"",
    "\"target_session_id\": \"S20260707-x6wio\"",
    "\"correction_type\": \"duplicate_upload_correction\"",
    "\"preview_hash\": \"<from server preview>\"",
    "\"idempotency_key\": \"<stable key>\"",
    "\"confirmed\": true",
    "\"understands_original_events_immutable\": true",
    "\"understands_no_hard_delete\": true",
    "\"understands_correction_is_additive\": true",
    "\"confirmed_correction_gross_delta\": -1470",
    "\"confirmed_adjusted_gross\": 80",
    "\"confirmed_correction_cash_delta\": -1470",
    "\"confirmed_adjusted_cash\": 80",
    "\"confirmed_80_aed_arrears_payment_was_real\": true"
  ]) {
    assert.match(text, new RegExp(escaped(field)));
  }
});

test("package includes pre apply and post apply checklists", async () => {
  const text = await doc();
  assert.match(text, /Pre-Apply Checklist/);
  assert.match(text, /Post-Apply Checklist For Future Step/);
  for (const check of [
    "owner explicitly confirmed the 80 AED arrears_payment was real cash received",
    "H4B detail before apply returns `correction_applied = false`",
    "H2 preview returns correction gross_delta `-1470`",
    "H2 preview returns adjusted gross `80`",
    "`preview_hash` exists and is copied from the latest server preview",
    "production write scope is exactly one additive correction anchor session",
    "original x6wio session remains unchanged",
    "no transaction row was mutated",
    "no `arrear_tasks` row was mutated",
    "no deposit ledger row was mutated",
    "production apply gate is disabled again"
  ]) {
    assert.match(text, new RegExp(escaped(check), "i"));
  }
});

test("package includes no-go conditions and rollback reversal reminder", async () => {
  const text = await doc();
  assert.match(text, /No-Go Conditions/);
  assert.match(text, /Rollback \/ Reversal Reminder/);
  for (const check of [
    "owner has not confirmed that the 80 AED arrears_payment was real",
    "preview_hash is missing",
    "H2 preview totals differ from expected values",
    "H4B detail already shows `correction_applied = true`",
    "correction requires mutating transactions",
    "correction requires mutating `arrear_tasks`",
    "correction requires mutating deposit ledger",
    "do not delete the correction anchor",
    "create a reversal correction anchor",
    "adjusted totals must be derived from original plus correction plus reversal"
  ]) {
    assert.match(text, new RegExp(escaped(check), "i"));
  }
});

test("manual script calls detail and preview and validates expected preview totals", async () => {
  const text = await doc();
  const script = scriptBlock(text);
  assert.match(script, /\/api\/session_detail\?id=\$\{encodeURIComponent\(target_session_id\)\}&include_corrections=1/);
  assert.match(script, /\/api\/owner\/corrections\/preview/);
  for (const value of [
    "preview.json.original_totals?.gross === 1550",
    "preview.json.correction_totals?.gross_delta === -1470",
    "preview.json.adjusted_totals?.gross === 80",
    "preview.json.original_totals?.cash === 1550",
    "preview.json.correction_totals?.cash_delta === -1470",
    "preview.json.adjusted_totals?.cash === 80",
    "preview.json.adjusted_totals?.rent_income === 0",
    "preview.json.adjusted_totals?.arrears_repaid === 80",
    "preview_hash.length > 0"
  ]) {
    assert.match(script, new RegExp(escaped(value)));
  }
});

test("manual script builds final apply payload but does not submit it", async () => {
  const text = await doc();
  const script = scriptBlock(text);
  assert.match(script, /const finalApplyPayload = \{/);
  assert.match(script, /box\.value = JSON\.stringify\(finalApplyPayload, null, 2\)/);
  assert.match(script, /final_apply_payload_submitted: false/);
  assert.doesNotMatch(script, /body:\s*JSON\.stringify\(finalApplyPayload\)/);
  assert.doesNotMatch(script, /fetch\(["']\/api\/owner\/corrections\/apply["'][\s\S]{0,400}finalApplyPayload/);
});

test("manual script checks apply disabled gate only with dummy payload", async () => {
  const text = await doc();
  const script = scriptBlock(text);
  assert.match(script, /const disabledGatePayload = \{/);
  assert.match(script, /DUMMY-H3B2-DISABLED-GATE-CHECK/);
  assert.match(script, /body: JSON\.stringify\(disabledGatePayload\)/);
  assert.match(script, /OWNER_CORRECTION_APPLY_DISABLED/);
  assert.match(script, /disabledGate\.json\.no_write === true/);
  assert.match(script, /production_write: "no"/);
  assert.match(script, /production_cutover: "PRODUCTION_NO_GO"/);
});

test("manual script contains no write enablement or secret exposure", async () => {
  const text = await doc();
  const script = scriptBlock(text);
  assert.doesNotMatch(script, /OWNER_CORRECTION_APPLY_ENABLED/);
  assert.doesNotMatch(script, /OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED/);
  assert.doesNotMatch(script, /token|cookie|password|secret/i);
  assert.match(text, /No production data changed/);
  assert.match(text, /No migration/);
  assert.match(text, /PRODUCTION_NO_GO/);
});

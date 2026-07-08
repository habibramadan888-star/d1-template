import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/H3B5A_OWNER_BROWSER_ASSISTED_X6WIO_EXECUTION_HANDOFF_V1.md";

async function doc() {
  return readFile(DOC, "utf8");
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scriptBlock(text, label) {
  const heading = text.indexOf(label);
  assert.ok(heading >= 0, `${label} should exist`);
  const start = text.indexOf("```js\n", heading);
  const end = text.indexOf("```", start + 5);
  assert.ok(start >= 0, `${label} script block should exist`);
  assert.ok(end > start, `${label} script block should terminate`);
  return text.slice(start, end);
}

test("H3B5A handoff document exists and is no-write only", async () => {
  const text = await doc();
  assert.match(text, /H3B5A Owner-Browser Assisted x6wio Execution Handoff V1/);
  assert.match(text, /handoff package only/i);
  assert.match(text, /No production apply enabled in this step/i);
  assert.match(text, /No correction applied to x6wio in this step/i);
  assert.match(text, /No correction anchor written in this step/i);
  assert.match(text, /No production data changed/i);
  assert.match(text, /No migration/i);
  assert.match(text, /No deploy/i);
});

test("document explains shell 401 is expected and forbids auth bypass", async () => {
  const text = await doc();
  assert.match(text, /Owner correction APIs require an authenticated owner browser session/);
  assert.match(text, /HTTP `401` from shell is expected/);
  assert.match(text, /401` from shell is not a production bug/);
  assert.match(text, /Do not bypass authentication/);
  assert.match(text, /Do not weaken auth/);
  assert.match(text, /Do not create a temporary unauthenticated endpoint/);
});

test("document includes exact target business confirmation and expected totals", async () => {
  const text = await doc();
  for (const value of [
    "S20260707-x6wio",
    "EMPV3-20260707-abdul-x6wio",
    "duplicate_upload_correction",
    "Owner confirmed the 80 AED arrears_payment in x6wio was real cash received",
    "ent20260707-x6wio-01",
    "ent20260707-x6wio-02",
    "ent20260707-x6wip-03",
    "gross = `80`",
    "cash = `80`",
    "rent_income = `0`",
    "arrears_repaid = `80`"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("owner browser pre-check script exists and does not submit apply", async () => {
  const script = scriptBlock(await doc(), "Owner Browser Pre-Check Script");
  assert.match(script, /\/api\/session_detail\?id=\$\{encodeURIComponent\(target_session_id\)\}&include_corrections=1/);
  assert.match(script, /\/api\/owner\/corrections\/preview/);
  assert.match(script, /preview_hash/);
  assert.match(script, /finalApplyPayload/);
  assert.match(script, /final_apply_payload_submitted: false/);
  assert.match(script, /production_write: "no"/);
  assert.doesNotMatch(script, /\/api\/owner\/corrections\/apply/);
});

test("pre-check script verifies required before-apply and preview values", async () => {
  const script = scriptBlock(await doc(), "Owner Browser Pre-Check Script");
  for (const value of [
    "summary.correction_applied === false",
    "summary.correction_events_count === 0",
    "summary.raw_totals?.gross === 1550",
    "summary.adjusted_totals?.gross === 1550",
    "warnings.length === 0",
    "preview.json.original_totals?.gross === 1550",
    "preview.json.correction_totals?.gross_delta === -1470",
    "preview.json.adjusted_totals?.gross === 80",
    "preview.json.adjusted_totals?.cash === 80",
    "preview.json.adjusted_totals?.rent_income === 0",
    "preview.json.adjusted_totals?.arrears_repaid === 80",
    "preview.json.correction_events_count === 2"
  ]) {
    assert.match(script, new RegExp(escaped(value)));
  }
});

test("temporary gate enable instructions include exact config names and values", async () => {
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
    "OWNER_CORRECTION_EXPECTED_ADJUSTED_CASH=80"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
  assert.match(text, /Broad global apply alone must not be enough/);
});

test("final apply script requires exact typed confirmation before submitting", async () => {
  const script = scriptBlock(await doc(), "Final Owner-Browser Apply Script");
  const promptIndex = script.indexOf("window.prompt");
  const applyIndex = script.indexOf('/api/owner/corrections/apply');
  assert.ok(promptIndex > -1);
  assert.ok(applyIndex > promptIndex);
  assert.match(script, /REQUIRED_TYPED_CONFIRMATION = "APPLY_X6WIO_CORRECTION_80_REAL"/);
  assert.match(script, /typed !== REQUIRED_TYPED_CONFIRMATION/);
  assert.match(script, /APPLY_CANCELLED_TYPED_CONFIRMATION_MISMATCH/);
  assert.match(script, /body: JSON\.stringify\(applyPayload\)/);
});

test("final apply script reruns detail preview and verifies post-apply detail", async () => {
  const script = scriptBlock(await doc(), "Final Owner-Browser Apply Script");
  for (const value of [
    "beforeSummary.correction_applied !== false",
    "beforeSummary.raw_totals?.gross !== 1550",
    "preview.json.correction_totals?.gross_delta === -1470",
    "preview.json.adjusted_totals?.gross === 80",
    "preview.json.adjusted_totals?.cash === 80",
    "preview.json.adjusted_totals?.rent_income === 0",
    "preview.json.adjusted_totals?.arrears_repaid === 80",
    "correction_applied: afterSummary.correction_applied === true",
    "correction_events_count: afterSummary.correction_events_count",
    "correction_gross_delta: afterSummary.correction_totals?.gross_delta",
    "adjusted_gross: afterSummary.adjusted_totals?.gross",
    "original_events_visible: afterAudit.original_events_visible === true",
    "correction_events_visible: afterAudit.correction_events_visible === true"
  ]) {
    assert.match(script, new RegExp(escaped(value)));
  }
});

test("gate disable instructions and verification script exist", async () => {
  const text = await doc();
  const script = scriptBlock(text, "Gate Disable Instructions And Verification Script");
  assert.match(text, /disable global apply/);
  assert.match(text, /disable target-scoped gate/);
  assert.match(text, /clear or inert target allowlist/);
  assert.match(script, /\/api\/owner\/corrections\/apply/);
  assert.match(script, /OWNER_CORRECTION_APPLY_DISABLED/);
  assert.match(script, /no_write: disabled\.json\.no_write === true/);
  assert.match(script, /production_write_false: disabled\.json\.production_write === false/);
  assert.match(script, /correction_applied: summary\.correction_applied === true/);
  assert.match(script, /adjusted_gross: summary\.adjusted_totals\?\.gross/);
});

test("document includes no-go conditions and forbidden scope", async () => {
  const text = await doc();
  for (const value of [
    "No-Go Conditions",
    "owner browser pre-check fails",
    "preview_hash missing",
    "original gross not `1550`",
    "adjusted gross not `80`",
    "event IDs differ",
    "existing correction already applied",
    "target-scoped gate cannot be verified",
    "broad global apply alone could write",
    "apply would require migration",
    "apply would mutate original rows directly",
    "Forbidden In H3B5A",
    "enable production apply",
    "apply correction to x6wio",
    "write correction anchor",
    "modify production data",
    "add migration"
  ]) {
    assert.match(text, new RegExp(escaped(value), "i"));
  }
});

test("document forbids sensitive output and preserves production no-go", async () => {
  const text = await doc();
  assert.match(text, /do not print secrets\/tokens\/cookies\/passwords/i);
  assert.match(text, /OWNER_RUN_PRECHECK_IN_AUTHENTICATED_BROWSER/);
  assert.match(text, /DO_NOT_PROCEED/);
  assert.match(text, /PRODUCTION_NO_GO/);
});

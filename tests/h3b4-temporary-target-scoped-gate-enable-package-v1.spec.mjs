import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOC = "docs/H3B4_TEMPORARY_TARGET_SCOPED_GATE_ENABLE_PACKAGE_V1.md";

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

test("H3B4 temporary gate enable package exists and is preparation only", async () => {
  const text = await doc();
  assert.match(text, /H3B4 Temporary Target-Scoped Gate Enable Package V1/);
  assert.match(text, /preparation only/i);
  assert.match(text, /No production apply enabled in this step/i);
  assert.match(text, /No production environment variables set in this step/i);
  assert.match(text, /No correction applied to x6wio in this step/i);
  assert.match(text, /No correction anchor written in this step/i);
  assert.match(text, /No production data changed/i);
  assert.match(text, /No migration/i);
  assert.match(text, /No deploy/i);
});

test("document includes required prerequisites and current production status", async () => {
  const text = await doc();
  for (const value of [
    "H2 preview `LIVE_VERIFIED`",
    "H3B1 target-scoped gate `LIVE_VERIFIED`",
    "H4B detail endpoint `LIVE_VERIFIED`",
    "H3B2 preflight `LIVE_VERIFIED`",
    "H3B3 runbook `TEST_PASS`",
    "Owner confirmed the 80 AED arrears_payment in x6wio was real cash received",
    "production apply currently disabled",
    "x6wio not corrected"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("document records exact implemented config names from Worker code", async () => {
  const text = await doc();
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const names = [
    "OWNER_CORRECTION_APPLY_ENABLED",
    "OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED",
    "OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ID",
    "OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ANCHOR",
    "OWNER_CORRECTION_ALLOWED_TYPE",
    "OWNER_CORRECTION_ALLOWED_ORIGINAL_EVENT_IDS",
    "OWNER_CORRECTION_EXPECTED_GROSS_DELTA",
    "OWNER_CORRECTION_EXPECTED_CASH_DELTA",
    "OWNER_CORRECTION_EXPECTED_ADJUSTED_GROSS",
    "OWNER_CORRECTION_EXPECTED_ADJUSTED_CASH",
    "OWNER_CORRECTION_EXPECTED_RENT_INCOME_DELTA",
    "OWNER_CORRECTION_EXPECTED_ADJUSTED_RENT_INCOME",
    "OWNER_CORRECTION_EXPECTED_ADJUSTED_ARREARS_REPAID"
  ];

  assert.match(worker, /function ownerCorrectionApplyEnabled/);
  assert.match(worker, /function ownerCorrectionTargetScopeConfig/);
  assert.match(worker, /validateOwnerCorrectionTargetScopedApplyAuthorization/);

  for (const name of names) {
    assert.match(text, new RegExp(escaped(name)));
    assert.match(worker, new RegExp(escaped(name)));
  }
});

test("document classifies config kind and warns execution is no-go if runtime propagation is unsupported", async () => {
  const text = await doc();
  assert.match(text, /Worker environment variable \/ Worker var/);
  assert.match(text, /These are not secrets/);
  assert.match(text, /Runtime Cloudflare configuration propagation must be confirmed/);
  assert.match(text, /execution is `NO-GO`/);
});

test("document includes exact x6wio target values and event allowlist", async () => {
  const text = await doc();
  for (const value of [
    "S20260707-x6wio",
    "EMPV3-20260707-abdul-x6wio",
    "duplicate_upload_correction",
    "ent20260707-x6wio-02",
    "ent20260707-x6wip-03",
    "gross_delta = `-1470`",
    "cash_delta = `-1470`",
    "rent_income_delta = `-1470`",
    "gross = `80`",
    "cash = `80`",
    "rent_income = `0`",
    "arrears_repaid = `80`"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
  assert.match(text, /`ent20260707-x6wio-01` must not be in the void allowlist/);
});

test("document proves broad global gate is not enough", async () => {
  const text = await doc();
  assert.match(text, /Broad global apply enable alone must not permit writes/);
  assert.match(text, /target-scoped gate is fail-closed when disabled or missing config/);
  assert.match(text, /apply endpoint requires broad gate plus target-scoped gate before write path/);
  assert.match(text, /OWNER_CORRECTION_TARGET_SCOPE_REQUIRED/);
  assert.match(text, /global apply enable: `OWNER_CORRECTION_APPLY_ENABLED=true`/);
  assert.match(text, /target-scoped allow enable: `OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED=true`/);
});

test("Worker handler still checks broad gate then target scope before write path", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handlerIndex = worker.indexOf("async function handleOwnerCorrectionApply");
  const handlerEnd = worker.indexOf("__name(handleOwnerCorrectionApply", handlerIndex);
  const handler = worker.slice(handlerIndex, handlerEnd);
  const broadGate = handler.indexOf("ownerCorrectionApplyEnabled(env)");
  const targetGate = handler.indexOf("validateOwnerCorrectionTargetScopedApplyAuthorization");
  const writePath = handler.indexOf('empInsertDynamic(env,"sessions"');

  assert.ok(handlerIndex > -1);
  assert.ok(broadGate > -1);
  assert.ok(targetGate > broadGate);
  assert.ok(writePath > targetGate);
  assert.doesNotMatch(handler.slice(0, targetGate), /empInsertDynamic|env\.DB\.batch/i);
});

test("document includes full enable sequence and states it is not executed", async () => {
  const text = await doc();
  for (const value of [
    "A. Capture current configuration state",
    "B. Set only the minimum target-scoped variables",
    "C. Enable global apply",
    "D. Enable target-scoped apply",
    "E. Redeploy or confirm config propagation if required",
    "F. Run disabled/non-target rejection tests",
    "G. Run x6wio target preflight",
    "H. Only then proceed to the apply step",
    "# DO NOT RUN IN H3B4"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("document includes full disable sequence", async () => {
  const text = await doc();
  for (const value of [
    "A. Disable global apply",
    "B. Disable target-scoped apply",
    "C. Clear target-specific allowlist values or set them to inert values",
    "D. Redeploy or confirm config propagation if required",
    "E. Verify `/api/owner/corrections/apply` returns `OWNER_CORRECTION_APPLY_DISABLED`",
    "F. Verify H4B detail still shows `correction_applied=true`"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("before-enable verification script checks detail and disabled apply gate", async () => {
  const script = scriptBlock(await doc(), "Script A: Before Enabling");
  assert.match(script, /\/api\/session_detail\?id=\$\{encodeURIComponent\(target_session_id\)\}&include_corrections=1/);
  assert.match(script, /\/api\/owner\/corrections\/apply/);
  assert.match(script, /correction_applied: summary\.correction_applied === false/);
  assert.match(script, /OWNER_CORRECTION_APPLY_DISABLED/);
  assert.match(script, /no_write: disabled\.json\.no_write === true/);
  assert.match(script, /production_write: "no"/);
});

test("after-enable pre-apply script checks rejection cases and does not auto-submit exact payload", async () => {
  const script = scriptBlock(await doc(), "Script B: After Temporary Enable, Before Apply");
  assert.match(script, /wrong_target_rejected/);
  assert.match(script, /wrong_event_rejected/);
  assert.match(script, /wrong_total_rejected/);
  assert.match(script, /exact_payload_prepared/);
  assert.match(script, /exact_payload_submitted: false/);
  assert.match(script, /REQUIRED_TYPED_CONFIRMATION = "APPLY_X6WIO_CORRECTION_80_REAL"/);
  assert.match(script, /H3B4 does not submit apply/);
  assert.doesNotMatch(script, /body:\s*JSON\.stringify\(exactPayload\)/);
});

test("after-disable script checks apply disabled and detail availability", async () => {
  const script = scriptBlock(await doc(), "Script C: After Disabling");
  assert.match(script, /\/api\/owner\/corrections\/apply/);
  assert.match(script, /OWNER_CORRECTION_APPLY_DISABLED/);
  assert.match(script, /no_write: disabled\.json\.no_write === true/);
  assert.match(script, /correction_summary_exists/);
  assert.match(script, /production_write: "no"/);
});

test("document separates actual apply into H3B5", async () => {
  const text = await doc();
  assert.match(text, /H3B4 only prepares the temporary gate enable package/);
  assert.match(text, /Actual correction apply must happen in a separate explicitly approved step/);
  assert.match(text, /H3B5_ONE_TIME_X6WIO_APPLY_EXECUTION/);
  assert.match(text, /Do not apply x6wio correction in H3B4/);
});

test("document includes no-go conditions and backup export checklist", async () => {
  const text = await doc();
  for (const value of [
    "No-Go Conditions",
    "real implemented config names cannot be identified",
    "target-scoped gate cannot be enabled separately from broad global apply",
    "broad global apply alone could permit writes",
    "H4B detail endpoint fails",
    "H2 preview totals changed",
    "production backup/export not captured",
    "Backup / Export Checklist",
    "legacy session_detail for `S20260707-x6wio`",
    "`include_corrections=1` detail for `S20260707-x6wio`",
    "H2 preview response",
    "apply disabled response",
    "current worker version",
    "current git commit",
    "current env/config state without sensitive values"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("document includes security requirements and forbids H3B4 execution", async () => {
  const text = await doc();
  for (const value of [
    "Security Requirements",
    "do not print secrets",
    "do not print tokens/cookies/passwords",
    "do not store sensitive env values in docs",
    "commands with sensitive values must use placeholders",
    "Do not execute them in H3B4",
    "No production data changed",
    "No migration",
    "No deploy",
    "PRODUCTION_NO_GO"
  ]) {
    assert.match(text, new RegExp(escaped(value)));
  }
});

test("document does not contain executable wrangler commands", async () => {
  const text = await doc();
  assert.doesNotMatch(text, /wrangler\s+secret\s+put/i);
  assert.doesNotMatch(text, /wrangler\s+deploy/i);
  assert.doesNotMatch(text, /wrangler\s+vars/i);
  assert.match(text, /Use the project's approved Worker configuration propagation command/);
});

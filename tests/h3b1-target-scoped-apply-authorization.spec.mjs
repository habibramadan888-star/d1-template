import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildOwnerCorrectionDryRunPreview,
  buildOwnerCorrectionPreviewHash,
  validateOwnerCorrectionApplyRequest,
  validateOwnerCorrectionTargetScopedApplyAuthorization
} from "../modules/owner-corrections/correction-anchor-parser.mjs";

const targetSession = {
  id: "S20260707-x6wio",
  session_id: "S20260707-x6wio",
  anchor: "EMPV3-20260707-abdul-x6wio",
  totals: {
    cash: 1550,
    bank: 0,
    gross: 1550,
    rent_income: 1470,
    arrears_repaid: 80,
    arrears_open: 0,
    deposit_liability: 0,
    expense: 0,
    transfer_fee: 0
  },
  events: [
    { id: "ent20260707-x6wio-01", event_type: "arrears_payment", bed: "334", amount: 80, payment_method: "cash" },
    { id: "ent20260707-x6wio-02", event_type: "rent", bed: "334", amount: 700, payment_method: "cash" },
    { id: "ent20260707-x6wip-03", event_type: "rent", bed: "134", amount: 770, payment_method: "cash" }
  ]
};

function correction(overrides = {}) {
  return {
    anchor_contract_version: "owner_correction_anchor_v1",
    correction_session_id: "CORR-H3B1-x6wio-fixture",
    correction_type: "duplicate_upload_correction",
    target_session_anchor: "EMPV3-20260707-abdul-x6wio",
    target_session_id: "S20260707-x6wio",
    correction_reason: "duplicate upload correction",
    evidence_summary: "Void duplicate rent rows and keep real arrears payment.",
    no_hard_delete: true,
    original_events_immutable: true,
    correction_events: [
      {
        correction_event_id: "corr-ent20260707-x6wio-02",
        correction_event_type: "void_duplicate_event",
        original_event_id: "ent20260707-x6wio-02",
        original_session_id: "S20260707-x6wio",
        original_anchor: "EMPV3-20260707-abdul-x6wio",
        affected_bed: "334",
        affected_event_type: "rent",
        correction_reason: "Duplicate #334 rent 700.",
        financial_effect: {
          cash_delta: -700,
          bank_delta: 0,
          gross_delta: -700,
          rent_income_delta: -700,
          deposit_liability_delta: 0,
          arrears_repaid_delta: 0,
          arrears_open_delta: 0,
          expense_delta: 0,
          transfer_fee_delta: 0
        },
        status: "applied"
      },
      {
        correction_event_id: "corr-ent20260707-x6wip-03",
        correction_event_type: "void_duplicate_event",
        original_event_id: "ent20260707-x6wip-03",
        original_session_id: "S20260707-x6wio",
        original_anchor: "EMPV3-20260707-abdul-x6wio",
        affected_bed: "134",
        affected_event_type: "rent",
        correction_reason: "Duplicate #134 rent 770.",
        financial_effect: {
          cash_delta: -770,
          bank_delta: 0,
          gross_delta: -770,
          rent_income_delta: -770,
          deposit_liability_delta: 0,
          arrears_repaid_delta: 0,
          arrears_open_delta: 0,
          expense_delta: 0,
          transfer_fee_delta: 0
        },
        status: "applied"
      }
    ],
    ...overrides
  };
}

const allowConfig = {
  OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED: "true",
  OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ID: "S20260707-x6wio",
  OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ANCHOR: "EMPV3-20260707-abdul-x6wio",
  OWNER_CORRECTION_ALLOWED_TYPE: "duplicate_upload_correction",
  OWNER_CORRECTION_ALLOWED_ORIGINAL_EVENT_IDS: "ent20260707-x6wio-02,ent20260707-x6wip-03",
  OWNER_CORRECTION_EXPECTED_GROSS_DELTA: "-1470",
  OWNER_CORRECTION_EXPECTED_CASH_DELTA: "-1470",
  OWNER_CORRECTION_EXPECTED_ADJUSTED_GROSS: "80",
  OWNER_CORRECTION_EXPECTED_ADJUSTED_CASH: "80",
  OWNER_CORRECTION_EXPECTED_RENT_INCOME_DELTA: "-1470",
  OWNER_CORRECTION_EXPECTED_ADJUSTED_RENT_INCOME: "0",
  OWNER_CORRECTION_EXPECTED_ADJUSTED_ARREARS_REPAID: "80"
};

function previewAndBody(correctionOverride = {}, bodyOverride = {}) {
  const corr = correction(correctionOverride);
  const preview = buildOwnerCorrectionDryRunPreview(targetSession, corr);
  const previewHash = buildOwnerCorrectionPreviewHash(preview, corr, {
    target_session_content_hash: "fixture-target-content-hash",
    owner_identity: "owner"
  });
  const body = {
    ...corr,
    preview_hash: previewHash,
    idempotency_key: "idem-h3b1-x6wio",
    explicit_owner_confirmation: {
      confirmed: true,
      understands_original_events_immutable: true,
      understands_no_hard_delete: true,
      understands_correction_is_additive: true,
      confirmed_target_session_anchor: "EMPV3-20260707-abdul-x6wio",
      confirmed_target_session_id: "S20260707-x6wio",
      confirmed_correction_gross_delta: -1470,
      confirmed_adjusted_gross: 80,
      confirmed_correction_cash_delta: -1470,
      confirmed_adjusted_cash: 80
    },
    ...bodyOverride
  };
  return { preview: { ...preview, preview_hash: previewHash }, body };
}

function targetScope(bodyOverride = {}, previewOverride = {}, configOverride = {}) {
  const { preview, body } = previewAndBody({}, bodyOverride);
  return validateOwnerCorrectionTargetScopedApplyAuthorization({
    request: body,
    preview: { ...preview, ...previewOverride },
    config: { ...allowConfig, ...configOverride }
  });
}

test("target-scoped authorization module authorizes only exact x6wio payload in controlled mode", () => {
  const { preview, body } = previewAndBody();
  const applyValidation = validateOwnerCorrectionApplyRequest(body, preview, { expected_preview_hash: preview.preview_hash });
  const scoped = validateOwnerCorrectionTargetScopedApplyAuthorization({ request: body, preview, config: allowConfig });

  assert.equal(preview.correction_totals.gross_delta, -1470);
  assert.equal(preview.correction_totals.cash_delta, -1470);
  assert.equal(preview.correction_totals.rent_income_delta, -1470);
  assert.equal(preview.adjusted_totals.gross, 80);
  assert.equal(preview.adjusted_totals.cash, 80);
  assert.equal(preview.adjusted_totals.rent_income, 0);
  assert.equal(preview.adjusted_totals.arrears_repaid, 80);
  assert.equal(applyValidation.ok, true);
  assert.equal(scoped.ok, true);
  assert.equal(scoped.mode, "owner_correction_target_scope_authorized");
  assert.equal(scoped.no_write, true);
});

test("target-scoped gate is fail-closed when disabled or missing config", () => {
  assert.equal(targetScope({}, {}, { OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED: "" }).ok, false);
  assert.equal(targetScope({}, {}, { OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ID: "" }).ok, false);
  assert.equal(targetScope({}, {}, { OWNER_CORRECTION_ALLOWED_ORIGINAL_EVENT_IDS: "" }).ok, false);
  assert.equal(targetScope({}, {}, { OWNER_CORRECTION_EXPECTED_GROSS_DELTA: "" }).ok, false);
});

test("target-scoped gate rejects wrong target type ids and totals", () => {
  const cases = [
    targetScope({ target_session_id: "S20260707-wrong" }),
    targetScope({ target_session_anchor: "EMPV3-wrong" }),
    targetScope({ correction_type: "manual_adjustment" }),
    targetScope({ correction_events: [correction().correction_events[0]] }),
    targetScope({ correction_events: [...correction().correction_events, { ...correction().correction_events[0], original_event_id: "extra-event" }] }),
    targetScope({}, { correction_totals: { ...previewAndBody().preview.correction_totals, gross_delta: -700 } }),
    targetScope({}, { correction_totals: { ...previewAndBody().preview.correction_totals, cash_delta: -700 } }),
    targetScope({}, { adjusted_totals: { ...previewAndBody().preview.adjusted_totals, gross: 1550 } }),
    targetScope({}, { adjusted_totals: { ...previewAndBody().preview.adjusted_totals, cash: 1550 } })
  ];

  for (const result of cases) assert.equal(result.ok, false);
});

test("target-scoped gate requires preview hash idempotency and exact owner confirmation", () => {
  assert.equal(targetScope({ preview_hash: "" }).ok, false);
  assert.equal(targetScope({ idempotency_key: "" }).ok, false);
  assert.equal(targetScope({ explicit_owner_confirmation: {} }).ok, false);
  assert.equal(targetScope({
    explicit_owner_confirmation: {
      ...previewAndBody().body.explicit_owner_confirmation,
      confirmed_target_session_id: "S20260707-wrong"
    }
  }).ok, false);
  assert.equal(targetScope({
    explicit_owner_confirmation: {
      ...previewAndBody().body.explicit_owner_confirmation,
      confirmed_correction_cash_delta: -700
    }
  }).ok, false);
});

test("target-scoped gate rejects forbidden identity inputs", () => {
  for (const forbidden of [
    { card_id: "provider-card" },
    { tenant_card_id: "legacy-card" },
    { old_ttlock_ref: "vendor-ref" },
    { identity_basis: { provider_phone: "+971525199099" } },
    { contact_phone: "+971525199099" }
  ]) {
    const result = targetScope(forbidden);
    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === "FORBIDDEN_IDENTITY_INPUT"), true);
  }
});

test("apply endpoint requires broad gate plus target-scoped gate before write path", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handlerIndex = worker.indexOf("async function handleOwnerCorrectionApply");
  const handlerEnd = worker.indexOf("__name(handleOwnerCorrectionApply", handlerIndex);
  const handler = worker.slice(handlerIndex, handlerEnd);
  const broadGate = handler.indexOf("ownerCorrectionApplyEnabled(env)");
  const targetGate = handler.indexOf("validateOwnerCorrectionTargetScopedApplyAuthorization");
  const duplicateGuard = handler.indexOf("ownerCorrectionExistingScanResult");
  const writePath = handler.indexOf('empInsertDynamic(env,"sessions"');

  assert.ok(handlerIndex > -1);
  assert.ok(broadGate > -1);
  assert.ok(targetGate > broadGate);
  assert.ok(duplicateGuard > targetGate);
  assert.ok(writePath > targetGate);
  assert.match(handler, /ownerCorrectionTargetScopeRequiredResponse/);
  assert.match(worker, /OWNER_CORRECTION_TARGET_SCOPE_REQUIRED/);
  assert.match(worker, /OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED/);
  assert.match(worker, /OWNER_CORRECTION_ALLOWED_TARGET_SESSION_ID/);
  assert.doesNotMatch(handler.slice(0, targetGate), /empInsertDynamic|\.run\(|env\.DB\.batch/i);
});

test("production apply disabled response remains no-write", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const disabledIndex = worker.indexOf("function ownerCorrectionDisabledResponse");
  const disabledEnd = worker.indexOf("__name(ownerCorrectionDisabledResponse", disabledIndex);
  const disabled = worker.slice(disabledIndex, disabledEnd);

  assert.match(disabled, /OWNER_CORRECTION_APPLY_DISABLED/);
  assert.match(disabled, /no_write:true/);
  assert.match(disabled, /production_write:false/);
  assert.match(disabled, /ownerCorrectionPreviewNoWriteProof/);
});

test("manual live verification script is read-only and does not enable apply", async () => {
  const text = await readFile("docs/H3B1_TARGET_SCOPED_GATE_MANUAL_LIVE_VERIFY.md", "utf8");
  assert.match(text, /\/api\/owner\/corrections\/apply/);
  assert.match(text, /\/api\/session_detail\?id=S20260707-x6wio&include_corrections=1/);
  assert.match(text, /production_write: "no"/);
  assert.match(text, /x6wio_corrected: false/);
  assert.doesNotMatch(text, /OWNER_CORRECTION_APPLY_ENABLED/);
  assert.doesNotMatch(text, /OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED/);
  assert.doesNotMatch(text, /\/api\/owner\/corrections\/apply[\s\S]{0,1200}correction_write_attempted:\s*true/);
});

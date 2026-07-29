import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyCorrectionEffectsInMemory,
  buildCorrectionRequestFingerprint,
  buildOwnerCorrectionDryRunPreview,
  buildOwnerCorrectionPreviewHash,
  buildOwnerCorrectionSessionAnchor,
  buildCorrectionAuditView,
  calculateCorrectionAdjustedTotals,
  parseOwnerCorrectionAnchorText,
  validateOwnerCorrectionApplyRequest,
  validateCorrectionAnchorContract
} from "../modules/owner-corrections/correction-anchor-parser.mjs";

const x6wioOriginalSession = {
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
    { id: "x6wio-ap-334-80", event_type: "arrears_payment", bed: "334", amount: 80, payment_method: "cash" },
    { id: "x6wio-rent-334-700", event_type: "rent", bed: "334", amount: 700, payment_method: "cash" },
    { id: "x6wio-rent-134-770", event_type: "rent", bed: "134", amount: 770, payment_method: "cash" }
  ]
};

function x6wioCorrection(overrides = {}) {
  return {
    anchor_contract_version: "owner_correction_anchor_v1",
    correction_session_id: "CORR-S20260708-owner-x6wio",
    correction_type: "duplicate_upload_correction",
    target_session_anchor: "EMPV3-20260707-abdul-x6wio",
    no_hard_delete: true,
    original_events_immutable: true,
    correction_events: [
      {
        correction_event_id: "corr-x6wio-334-rent",
        correction_event_type: "void_duplicate_event",
        original_event_id: "x6wio-rent-334-700",
        original_entry_id: "x6wio-rent-334-700",
        original_session_id: "S20260707-x6wio",
        original_anchor: "EMPV3-20260707-abdul-x6wio",
        affected_bed: "334",
        affected_event_type: "rent",
        correction_reason: "duplicate upload correction",
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
        projection_effect: { affects_owner_finance: true },
        status: "applied"
      },
      {
        correction_event_id: "corr-x6wio-134-rent",
        correction_event_type: "void_duplicate_event",
        original_event_id: "x6wio-rent-134-770",
        original_entry_id: "x6wio-rent-134-770",
        original_session_id: "S20260707-x6wio",
        original_anchor: "EMPV3-20260707-abdul-x6wio",
        affected_bed: "134",
        affected_event_type: "rent",
        correction_reason: "duplicate upload correction",
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
        projection_effect: { affects_owner_finance: true },
        status: "applied"
      }
    ],
    ...overrides
  };
}

function correctionText(correction = x6wioCorrection()) {
  return [
    "HOMELINK OWNER CORRECTION",
    "Correction Anchor ID: CORR-20260708-owner-x6wio",
    "Target Session: EMPV3-20260707-abdul-x6wio",
    "Reason: duplicate upload correction",
    "",
    "==== CORRECTION ANCHORS JSON ====",
    JSON.stringify(correction),
    "==== END CORRECTION ANCHORS JSON ===="
  ].join("\n");
}

test("parse owner_correction_anchor_v1 block and validate common fields", () => {
  const parsed = parseOwnerCorrectionAnchorText(correctionText());

  assert.equal(parsed.ok, true);
  assert.equal(parsed.found, true);
  assert.equal(parsed.correction.anchor_contract_version, "owner_correction_anchor_v1");
  assert.equal(parsed.correction.correction_session_id, "CORR-S20260708-owner-x6wio");
  assert.equal(parsed.correction.correction_type, "duplicate_upload_correction");
  assert.equal(parsed.correction.target_session_anchor, "EMPV3-20260707-abdul-x6wio");
  assert.equal(parsed.correction.correction_events.length, 2);
});

test("parse financial_effect schema and calculate x6wio adjusted totals", () => {
  const correction = x6wioCorrection();
  const totals = calculateCorrectionAdjustedTotals(x6wioOriginalSession.totals, correction.correction_events);

  assert.equal(totals.original_totals.cash, 1550);
  assert.equal(totals.original_totals.gross, 1550);
  assert.equal(totals.original_totals.rent_income, 1470);
  assert.equal(totals.original_totals.arrears_repaid, 80);
  assert.equal(totals.correction_totals.cash, -1470);
  assert.equal(totals.correction_totals.gross, -1470);
  assert.equal(totals.correction_totals.rent_income, -1470);
  assert.equal(totals.adjusted_totals.cash, 80);
  assert.equal(totals.adjusted_totals.bank, 0);
  assert.equal(totals.adjusted_totals.gross, 80);
  assert.equal(totals.adjusted_totals.rent_income, 0);
  assert.equal(totals.adjusted_totals.arrears_repaid, 80);
});

test("x6wio fixture keeps original events visible and does not touch w1ofc", () => {
  const audit = buildCorrectionAuditView(x6wioOriginalSession, x6wioCorrection(), "audit");

  assert.equal(audit.target_session_anchor, "EMPV3-20260707-abdul-x6wio");
  assert.equal(audit.original_events_visible, true);
  assert.equal(audit.original_events.length, 3);
  assert.equal(audit.correction_events.length, 2);
  assert.equal(audit.adjusted_totals.gross, 80);
  assert.equal(audit.original_events.some((event) => event.id === "x6wio-ap-334-80"), true);
  assert.doesNotMatch(JSON.stringify(audit), /EMPV3-20260707-abdul-w1ofc/);
});

test("audit view supports raw adjusted and audit modes", () => {
  const correction = x6wioCorrection();
  const raw = buildCorrectionAuditView(x6wioOriginalSession, correction, "raw");
  const adjusted = buildCorrectionAuditView(x6wioOriginalSession, correction, "adjusted");
  const audit = buildCorrectionAuditView(x6wioOriginalSession, correction, "audit");

  assert.equal(raw.mode, "raw");
  assert.equal(raw.totals.gross, 1550);
  assert.equal(raw.correction_events.length, 0);
  assert.equal(adjusted.mode, "adjusted");
  assert.equal(adjusted.totals.gross, 80);
  assert.equal(adjusted.correction_events_visible, false);
  assert.equal(audit.mode, "audit");
  assert.equal(audit.original_totals.gross, 1550);
  assert.equal(audit.correction_totals.gross, -1470);
  assert.equal(audit.adjusted_totals.gross, 80);
});

test("missing correction block is compatible with old sessions", () => {
  const parsed = parseOwnerCorrectionAnchorText("HOMELINK LEDGER\nNo correction anchors here.");

  assert.equal(parsed.ok, true);
  assert.equal(parsed.found, false);
  assert.equal(parsed.correction, null);
  assert.deepEqual(parsed.errors, []);
});

test("missing original_event_id is rejected", () => {
  const correction = x6wioCorrection({
    correction_events: [{ ...x6wioCorrection().correction_events[0], original_event_id: "" }]
  });
  const validation = validateCorrectionAnchorContract(correction);

  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((error) => error.code === "ORIGINAL_EVENT_ID_REQUIRED"), true);
});

test("missing financial_effect is rejected", () => {
  const event = { ...x6wioCorrection().correction_events[0] };
  delete event.financial_effect;
  const validation = validateCorrectionAnchorContract(x6wioCorrection({ correction_events: [event] }));

  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((error) => error.code === "FINANCIAL_EFFECT_REQUIRED"), true);
});

test("hard delete and silent overwrite are rejected", () => {
  const hardDelete = validateCorrectionAnchorContract(x6wioCorrection({ hard_delete: true }));
  const silentOverwrite = validateCorrectionAnchorContract(x6wioCorrection({ silent_overwrite: true }));
  const eventHardDelete = validateCorrectionAnchorContract(x6wioCorrection({
    correction_events: [{ ...x6wioCorrection().correction_events[0], hard_delete: true }]
  }));

  assert.equal(hardDelete.errors.some((error) => error.code === "HARD_DELETE_FORBIDDEN"), true);
  assert.equal(silentOverwrite.errors.some((error) => error.code === "SILENT_OVERWRITE_FORBIDDEN"), true);
  assert.equal(eventHardDelete.errors.some((error) => error.code === "HARD_DELETE_FORBIDDEN"), true);
});

test("forbidden identity fields are rejected", () => {
  const cases = [
    { identity_basis: { card_id: "provider-card" } },
    { identity_basis: { tenant_card_id: "legacy-card" } },
    { identity_basis: { provider_phone: "+971525199099" } },
    { identity_basis: { contact_phone: "+971525199099" } }
  ];

  for (const extra of cases) {
    const event = { ...x6wioCorrection().correction_events[0], ...extra };
    const validation = validateCorrectionAnchorContract(x6wioCorrection({ correction_events: [event] }));
    assert.equal(validation.ok, false);
    assert.equal(validation.errors.some((error) => error.code === "FORBIDDEN_IDENTITY_INPUT"), true);
  }
});

test("duplicate correction event is rejected or flagged", () => {
  const event = x6wioCorrection().correction_events[0];
  const validation = validateCorrectionAnchorContract(x6wioCorrection({ correction_events: [event, { ...event, correction_event_id: "duplicate" }] }));

  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((error) => error.code === "DUPLICATE_CORRECTION_EVENT"), true);
});

test("financial effect amount mismatch is rejected when original amount is known", () => {
  const event = {
    ...x6wioCorrection().correction_events[0],
    financial_effect: {
      ...x6wioCorrection().correction_events[0].financial_effect,
      cash_delta: -699
    }
  };
  const validation = validateCorrectionAnchorContract(x6wioCorrection({ correction_events: [event] }), {
    original_events: x6wioOriginalSession.events
  });

  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((error) => error.code === "FINANCIAL_EFFECT_AMOUNT_MISMATCH"), true);
});

test("target_session_anchor missing is rejected", () => {
  const validation = validateCorrectionAnchorContract(x6wioCorrection({ target_session_anchor: "" }));

  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((error) => error.code === "CORRECTION_SESSION_FIELD_MISSING" && error.field === "target_session_anchor"), true);
});

test("parser module is pure and owner history parser is unaffected", async () => {
  const moduleText = await readFile("modules/owner-corrections/correction-anchor-parser.mjs", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const historyStart = worker.indexOf('if (path === "/api/history")');
  const detailStart = worker.indexOf('if (path === "/api/session_detail"');
  const historyDetailBlock = worker.slice(historyStart, detailStart + 1200);

  assert.doesNotMatch(moduleText, /env\.DB|prepare\(|empInsertDynamic|fetch\(|wrangler|\bINSERT\s+INTO\b|\bUPDATE\s+\w+\s+SET\b|\bDELETE\s+FROM\b/i);
  assert.doesNotMatch(historyDetailBlock, /parseOwnerCorrectionAnchorText|buildOwnerCorrectionDryRunPreview|CORRECTION ANCHORS JSON/);
});

test("owner correction dry-run preview returns x6wio adjusted totals and no-write proof", () => {
  const preview = buildOwnerCorrectionDryRunPreview(x6wioOriginalSession, x6wioCorrection());
  const previewHash = buildOwnerCorrectionPreviewHash(preview, x6wioCorrection(), {
    target_session_content_hash: "fixture-target-hash",
    owner_identity: "owner"
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.mode, "owner_correction_dry_run_preview_only");
  assert.equal(preview.no_write, true);
  assert.equal(preview.target_session_anchor, "EMPV3-20260707-abdul-x6wio");
  assert.equal(preview.original_totals.cash, 1550);
  assert.equal(preview.original_totals.gross, 1550);
  assert.equal(preview.correction_totals.cash_delta, -1470);
  assert.equal(preview.correction_totals.gross_delta, -1470);
  assert.equal(preview.adjusted_totals.cash, 80);
  assert.equal(preview.adjusted_totals.gross, 80);
  assert.equal(preview.adjusted_totals.rent_income, 0);
  assert.equal(preview.original_events_visible, true);
  assert.equal(preview.correction_events_count, 2);
  assert.deepEqual(preview.invalid_corrections, []);
  assert.equal(preview.no_write_proof.dry_run, true);
  assert.equal(preview.no_write_proof.d1_write_count, 0);
  assert.equal(preview.no_write_proof.session_write_attempted, false);
  assert.equal(preview.no_write_proof.real_apply_called, false);
  assert.match(previewHash, /^och_/);
});

test("owner correction preview rejects missing and unmatched original event ids", () => {
  const missing = x6wioCorrection({
    correction_events: [{ ...x6wioCorrection().correction_events[0], original_event_id: "" }]
  });
  const unmatched = x6wioCorrection({
    correction_events: [{ ...x6wioCorrection().correction_events[0], original_event_id: "not-in-x6wio" }]
  });

  const missingPreview = buildOwnerCorrectionDryRunPreview(x6wioOriginalSession, missing);
  const unmatchedPreview = buildOwnerCorrectionDryRunPreview(x6wioOriginalSession, unmatched);

  assert.equal(missingPreview.ok, false);
  assert.equal(missingPreview.invalid_corrections.some((error) => error.code === "ORIGINAL_EVENT_ID_REQUIRED"), true);
  assert.equal(unmatchedPreview.ok, false);
  assert.equal(unmatchedPreview.invalid_corrections.some((error) => error.code === "ORIGINAL_EVENT_ID_NOT_FOUND"), true);
  assert.equal(unmatchedPreview.no_write_proof.real_apply_called, false);
});

test("owner correction preview rejects unsafe financial and identity inputs", () => {
  const duplicateEvent = x6wioCorrection().correction_events[0];
  const duplicatePreview = buildOwnerCorrectionDryRunPreview(x6wioOriginalSession, x6wioCorrection({
    correction_events: [duplicateEvent, { ...duplicateEvent, correction_event_id: "duplicate" }]
  }));
  const identityPreview = buildOwnerCorrectionDryRunPreview(x6wioOriginalSession, x6wioCorrection({
    correction_events: [{ ...duplicateEvent, tenant_card_id: "provider-card-id" }]
  }));
  const mismatchPreview = buildOwnerCorrectionDryRunPreview(x6wioOriginalSession, x6wioCorrection({
    correction_events: [{
      ...duplicateEvent,
      financial_effect: { ...duplicateEvent.financial_effect, cash_delta: -1 }
    }]
  }));
  const negativePreview = buildOwnerCorrectionDryRunPreview(
    { ...x6wioOriginalSession, totals: { ...x6wioOriginalSession.totals, cash: 100, gross: 100, rent_income: 100 } },
    x6wioCorrection()
  );

  assert.equal(duplicatePreview.ok, false);
  assert.equal(duplicatePreview.invalid_corrections.some((error) => error.code === "DUPLICATE_CORRECTION_EVENT"), true);
  assert.equal(identityPreview.ok, false);
  assert.equal(identityPreview.invalid_corrections.some((error) => error.code === "FORBIDDEN_IDENTITY_INPUT"), true);
  assert.equal(mismatchPreview.ok, false);
  assert.equal(mismatchPreview.invalid_corrections.some((error) => error.code === "FINANCIAL_EFFECT_AMOUNT_MISMATCH"), true);
  assert.equal(negativePreview.ok, false);
  assert.equal(negativePreview.invalid_corrections.some((error) => error.code === "ADJUSTED_TOTAL_NEGATIVE"), true);
});

test("owner correction preview endpoint is route-level no-write and owner scoped", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const routeIndex = worker.indexOf('path === "/api/owner/corrections/preview"');
  const handlerIndex = worker.indexOf("async function handleOwnerCorrectionPreview");
  const handlerEnd = worker.indexOf("__name(handleOwnerCorrectionPreview", handlerIndex);
  const handler = worker.slice(handlerIndex, handlerEnd);

  assert.ok(routeIndex > -1, "owner correction preview route must exist");
  assert.ok(handlerIndex > -1, "owner correction preview handler must exist");
  assert.ok(routeIndex > worker.indexOf("const auth = await requireAuth(request, env)"), "route must be behind API auth");
  assert.match(handler, /canReadOwnerData\(user\)/);
  assert.match(handler, /SELECT \* FROM sessions WHERE corpid=\?/);
  assert.match(worker, /buildOwnerCorrectionDryRunPreview/);
  assert.match(handler, /ownerCorrectionBuildPreviewForSession/);
  assert.match(handler, /ownerCorrectionPreviewNoWriteProof/);
  assert.doesNotMatch(handler, /env\.DB\.batch|\.run\(|empInsertDynamic|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|audit\(/i);
});

test("owner correction apply request validates preview hash confirmation and idempotency", () => {
  const correction = { ...x6wioCorrection(), target_session_id: "S20260707-x6wio" };
  const preview = buildOwnerCorrectionDryRunPreview({ ...x6wioOriginalSession, id: "S20260707-x6wio" }, correction);
  const previewHash = buildOwnerCorrectionPreviewHash(preview, correction, {
    target_session_content_hash: "fixture-target-hash",
    owner_identity: "owner"
  });
  const validBody = {
    ...correction,
    correction_reason: "duplicate upload correction",
    preview_hash: previewHash,
    idempotency_key: "idem-x6wio",
    evidence_summary: "Fixture evidence.",
    explicit_owner_confirmation: {
      confirmed: true,
      understands_original_events_immutable: true,
      understands_no_hard_delete: true,
      understands_correction_is_additive: true,
      confirmed_target_session_anchor: "EMPV3-20260707-abdul-x6wio",
      confirmed_correction_gross_delta: -1470,
      confirmed_adjusted_gross: 80
    }
  };

  const valid = validateOwnerCorrectionApplyRequest(validBody, { ...preview, preview_hash: previewHash }, { expected_preview_hash: previewHash });
  const invalidHash = validateOwnerCorrectionApplyRequest({ ...validBody, preview_hash: "bad" }, { ...preview, preview_hash: previewHash }, { expected_preview_hash: previewHash });
  const missingConfirmation = validateOwnerCorrectionApplyRequest({ ...validBody, explicit_owner_confirmation: {} }, { ...preview, preview_hash: previewHash }, { expected_preview_hash: previewHash });
  const mismatchedGross = validateOwnerCorrectionApplyRequest({
    ...validBody,
    explicit_owner_confirmation: { ...validBody.explicit_owner_confirmation, confirmed_adjusted_gross: 1550 }
  }, { ...preview, preview_hash: previewHash }, { expected_preview_hash: previewHash });
  const missingIdempotency = validateOwnerCorrectionApplyRequest({ ...validBody, idempotency_key: "" }, { ...preview, preview_hash: previewHash }, { expected_preview_hash: previewHash });

  assert.equal(valid.ok, true);
  assert.equal(invalidHash.ok, false);
  assert.equal(invalidHash.errors.some((error) => error.code === "PREVIEW_HASH_INVALID"), true);
  assert.equal(missingConfirmation.ok, false);
  assert.equal(missingConfirmation.errors.some((error) => error.code === "OWNER_CONFIRMATION_REQUIRED"), true);
  assert.equal(mismatchedGross.ok, false);
  assert.equal(mismatchedGross.errors.some((error) => error.code === "OWNER_CONFIRMATION_MISMATCH"), true);
  assert.equal(missingIdempotency.ok, false);
  assert.equal(missingIdempotency.errors.some((error) => error.code === "APPLY_REQUIRED_FIELD_MISSING" && error.field === "idempotency_key"), true);
});

test("owner correction session anchor builder is additive and preserves source immutability", () => {
  const correction = { ...x6wioCorrection(), target_session_id: "S20260707-x6wio" };
  const preview = buildOwnerCorrectionDryRunPreview({ ...x6wioOriginalSession, id: "S20260707-x6wio" }, correction);
  const previewHash = buildOwnerCorrectionPreviewHash(preview, correction, {
    target_session_content_hash: "fixture-target-hash",
    owner_identity: "owner"
  });
  const fingerprint = buildCorrectionRequestFingerprint(correction);
  const built = buildOwnerCorrectionSessionAnchor({
    preview: { ...preview, preview_hash: previewHash },
    correction,
    preview_hash: previewHash,
    idempotency_key: "idem-x6wio",
    correction_request_fingerprint: fingerprint,
    created_by: "owner",
    created_by_role: "manager",
    authorized_by: "owner",
    authorized_role: "manager",
    target_employee_userid: "abdul",
    target_business_date: "2026-07-07",
    created_at: "2026-07-08T00:00:00.000Z"
  });
  const parsed = parseOwnerCorrectionAnchorText(built.export_text);

  assert.match(built.export_text, /HOMELINK OWNER CORRECTION/);
  assert.match(built.export_text, /CORRECTION ANCHORS JSON/);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.correction.anchor_contract_version, "owner_correction_anchor_v1");
  assert.equal(parsed.correction.preview_hash, previewHash);
  assert.equal(parsed.correction.idempotency_key, "idem-x6wio");
  assert.equal(parsed.correction.correction_request_fingerprint, fingerprint);
  assert.equal(parsed.correction.original_totals.gross, 1550);
  assert.equal(parsed.correction.correction_totals.gross_delta, -1470);
  assert.equal(parsed.correction.adjusted_totals.gross, 80);
  assert.equal(parsed.correction.no_hard_delete, true);
  assert.equal(parsed.correction.original_events_immutable, true);
  assert.equal(parsed.correction.production_write_scope, "correction_anchor_only");
  assert.equal(x6wioOriginalSession.events.length, 3);
});

test("owner correction apply endpoint is gated disabled by default and controlled write only when enabled", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const routeIndex = worker.indexOf('path === "/api/owner/corrections/apply"');
  const handlerIndex = worker.indexOf("async function handleOwnerCorrectionApply");
  const handlerEnd = worker.indexOf("__name(handleOwnerCorrectionApply", handlerIndex);
  const handler = worker.slice(handlerIndex, handlerEnd);
  const disabledIndex = handler.indexOf("ownerCorrectionApplyEnabled(env)");
  const writeIndex = handler.indexOf('empInsertDynamic(env,"sessions"');

  assert.ok(routeIndex > -1, "owner correction apply route must exist");
  assert.ok(handlerIndex > -1, "owner correction apply handler must exist");
  assert.match(handler, /canWriteOwnerData\(user\)/);
  assert.match(worker, /OWNER_CORRECTION_APPLY_ENABLED/);
  assert.match(worker, /OWNER_CORRECTION_APPLY_DISABLED/);
  assert.ok(disabledIndex > -1 && writeIndex > disabledIndex, "disabled gate must run before controlled write");
  assert.match(handler, /validateOwnerCorrectionApplyRequest/);
  assert.match(handler, /buildCorrectionRequestFingerprint/);
  assert.match(handler, /ownerCorrectionFetchExistingCorrectionSessions/);
  assert.match(worker, /ORIGINAL_EVENT_ALREADY_CORRECTED/);
  assert.match(worker, /IDEMPOTENCY_CONFLICT/);
  assert.match(handler, /source:"owner_correction"/);
  assert.doesNotMatch(handler, /UPDATE\s+\w+\s+SET|DELETE\s+FROM|env\.DB\.batch|arrear_tasks|deposit_ledger/i);
});

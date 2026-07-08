import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyCorrectionEffectsInMemory,
  buildCorrectionAuditView,
  calculateCorrectionAdjustedTotals,
  parseOwnerCorrectionAnchorText,
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

test("parser module is pure and worker runtime owner parser is not wired", async () => {
  const moduleText = await readFile("modules/owner-corrections/correction-anchor-parser.mjs", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.doesNotMatch(moduleText, /env\.DB|prepare\(|empInsertDynamic|fetch\(|wrangler|\bINSERT\s+INTO\b|\bUPDATE\s+\w+\s+SET\b|\bDELETE\s+FROM\b/i);
  assert.doesNotMatch(worker, /parseOwnerCorrectionAnchorText|owner-corrections\/correction-anchor-parser|CORRECTION ANCHORS JSON/);
});

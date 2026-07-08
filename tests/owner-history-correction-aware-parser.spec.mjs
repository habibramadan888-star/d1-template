import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyCorrectionAnchorsInMemory,
  buildAdjustedModeView,
  buildAuditModeView,
  buildCorrectionAwareOwnerHistoryView,
  buildRawModeView,
  calculateRawCorrectionAdjustedTotals,
  discoverCorrectionAnchorSessions,
  linkCorrectionsToTargetSessions,
  parseOwnerCorrectionSessions
} from "../modules/owner-history/correction-aware-history-parser.mjs";

const x6wioSession = {
  session_id: "S20260707-x6wio",
  anchor: "EMPV3-20260707-abdul-x6wio",
  date: "2026-07-07",
  employee: "abdul",
  totals: {
    cash: 1550,
    bank: 0,
    gross: 1550,
    rent_income: 1470,
    arrears_repaid: 80,
    deposit_liability: 0,
    arrears_open: 0,
    expense: 0,
    transfer_fee: 0
  },
  events: [
    {
      event_id: "ent20260707-x6wio-01",
      event_type: "arrears_payment",
      bed: "334",
      amount: 80,
      payment_method: "cash",
      meaning: "legitimate #334 arrears_payment 80",
      tenant_card_id: "legacy-raw-field-is-allowed"
    },
    {
      event_id: "ent20260707-x6wio-02",
      event_type: "rent",
      bed: "334",
      amount: 700,
      payment_method: "cash",
      meaning: "duplicate #334 rent 700",
      original_local_entry_id: "ent20260707-w1ofc-01",
      old_ttlock_ref: "legacy-raw-field-is-allowed"
    },
    {
      event_id: "ent20260707-x6wip-03",
      event_type: "rent",
      bed: "134",
      amount: 770,
      payment_method: "cash",
      meaning: "duplicate #134 rent 770",
      original_local_entry_id: "ent20260707-w1ofc-02"
    }
  ]
};

const oldOwnerSession = {
  session_id: "S20260706-old",
  anchor: "OWNER-20260706-old",
  date: "2026-07-06",
  employee: "owner",
  totals: {
    cash: 700,
    bank: 0,
    gross: 700,
    rent_income: 700,
    arrears_repaid: 0,
    deposit_liability: 0,
    arrears_open: 0,
    expense: 0,
    transfer_fee: 0
  },
  events: [{ event_id: "owner-old-rent-001", event_type: "rent", bed: "145", amount: 700, payment_method: "cash" }]
};

function x6wioCorrection(overrides = {}) {
  return {
    anchor_contract_version: "owner_correction_anchor_v1",
    correction_session_id: "CORR-FIXTURE-x6wio-001",
    correction_anchor_id: "CORR-FIXTURE-x6wio-001",
    correction_type: "duplicate_upload_correction",
    target_session_anchor: "EMPV3-20260707-abdul-x6wio",
    target_session_id: "S20260707-x6wio",
    status: "applied",
    no_hard_delete: true,
    original_events_immutable: true,
    production_write_scope: "correction_anchor_only",
    original_totals: {
      cash: 1550,
      bank: 0,
      gross: 1550,
      rent_income: 1470,
      arrears_repaid: 80,
      deposit_liability: 0,
      arrears_open: 0,
      expense: 0,
      transfer_fee: 0
    },
    correction_totals: {
      cash_delta: -1470,
      bank_delta: 0,
      gross_delta: -1470,
      rent_income_delta: -1470,
      deposit_liability_delta: 0,
      arrears_repaid_delta: 0,
      arrears_open_delta: 0,
      expense_delta: 0,
      transfer_fee_delta: 0
    },
    adjusted_totals: {
      cash: 80,
      bank: 0,
      gross: 80,
      rent_income: 0,
      arrears_repaid: 80,
      deposit_liability: 0,
      arrears_open: 0,
      expense: 0,
      transfer_fee: 0
    },
    correction_events: [
      {
        correction_event_id: "CORR-FIXTURE-x6wio-001-E1",
        correction_event_type: "void_duplicate_event",
        original_event_id: "ent20260707-x6wio-02",
        original_session_id: "S20260707-x6wio",
        original_anchor: "EMPV3-20260707-abdul-x6wio",
        affected_bed: "334",
        affected_event_type: "rent",
        correction_reason: "Duplicate #334 rent 700 already uploaded in original session w1ofc.",
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
        correction_event_id: "CORR-FIXTURE-x6wio-001-E2",
        correction_event_type: "void_duplicate_event",
        original_event_id: "ent20260707-x6wip-03",
        original_session_id: "S20260707-x6wio",
        original_anchor: "EMPV3-20260707-abdul-x6wio",
        affected_bed: "134",
        affected_event_type: "rent",
        correction_reason: "Duplicate #134 rent 770 already uploaded in original session w1ofc.",
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

function correctionSession(correction = x6wioCorrection(), overrides = {}) {
  return {
    session_id: correction.correction_session_id,
    anchor: correction.correction_anchor_id || correction.correction_session_id,
    date: "2026-07-08",
    employee: "owner",
    source: "owner_correction",
    export_text: [
      "HOMELINK OWNER CORRECTION",
      `Correction Anchor ID: ${correction.correction_anchor_id || correction.correction_session_id}`,
      "",
      "==== CORRECTION ANCHORS JSON ====",
      JSON.stringify(correction),
      "==== END CORRECTION ANCHORS JSON ===="
    ].join("\n"),
    ...overrides
  };
}

function byAnchor(view, anchor = "EMPV3-20260707-abdul-x6wio") {
  return view.sessions.find((session) => session.anchor === anchor);
}

test("correction-aware parser module exists and stays pure", async () => {
  const text = await readFile("modules/owner-history/correction-aware-history-parser.mjs", "utf8");
  assert.match(text, /buildCorrectionAwareOwnerHistoryView/);
  assert.doesNotMatch(text, /\bfetch\s*\(/);
  assert.doesNotMatch(text, /\bprepare\s*\(/);
  assert.doesNotMatch(text, /\bexec\s*\(/);
  assert.doesNotMatch(text, /INSERT\s+INTO/i);
  assert.doesNotMatch(text, /UPDATE\s+\w+/i);
  assert.doesNotMatch(text, /DELETE\s+FROM/i);
});

test("old owner history without correction returns unchanged raw totals", () => {
  const view = buildCorrectionAwareOwnerHistoryView([oldOwnerSession], { mode: "audit" });
  const session = byAnchor(view, "OWNER-20260706-old");

  assert.equal(session.raw_totals.gross, 700);
  assert.equal(session.adjusted_totals.gross, 700);
  assert.equal(session.correction_applied, false);
  assert.equal(session.original_events_visible, true);
  assert.equal(session.original_events.length, 1);
});

test("correction session discovery detects owner correction export text and parses owner_correction_anchor_v1", () => {
  const parsed = parseOwnerCorrectionSessions([x6wioSession, correctionSession()]);
  const discovered = discoverCorrectionAnchorSessions([x6wioSession, correctionSession()]);

  assert.equal(parsed.corrections.length, 1);
  assert.equal(parsed.corrections[0].correction.anchor_contract_version, "owner_correction_anchor_v1");
  assert.equal(parsed.corrections[0].correction.correction_events.length, 2);
  assert.equal(discovered.corrections.length, 1);
});

test("applied correction links to target_session_anchor and original_event_id", () => {
  const parsed = parseOwnerCorrectionSessions([x6wioSession, correctionSession()]);
  const links = linkCorrectionsToTargetSessions([x6wioSession, correctionSession()], parsed);

  assert.equal(links.links.length, 1);
  assert.equal(links.links[0].target_session.anchor, "EMPV3-20260707-abdul-x6wio");
  assert.equal(links.links[0].correction.correction_events[0].original_event_id, "ent20260707-x6wio-02");
});

test("x6wio raw correction and adjusted totals are calculated in memory", () => {
  const applied = applyCorrectionAnchorsInMemory([x6wioSession, correctionSession()]);
  const session = applied.sessions[0];

  assert.equal(session.raw_totals.cash, 1550);
  assert.equal(session.raw_totals.gross, 1550);
  assert.equal(session.raw_totals.rent_income, 1470);
  assert.equal(session.raw_totals.arrears_repaid, 80);
  assert.equal(session.correction_totals.cash_delta, -1470);
  assert.equal(session.correction_totals.gross_delta, -1470);
  assert.equal(session.correction_totals.rent_income_delta, -1470);
  assert.equal(session.correction_totals.arrears_repaid_delta, 0);
  assert.equal(session.adjusted_totals.cash, 80);
  assert.equal(session.adjusted_totals.gross, 80);
  assert.equal(session.adjusted_totals.rent_income, 0);
  assert.equal(session.adjusted_totals.arrears_repaid, 80);
});

test("calculateRawCorrectionAdjustedTotals exposes delta-key correction totals", () => {
  const result = calculateRawCorrectionAdjustedTotals(x6wioSession.totals, x6wioCorrection().correction_events);

  assert.equal(result.raw_totals.gross, 1550);
  assert.equal(result.correction_totals.gross_delta, -1470);
  assert.equal(result.adjusted_totals.gross, 80);
});

test("raw adjusted and audit modes expose the expected data boundaries", () => {
  const raw = buildRawModeView([x6wioSession, correctionSession()]);
  const adjusted = buildAdjustedModeView([x6wioSession, correctionSession()]);
  const audit = buildAuditModeView([x6wioSession, correctionSession()]);

  assert.equal(raw.mode, "raw");
  assert.equal(byAnchor(raw).totals.gross, 1550);
  assert.equal(byAnchor(raw).correction_events.length, 0);

  assert.equal(adjusted.mode, "adjusted");
  assert.equal(byAnchor(adjusted).raw_totals.gross, 1550);
  assert.equal(byAnchor(adjusted).correction_totals.gross_delta, -1470);
  assert.equal(byAnchor(adjusted).adjusted_totals.gross, 80);
  assert.equal(byAnchor(adjusted).correction_events_visible, false);

  assert.equal(audit.mode, "audit");
  assert.equal(byAnchor(audit).original_events.length, 3);
  assert.equal(byAnchor(audit).correction_events.length, 2);
  assert.equal(byAnchor(audit).correction_events_visible, true);
});

test("original events remain visible and correction events are visible separately", () => {
  const audit = buildAuditModeView([x6wioSession, correctionSession()]);
  const session = byAnchor(audit);

  assert.equal(session.original_events_visible, true);
  assert.equal(session.original_events.length, 3);
  assert.equal(session.correction_events_visible, true);
  assert.equal(session.correction_events.length, 2);
  assert.equal(session.original_events.some((event) => event.event_id === "ent20260707-x6wio-01"), true);
  assert.equal(session.correction_events.some((event) => event.original_event_id === "ent20260707-x6wio-02"), true);
});

test("pending rejected reversed and voided corrections are ignored", () => {
  for (const status of ["pending", "rejected", "reversed", "voided"]) {
    const view = buildAuditModeView([x6wioSession, correctionSession(x6wioCorrection({ status }))]);
    const session = byAnchor(view);
    assert.equal(session.adjusted_totals.gross, 1550);
    assert.equal(session.correction_events.length, 0);
    assert.equal(session.invalid_corrections.some((error) => error.code === "CORRECTION_STATUS_NOT_APPLIED"), true);
  }
});

test("missing target session is unresolved and not financially applied", () => {
  const view = buildAuditModeView([correctionSession(x6wioCorrection({ target_session_anchor: "MISSING", target_session_id: "S-MISSING" }))]);

  assert.equal(view.sessions.length, 0);
  assert.equal(view.unresolved_corrections.length, 1);
  assert.equal(view.unresolved_corrections[0].code, "TARGET_SESSION_NOT_FOUND");
});

test("missing original_event_id and original_event_id not found are not applied", () => {
  const missingIdEvent = { ...x6wioCorrection().correction_events[0] };
  delete missingIdEvent.original_event_id;
  const missingId = buildAuditModeView([x6wioSession, correctionSession(x6wioCorrection({ correction_events: [missingIdEvent] }))]);
  assert.equal(byAnchor(missingId).adjusted_totals.gross, 1550);
  assert.equal(byAnchor(missingId).invalid_corrections.some((error) => error.code === "ORIGINAL_EVENT_ID_REQUIRED"), true);

  const notFoundEvent = { ...x6wioCorrection().correction_events[0], original_event_id: "missing-original-event" };
  const notFound = buildAuditModeView([x6wioSession, correctionSession(x6wioCorrection({ correction_events: [notFoundEvent] }))]);
  assert.equal(byAnchor(notFound).adjusted_totals.gross, 1550);
  assert.equal(byAnchor(notFound).invalid_corrections.some((error) => error.code === "ORIGINAL_EVENT_ID_NOT_FOUND"), true);
});

test("duplicate correction does not double apply the same original_event_id", () => {
  const first = correctionSession(x6wioCorrection(), { session_id: "CORR-ONE", anchor: "CORR-ONE" });
  const second = correctionSession(x6wioCorrection({ correction_session_id: "CORR-TWO", correction_anchor_id: "CORR-TWO" }), {
    session_id: "CORR-TWO",
    anchor: "CORR-TWO"
  });
  const audit = buildAuditModeView([x6wioSession, first, second]);
  const session = byAnchor(audit);

  assert.equal(session.adjusted_totals.gross, 80);
  assert.equal(session.correction_events.length, 2);
  assert.equal(session.invalid_corrections.some((error) => error.code === "DUPLICATE_CORRECTION_NOT_APPLIED"), true);
});

test("hard delete and silent overwrite corrections are rejected", () => {
  const hardDelete = buildAuditModeView([x6wioSession, correctionSession(x6wioCorrection({ hard_delete: true }))]);
  const silentOverwrite = buildAuditModeView([x6wioSession, correctionSession(x6wioCorrection({ silent_overwrite: true }))]);

  assert.equal(byAnchor(hardDelete).adjusted_totals.gross, 1550);
  assert.equal(byAnchor(hardDelete).invalid_corrections.some((error) => error.code === "HARD_DELETE_FORBIDDEN"), true);
  assert.equal(byAnchor(silentOverwrite).adjusted_totals.gross, 1550);
  assert.equal(byAnchor(silentOverwrite).invalid_corrections.some((error) => error.code === "SILENT_OVERWRITE_FORBIDDEN"), true);
});

test("correction requiring hard delete omission or mutable original events is rejected", () => {
  const noHardDeleteMissing = { ...x6wioCorrection() };
  delete noHardDeleteMissing.no_hard_delete;
  const immutableMissing = { ...x6wioCorrection() };
  delete immutableMissing.original_events_immutable;
  const hardDelete = buildAuditModeView([x6wioSession, correctionSession(noHardDeleteMissing)]);
  const immutable = buildAuditModeView([x6wioSession, correctionSession(immutableMissing)]);

  assert.equal(byAnchor(hardDelete).adjusted_totals.gross, 1550);
  assert.equal(byAnchor(hardDelete).invalid_corrections.some((error) => error.code === "NO_HARD_DELETE_REQUIRED"), true);
  assert.equal(byAnchor(immutable).adjusted_totals.gross, 1550);
  assert.equal(byAnchor(immutable).invalid_corrections.some((error) => error.code === "ORIGINAL_EVENTS_IMMUTABLE_REQUIRED"), true);
});

test("forbidden correction identity inputs are rejected while legacy raw fields remain visible", () => {
  const forbiddenCases = [
    { identity_basis: { card_id: "provider-card" } },
    { identity_basis: { tenant_card_id: "provider-tenant-card" } },
    { identity_basis: { provider_phone: "+971525199099" } },
    { identity_basis: { contact_phone: "+971525199099" } },
    { identity_basis: { old_ttlock_ref: "provider-lock-ref" } }
  ];

  for (const extra of forbiddenCases) {
    const event = { ...x6wioCorrection().correction_events[0], ...extra };
    const view = buildAuditModeView([x6wioSession, correctionSession(x6wioCorrection({ correction_events: [event] }))]);
    const session = byAnchor(view);
    assert.equal(session.adjusted_totals.gross, 1550);
    assert.equal(session.invalid_corrections.some((error) => error.code === "FORBIDDEN_IDENTITY_INPUT"), true);
    assert.equal(session.original_events.some((original) => original.tenant_card_id === "legacy-raw-field-is-allowed"), true);
    assert.equal(session.original_events.some((original) => original.old_ttlock_ref === "legacy-raw-field-is-allowed"), true);
  }
});

test("financial effect missing or empty is rejected fail-closed", () => {
  const missingEffect = { ...x6wioCorrection().correction_events[0] };
  delete missingEffect.financial_effect;
  const emptyEffect = { ...x6wioCorrection().correction_events[0], financial_effect: {} };

  const missing = buildAuditModeView([x6wioSession, correctionSession(x6wioCorrection({ correction_events: [missingEffect] }))]);
  const empty = buildAuditModeView([x6wioSession, correctionSession(x6wioCorrection({ correction_events: [emptyEffect] }))]);

  assert.equal(byAnchor(missing).adjusted_totals.gross, 1550);
  assert.equal(byAnchor(missing).invalid_corrections.some((error) => error.code === "FINANCIAL_EFFECT_REQUIRED"), true);
  assert.equal(byAnchor(empty).adjusted_totals.gross, 1550);
  assert.equal(byAnchor(empty).invalid_corrections.some((error) => error.code === "FINANCIAL_EFFECT_EMPTY"), true);
});

test("daily and employee summaries keep raw correction and adjusted totals separate", () => {
  const view = buildAdjustedModeView([x6wioSession, oldOwnerSession, correctionSession()]);
  const day = view.daily_summary.find((entry) => entry.date === "2026-07-07");
  const employee = view.employee_summary.find((entry) => entry.employee === "abdul");

  assert.equal(day.raw_totals.gross, 1550);
  assert.equal(day.correction_totals.gross_delta, -1470);
  assert.equal(day.adjusted_totals.gross, 80);
  assert.equal(employee.raw_totals.gross, 1550);
  assert.equal(employee.correction_totals.gross_delta, -1470);
  assert.equal(employee.adjusted_totals.gross, 80);
});

test("parser does not mutate source sessions or original events", () => {
  const input = [x6wioSession, correctionSession()];
  const before = JSON.stringify(input);

  buildAuditModeView(input);

  assert.equal(JSON.stringify(input), before);
});

test("owner history runtime behavior is not wired by H4A", async () => {
  const workerText = await readFile("deploy-worker/src/index.js", "utf8");
  assert.doesNotMatch(workerText, /correction-aware-history-parser\.mjs/);
  assert.doesNotMatch(workerText, /buildCorrectionAwareOwnerHistoryView/);
});

test("runtime production write and migration markers are absent from H4A module", async () => {
  const moduleText = await readFile("modules/owner-history/correction-aware-history-parser.mjs", "utf8");
  assert.doesNotMatch(moduleText, /OWNER_CORRECTION_APPLY_ENABLED/);
  assert.doesNotMatch(moduleText, /wrangler\s+d1\s+migrations/i);
  assert.doesNotMatch(moduleText, /production_write_scope\s*=\s*["']full/i);
});

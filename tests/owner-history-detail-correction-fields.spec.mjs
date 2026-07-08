import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildAuditModeView } from "../modules/owner-history/correction-aware-history-parser.mjs";

async function worker() {
  return readFile("deploy-worker/src/index.js", "utf8");
}

async function embeddedWorker() {
  return readFile("deploy-worker/src/index.embedded.js", "utf8");
}

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
    { event_id: "ent20260707-x6wio-01", event_type: "arrears_payment", bed: "334", amount: 80, payment_method: "cash" },
    { event_id: "ent20260707-x6wio-02", event_type: "rent", bed: "334", amount: 700, payment_method: "cash" },
    { event_id: "ent20260707-x6wip-03", event_type: "rent", bed: "134", amount: 770, payment_method: "cash" }
  ]
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
    correction_events: [
      {
        correction_event_id: "CORR-FIXTURE-x6wio-001-E1",
        correction_event_type: "void_duplicate_event",
        original_event_id: "ent20260707-x6wio-02",
        affected_bed: "334",
        affected_event_type: "rent",
        correction_reason: "Duplicate #334 rent 700 already uploaded.",
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
        affected_bed: "134",
        affected_event_type: "rent",
        correction_reason: "Duplicate #134 rent 770 already uploaded.",
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

function correctionSession(correction = x6wioCorrection()) {
  return {
    session_id: correction.correction_session_id,
    anchor: correction.correction_anchor_id,
    date: "2026-07-08",
    employee: "owner",
    source: "owner_correction",
    export_text: [
      "HOMELINK OWNER CORRECTION",
      `Correction Anchor ID: ${correction.correction_anchor_id}`,
      "",
      "==== CORRECTION ANCHORS JSON ====",
      JSON.stringify(correction),
      "==== END CORRECTION ANCHORS JSON ===="
    ].join("\n")
  };
}

test("detail endpoint keeps default array response unchanged", async () => {
  const text = await worker();
  assert.match(text, /if \(path === "\/api\/session_detail" && method === "GET"\)/);
  assert.match(text, /const includeCorrections =/);
  assert.match(text, /if\(includeCorrections\)\{/);
  assert.match(text, /return success\(detailChoice\.rows\);/);
  assert.match(text, /return success\(results\);/);
});

test("detail endpoint opt-in response exposes additive correction fields", async () => {
  const text = await worker();
  assert.match(text, /include_corrections/);
  assert.match(text, /correction_summary/);
  assert.match(text, /correction_audit/);
  assert.match(text, /return ownerHistoryDetailAdditiveResponse\(env,user,sessionRow,detailChoice\.rows\)/);
  assert.match(text, /return ownerHistoryDetailAdditiveResponse\(env,user,sessionRow,results\)/);
  assert.doesNotMatch(text, /return success\(\{\s*rows:detailChoice\.rows/);
});

test("correction summary contract contains required nested totals and counters", async () => {
  const text = await worker();
  for (const field of [
    "correction_aware:true",
    "correction_applied",
    "raw_totals",
    "correction_totals",
    "adjusted_totals",
    "correction_events_count",
    "invalid_corrections_count",
    "warnings"
  ]) {
    assert.match(text, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("correction audit contract contains original and correction visibility fields", async () => {
  const text = await worker();
  for (const field of [
    "raw_mode_available:true",
    "adjusted_mode_available:true",
    "audit_mode_available:true",
    "original_events_visible:true",
    "correction_events_visible",
    "correction_sessions",
    "correction_events",
    "invalid_corrections"
  ]) {
    assert.match(text, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("detail correction fields fail closed instead of returning HTTP 500", async () => {
  const text = await worker();
  const start = text.indexOf("function ownerHistoryDetailCorrectionFields");
  const end = text.indexOf("__name(ownerHistoryDetailCorrectionFields", start);
  const block = text.slice(start, end);

  assert.match(text, /function ownerHistoryDetailFailClosedCorrectionFields/);
  assert.match(text, /function ownerHistoryDetailSafeRawTotals/);
  assert.match(block, /catch\(error\)/);
  assert.match(block, /return ownerHistoryDetailFailClosedCorrectionFields\(session,rows,warnings\)/);
  assert.match(text, /CORRECTION_AUDIT_BUILD_FAILED/);
});

test("detail additive response protects lookup build sanitize and serialization boundaries", async () => {
  const text = await worker();
  const start = text.indexOf("async function ownerHistoryDetailAdditiveResponse");
  const end = text.indexOf("__name(ownerHistoryDetailAdditiveResponse", start);
  const block = text.slice(start, end);

  assert.match(block, /ownerCorrectionFetchExistingCorrectionSessions/);
  assert.match(block, /CORRECTION_LOOKUP_FAILED_CLOSED/);
  assert.match(block, /ownerHistoryDetailCorrectionFields/);
  assert.match(block, /ownerHistoryDetailJsonSafeValue\(correctionFields\)/);
  assert.match(block, /catch\(error\)/);
  assert.match(block, /CORRECTION_AWARE_RESPONSE_FAILED_CLOSED/);
  assert.match(block, /\.\.\.ok\(rows\)/);
  assert.match(block, /ownerHistoryDetailFailClosedCorrectionFields\(sessionRow,rows/);
});

test("detail fail-closed warnings are safe and do not expose stack or secret fields", async () => {
  const text = await worker();
  const start = text.indexOf("function ownerHistoryDetailSafeWarning");
  const end = text.indexOf("__name(ownerHistoryDetailSafeWarning", start);
  const block = text.slice(start, end);

  assert.match(block, /safe_message:cleanText\(error\?\.name\|\|error\?\.code\|\|"correction add-on failed",120\)/);
  assert.doesNotMatch(block, /stack/);
  assert.doesNotMatch(block, /message:\s*error\?\.message/);
  assert.doesNotMatch(block, /token|cookie|secret|password|env\./i);
});

test("no correction sessions produce zero correction and adjusted equals raw", () => {
  const view = buildAuditModeView([x6wioSession]);
  const session = view.sessions[0];

  assert.equal(session.correction_applied, false);
  assert.equal(session.raw_totals.gross, 1550);
  assert.equal(session.correction_totals.gross_delta, 0);
  assert.equal(session.adjusted_totals.gross, 1550);
  assert.equal(session.correction_events.length, 0);
});

test("detail no-correction normal path bypasses audit builder and returns empty warnings", async () => {
  const text = await worker();
  const start = text.indexOf("function ownerHistoryDetailCorrectionFields");
  const end = text.indexOf("__name(ownerHistoryDetailCorrectionFields", start);
  const block = text.slice(start, end);

  assert.match(text, /function ownerHistoryDetailNoCorrectionFields/);
  assert.match(block, /if\(!Array\.isArray\(correctionRows\)\|\|correctionRows\.length===0\)\{/);
  assert.match(block, /return ownerHistoryDetailNoCorrectionFields\(session,rows\)/);
  assert.match(text, /correction_applied:false/);
  assert.match(text, /correction_events_count:0/);
  assert.match(text, /invalid_corrections_count:0/);
  assert.match(text, /warnings:\[\]/);
  assert.ok(block.indexOf("return ownerHistoryDetailNoCorrectionFields(session,rows)") < block.indexOf("buildAuditModeView"));
});

test("detail no-correction normal path does not report fail-closed warning", async () => {
  const text = await worker();
  const start = text.indexOf("function ownerHistoryDetailNoCorrectionFields");
  const end = text.indexOf("__name(ownerHistoryDetailNoCorrectionFields", start);
  const block = text.slice(start, end);

  assert.doesNotMatch(block, /CORRECTION_AWARE_DETAIL_FAILED_CLOSED/);
  assert.doesNotMatch(block, /CORRECTION_AUDIT_BUILD_FAILED/);
  assert.match(block, /warnings:\[\]/);
});

test("embedded worker is the deployed entrypoint and supports opt-in correction fields", async () => {
  const wrangler = await readFile("deploy-worker/wrangler.embedded.toml", "utf8");
  const embedded = await embeddedWorker();

  assert.match(wrangler, /main\s*=\s*"src\/index\.embedded\.js"/);
  assert.match(embedded, /if \(path === "\/api\/session_detail" && method === "GET"\)/);
  assert.match(embedded, /const includeCorrections =/);
  assert.match(embedded, /ownerHistoryDetailCorrectionFields/);
  assert.match(embedded, /ownerHistoryDetailNoCorrectionFields/);
  assert.match(embedded, /return ownerHistoryDetailAdditiveResponse\(env,user,sessionRow,detailChoice\.rows\)/);
  assert.match(embedded, /return ownerHistoryDetailAdditiveResponse\(env,user,sessionRow,results\)/);
  assert.match(embedded, /return success\(results\);/);
});

test("embedded opt-in keeps legacy wrapper data as array with top-level correction fields", async () => {
  const embedded = await embeddedWorker();

  assert.match(embedded, /return ownerHistoryDetailAdditiveResponse\(env,user,sessionRow,detailChoice\.rows\)/);
  assert.match(embedded, /return ownerHistoryDetailAdditiveResponse\(env,user,sessionRow,results\)/);
  assert.match(embedded, /correction_summary:\s*\{/);
  assert.match(embedded, /correction_audit:\s*\{/);
  assert.doesNotMatch(embedded, /return success\(\{\s*rows:/);
});

test("fixture correction session produces x6wio adjusted totals", () => {
  const view = buildAuditModeView([x6wioSession, correctionSession()]);
  const session = view.sessions[0];

  assert.equal(session.raw_totals.cash, 1550);
  assert.equal(session.raw_totals.gross, 1550);
  assert.equal(session.raw_totals.rent_income, 1470);
  assert.equal(session.raw_totals.arrears_repaid, 80);
  assert.equal(session.correction_totals.cash_delta, -1470);
  assert.equal(session.correction_totals.gross_delta, -1470);
  assert.equal(session.correction_totals.rent_income_delta, -1470);
  assert.equal(session.adjusted_totals.cash, 80);
  assert.equal(session.adjusted_totals.gross, 80);
  assert.equal(session.adjusted_totals.rent_income, 0);
  assert.equal(session.adjusted_totals.arrears_repaid, 80);
});

test("original events remain visible and correction events are separate", () => {
  const view = buildAuditModeView([x6wioSession, correctionSession()]);
  const session = view.sessions[0];

  assert.equal(session.original_events_visible, true);
  assert.equal(session.original_events.length, 3);
  assert.equal(session.correction_events_visible, true);
  assert.equal(session.correction_events.length, 2);
});

test("invalid and forbidden correction inputs are nested warnings only and not applied", () => {
  const invalid = x6wioCorrection({
    correction_events: [{
      ...x6wioCorrection().correction_events[0],
      identity_basis: { tenant_card_id: "forbidden" }
    }]
  });
  const view = buildAuditModeView([x6wioSession, correctionSession(invalid)]);
  const session = view.sessions[0];

  assert.equal(session.adjusted_totals.gross, 1550);
  assert.equal(session.correction_events.length, 0);
  assert.equal(session.invalid_corrections.some((error) => error.code === "FORBIDDEN_IDENTITY_INPUT"), true);
});

test("detail correction lookup is targeted by target anchor and does not scan full history", async () => {
  const text = await worker();
  assert.match(text, /ownerCorrectionFetchExistingCorrectionSessions\(env,user,targetAnchor\)/);
  assert.match(text, /COALESCE\(export_text,''\) LIKE \?/);
  assert.match(text, /LIMIT 1000/);
});

test("production apply remains disabled and no write is introduced by detail fields", async () => {
  const text = await worker();
  assert.match(text, /ownerCorrectionApplyEnabled/);
  assert.match(text, /OWNER_CORRECTION_APPLY_DISABLED/);
  assert.doesNotMatch(text, /ownerHistoryDetailCorrectionFields[\s\S]{0,4000}empInsertDynamic/);
  assert.doesNotMatch(text, /ownerHistoryDetailCorrectionFields[\s\S]{0,4000}\.run\(/);
  assert.doesNotMatch(text, /ownerHistoryDetailCorrectionFields[\s\S]{0,4000}\.batch\(/);
});

test("owner list overview and UI are not changed for H4B", async () => {
  const text = await worker();
  assert.doesNotMatch(text, /path === "\/api\/history"[\s\S]{0,1200}include_corrections/);
  assert.doesNotMatch(text, /phase0OwnerOverviewComparativeSummary[\s\S]{0,1200}include_corrections/);
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  assert.doesNotMatch(ui, /include_corrections/);
  assert.doesNotMatch(ui, /correction_summary/);
});

test("manual live verification script is read-only and uses additive detail mode", async () => {
  const text = await readFile("docs/H4B_DETAIL_ENDPOINT_MANUAL_LIVE_VERIFY.md", "utf8");
  assert.match(text, /\/api\/history\?limit=100/);
  assert.match(text, /Array\.isArray\(history\?\.data\) \? history\.data : \[\]/);
  assert.match(text, /\/api\/session_detail\?id=\$\{encodeURIComponent\(session\.id\)\}&include_corrections=1/);
  assert.match(text, /correction_applied: summary\.correction_applied === false/);
  assert.match(text, /production_write: "no"/);
  assert.doesNotMatch(text, /method:\s*["']POST["']/);
  assert.doesNotMatch(text, /\/api\/owner\/corrections\/apply/);
});

test("H4B regression live verification script covers legacy opt-in and disabled apply", async () => {
  const text = await readFile("docs/H4B_REGRESSION_H3B1_DISABLED_GATE_MANUAL_LIVE_VERIFY.md", "utf8");
  assert.match(text, /\/api\/session_detail\?id=S20260707-x6wio"/);
  assert.match(text, /\/api\/session_detail\?id=S20260707-x6wio&include_corrections=1/);
  assert.match(text, /\/api\/owner\/corrections\/apply/);
  assert.match(text, /OWNER_CORRECTION_APPLY_DISABLED/);
  assert.match(text, /production_write: "no"/);
  assert.match(text, /x6wio_corrected: false/);
  assert.doesNotMatch(text, /OWNER_CORRECTION_APPLY_ENABLED/);
  assert.doesNotMatch(text, /OWNER_CORRECTION_TARGET_SCOPED_APPLY_ENABLED/);
});

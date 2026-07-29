import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import {
  QA_FULL_FINANCE_EXPECTED,
  QA_FULL_SCENARIOS,
} from "./fixtures/employee-qa-acceptance-matrices.mjs";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);

function functionBlock(source, name, async = false) {
  const start = source.indexOf(`${async ? "async " : ""}function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf(`__name(${name},`, start);
  assert.ok(end > start, `${name} must end at __name marker`);
  return source.slice(start, end);
}

async function summaryRuntime() {
  const worker = await readFile(workerPath, "utf8");
  const sandbox = {
    Map,
    Set,
    JSON,
    Math,
    Number,
    Object,
    String,
    cleanText: (value, max = 1000) => String(value ?? "").trim().slice(0, max),
    ownerOverviewMoney: value => Math.round((Number(value) || 0) * 100) / 100,
    entryAnchorType: row => String(row?.type || ""),
    entryAnchorEventType: type => ({ R: "rent", AP: "arrears_payment", D: "deposit_in", DR: "deposit_out", CO: "checkout", E: "expense", TF: "bed_transfer" })[String(type || "").toUpperCase()] || "",
  };
  vm.createContext(sandbox);
  for (const name of [
    "canonicalFinanceProjectionZeroTotals",
    "canonicalFinanceProjectionRoundTotals",
    "canonicalFinanceProjectionPaymentMethod",
    "canonicalFinanceProjectionAmount",
    "canonicalFinanceProjectionEventType",
    "canonicalFinanceProjectionAddInflow",
    "canonicalFinanceProjectionAddOutflow",
    "canonicalFinanceProjectionApplyAnchor",
    "qaAcceptanceFinanceComparable",
    "canonicalSessionSummaryEntryIdentity",
    "canonicalSessionSummaryNormalizeAnchor",
    "calculateCanonicalSessionSummary",
    "canonicalSessionSummaryClientDiagnostic",
    "canonicalSessionSummaryWithClientDiagnostic",
    "canonicalSessionSummaryPersistenceFields",
    "canonicalSessionSummaryRead",
    "qaAcceptanceCanonicalSessionSummaryPlan",
    "qaAcceptanceSessionSummaryParity",
  ]) vm.runInContext(functionBlock(worker, name), sandbox);
  vm.runInContext(`const QA_SESSION_SUMMARY_PARITY_FIELDS=${JSON.stringify([
    "cash_received", "bank_received", "total_received", "cash_out", "bank_out", "total_expenses", "net_funds", "cash_net", "net_cash", "bank_net", "outstanding", "arrears_opened", "arrears_repaid", "deposit_included", "deposit_refund", "expense", "bed_transfer_fee", "rent_income", "cash_handover", "bank_transfer_total", "bank_transfer_count", "gross_received", "balance_total",
  ])};`, sandbox);
  vm.runInContext(functionBlock(worker, "qaAcceptancePersistCanonicalSessionSummaries", true), sandbox);
  return { worker, sandbox };
}

function fullEntries() {
  return QA_FULL_SCENARIOS.map((row, index) => ({ ...structuredClone(row.input), entry_identity: `QAF-E-${index + 1}`, session_id: `QAF-S-${index + 1}` }));
}

test("server canonical summary covers the Full 41-entry oracle without client summary", async () => {
  const { sandbox } = await summaryRuntime();
  const summary = sandbox.calculateCanonicalSessionSummary(fullEntries(), fullEntries(), []);
  for (const [field, expected] of Object.entries(QA_FULL_FINANCE_EXPECTED)) {
    assert.equal(summary[field], expected, `${field} must come from canonical entries`);
  }
  assert.equal(summary.entry_count, 41);
  assert.equal(summary.server_authoritative, true);
  assert.equal(summary.summary_contract_version, "canonical-session-summary-v1");
});

test("missing or malicious client summary cannot zero or override canonical truth", async () => {
  const { sandbox } = await summaryRuntime();
  const rent = { entry_identity: "E-RENT", type: "R", event_type: "rent", paid_amount: 700, expected_rent: 700, payment_method: "cash" };
  const missing = sandbox.canonicalSessionSummaryWithClientDiagnostic({}, [rent], [rent], []);
  assert.equal(missing.cash_received, 700);
  assert.equal(missing.gross_received, 700);
  assert.equal(missing.cash_handover, 700);
  assert.equal(missing.client_summary_diagnostic.client_summary_present, false);

  const forged = sandbox.canonicalSessionSummaryWithClientDiagnostic({ cash_handover: 9999, gross_received: 9999 }, [rent], [rent], []);
  const persisted = sandbox.canonicalSessionSummaryPersistenceFields(forged);
  assert.equal(persisted.cash_handover, 700);
  assert.equal(persisted.gross_received, 700);
  assert.equal(forged.client_summary_diagnostic.mismatch, true);
  assert.deepEqual([...forged.client_summary_diagnostic.mismatched_fields].sort(), ["cash_handover", "gross_received"]);
  assert.equal(forged.client_summary_diagnostic.client_values_accepted_for_persistence, false);

  const forgedNested = sandbox.canonicalSessionSummaryWithClientDiagnostic({ summary: { cash_handover: 9999, gross_received: 9999 } }, [rent], [rent], []);
  assert.equal(forgedNested.cash_received, 700);
  assert.equal(forgedNested.client_summary_diagnostic.mismatch, true);
  assert.equal(forgedNested.client_summary_diagnostic.client_values_accepted_for_persistence, false);
});

test("seven-event semantics keep deposits, expenses, arrears, checkout, and transfer fees isolated", async () => {
  const { sandbox } = await summaryRuntime();
  const rows = [
    { entry_identity: "R", event_type: "rent", paid_amount: 700, expected_rent: 770, payment_method: "bank" },
    { entry_identity: "AP", event_type: "arrears_payment", payment_amount: 70, payment_method: "cash" },
    { entry_identity: "DI", event_type: "deposit_in", deposit_paid_amount: 200, payment_method: "cash" },
    { entry_identity: "DO", event_type: "deposit_out", actual_refund_amount: 100, payment_method: "bank" },
    { entry_identity: "CO", event_type: "checkout", amount: 0 },
    { entry_identity: "LWA", event_type: "left_with_arrears", left_arrears_amount: 80 },
    { entry_identity: "EX", event_type: "expense", expense_amount: 50, payment_method: "cash" },
    { entry_identity: "TFC", event_type: "bed_transfer", fee_mode: "paid", fee_amount_aed: 50, payment_method: "cash" },
    { entry_identity: "TFB", event_type: "bed_transfer", payment_status: "paid", fee_amount_aed: 50, payment_method: "bank" },
    { entry_identity: "TFW", event_type: "bed_transfer", payment_status: "waived", fee_amount_aed: 50, payment_method: "cash" },
  ];
  const summary = sandbox.calculateCanonicalSessionSummary(rows, rows, []);
  assert.equal(summary.rent_income, 700);
  assert.equal(summary.arrears_repaid, 70);
  assert.equal(summary.arrears_opened, 150);
  assert.equal(summary.deposit_included, 200);
  assert.equal(summary.deposit_refund, 100);
  assert.equal(summary.expense, 50);
  assert.equal(summary.bed_transfer_fee, 100);
  assert.equal(summary.cash_received, 320);
  assert.equal(summary.bank_received, 750);
  assert.equal(summary.cash_out, 50);
  assert.equal(summary.bank_out, 100);
});

test("Full finalization persists all 41 summaries in one batch with deterministic retry parity", async () => {
  const { sandbox } = await summaryRuntime();
  const scenarios = QA_FULL_SCENARIOS.map((row, index) => ({ ...row, entry_id: `QAF-E-${index + 1}`, session_id: `QAF-S-${index + 1}` }));
  const locations = new Map(), sessions = new Map(), transactions = new Map();
  for (const scenario of scenarios) {
    const entry = { ...structuredClone(scenario.input), entry_identity: scenario.entry_id, session_id: scenario.session_id };
    const session = { id: scenario.session_id, cash_handover: 9999, bank_transfer_total: 9999, bank_transfer_count: 99, gross_received: 9999, summary_json: "" };
    locations.set(scenario.entry_id, { session, entry });
    sessions.set(scenario.session_id, session);
    if (scenario.event_type !== "bed_transfer") transactions.set(scenario.entry_id, { ...entry, id: scenario.entry_id });
  }
  const context = { qa_persisted_entry_locations: locations, qa_persisted_sessions_by_id: sessions, qa_persisted_transactions_by_id: transactions };
  let batchCount = 0;
  const env = {
    DB: {
      prepare: query => ({ bind: (...args) => ({ query, args }) }),
      batch: async statements => { batchCount += 1; assert.equal(statements.length, 41); },
    },
  };
  const contract = { scenarios };
  const first = await sandbox.qaAcceptancePersistCanonicalSessionSummaries(env, { corpid: "HL-QA" }, contract, context, { complete: true });
  assert.equal(first.ok, true);
  assert.equal(first.parity_count, 41);
  assert.equal(first.mismatch_count, 0);
  assert.equal(batchCount, 1);
  assert.equal([...sessions.values()].every(row => row.handover_status === "COMPLETED"), true);

  const stable = [...sessions.values()].map(row => row.summary_json);
  const retry = await sandbox.qaAcceptancePersistCanonicalSessionSummaries(env, { corpid: "HL-QA" }, contract, context, { complete: true });
  assert.equal(retry.ok, true);
  assert.equal(retry.parity_count, 41);
  assert.deepEqual([...sessions.values()].map(row => row.summary_json), stable);
  assert.equal(batchCount, 2);
});

test("finalization is fail-closed on summary parity and old UPLOAD_PASS remains read-only", async () => {
  const { worker } = await summaryRuntime();
  const finalize = functionBlock(worker, "qaAcceptanceFinalizePersistedRun", true);
  const resume = functionBlock(worker, "qaAcceptanceSessionResume", true);
  const uploadPassBranch = finalize.slice(finalize.indexOf('if(String(run.status||"")==="UPLOAD_PASS")'), finalize.indexOf('if(String(run.status||"")!=="MANUAL_EMPLOYEE_ACCEPTED"'));
  assert.doesNotMatch(uploadPassBranch, /qaAcceptancePersistCanonicalSessionSummaries/);
  assert.match(finalize, /QA_SESSION_SUMMARY_PARITY_MISMATCH/);
  assert.match(resume, /qaAcceptancePersistCanonicalSessionSummaries/);
  assert.match(resume, /session_summary_result/);
  assert.doesNotMatch(functionBlock(worker, "qaAcceptanceScenarioRequestBody"), /cash_handover|bank_transfer_total|gross_received/);
});

test("Owner History and Detail expose the persisted server summary without renderer recomputation", async () => {
  const { worker } = await summaryRuntime();
  const sandbox = {
    JSON,
    cleanText: value => String(value ?? "").trim(),
    canonicalOwnerHistoryArchiveState: () => "active",
    canonicalOwnerHistoryActiveForTotals: () => true,
    canonicalOwnerHistoryEffectiveTotalsForState: () => ({}),
    canonicalOwnerHistorySourceProof: () => ({ gateway: "canonical_owner_history_archive_gateway" }),
    extractEmployeeEntryAnchorsFromSession: () => [{}],
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(worker, "canonicalSessionSummaryRead"),
    functionBlock(worker, "canonicalOwnerHistorySessionRow"),
    functionBlock(worker, "canonicalOwnerHistoryDetailGatewayFields"),
    "this.history=canonicalOwnerHistorySessionRow;this.detail=canonicalOwnerHistoryDetailGatewayFields",
  ].join("\n"), sandbox);
  const summary = { summary_contract_version: "canonical-session-summary-v1", server_authoritative: true, cash_received: 700, gross_received: 700, cash_net: 700, net_funds: 700 };
  const session = { id: "S-OWNER", summary_json: JSON.stringify(summary) };
  const history = sandbox.history(session);
  const detail = sandbox.detail(session, []);
  assert.equal(history.cash_received, 700);
  assert.equal(history.session_summary.net_funds, 700);
  assert.equal(detail.gross_received, 700);
  assert.equal(detail.session_summary.cash_net, 700);
});

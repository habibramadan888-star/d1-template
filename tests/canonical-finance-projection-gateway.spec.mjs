import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const marker = `__name(${name},`;
  const end = source.indexOf(marker, start);
  assert.ok(end > start, `${name} must end at __name marker`);
  return source.slice(start, end);
}

function asyncFunctionBlock(source, name) {
  const start = source.indexOf(`async function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const marker = `__name(${name},`;
  const end = source.indexOf(marker, start);
  assert.ok(end > start, `${name} must end at __name marker`);
  return source.slice(start, end);
}

test("canonical finance gateway exposes required projection fields and source proof", async () => {
  const worker = await readFile(workerPath, "utf8");
  const totals = functionBlock(worker, "canonicalFinanceProjectionZeroTotals");
  const proof = functionBlock(worker, "canonicalFinanceProjectionSourceProof");
  const build = asyncFunctionBlock(worker, "canonicalFinanceProjectionBuild");

  for (const field of [
    "cash_received",
    "bank_received",
    "gross_received",
    "rent_income",
    "deposit_received",
    "deposit_refund",
    "arrears_repaid",
    "arrears_opened_amount",
    "arrears_opened_count",
    "expenses",
    "bed_transfer_fee",
    "cash_out",
    "bank_out",
    "net_cash"
  ]) {
    assert.match(totals, new RegExp(`${field}:0`), `${field} must be initialized`);
  }

  assert.match(build, /active_session_count/);
  assert.match(build, /voided_session_count/);
  assert.match(build, /corrected_session_count/);
  assert.match(build, /excluded_records/);
  assert.match(build, /reconciliation_warnings/);
  assert.match(build, /readonly:true/);

  assert.match(proof, /canonical_finance_projection_gateway/);
  assert.match(proof, /canonical_event_archive/);
  assert.match(proof, /entries_json/);
  assert.match(proof, /correction_anchors/);
  assert.match(proof, /void_anchors/);
  assert.match(proof, /reversal_anchors/);
  assert.match(proof, /archive_effective_totals/);
  assert.match(proof, /TTLock \/ Access Snapshot D amount/);
  assert.match(proof, /financial_movement_and_audit_evidence/);
  assert.match(proof, /owner_history_write_source:false/);

  for (const forbidden of [
    "owner_display_text",
    "employee_local_cache",
    "preview_text",
    "whatsapp_export_text",
    "tenant_card_id",
    "card_id",
    "old_ttlock_ref",
    "provider_phone",
    "phone_99099",
    "ttlock_provider_metadata"
  ]) {
    assert.match(proof, new RegExp(forbidden), `${forbidden} must be forbidden as finance truth`);
  }
});

test("canonical finance anchor rules separate rent arrears deposits expenses and transfer fees", async () => {
  const worker = await readFile(workerPath, "utf8");
  const apply = functionBlock(worker, "canonicalFinanceProjectionApplyAnchor");

  assert.match(apply, /type==="rent"/);
  assert.match(apply, /expected_rent/);
  assert.match(apply, /expected_amount/);
  assert.match(apply, /Math\.max\(0,expected-paid\)/);
  assert.match(apply, /totals\.rent_income\+=paid/);
  assert.match(apply, /totals\.arrears_opened_amount\+=arrears/);
  assert.match(apply, /totals\.arrears_opened_count\+=1/);

  assert.match(apply, /type==="arrears_payment"/);
  assert.match(apply, /totals\.arrears_repaid\+=amount/);
  assert.doesNotMatch(apply.slice(apply.indexOf('type==="arrears_payment"'), apply.indexOf('type==="deposit_in"')), /rent_income/);

  assert.match(apply, /type==="deposit_in"/);
  assert.match(apply, /totals\.deposit_received\+=amount/);
  assert.doesNotMatch(apply.slice(apply.indexOf('type==="deposit_in"'), apply.indexOf('type==="deposit_out"')), /rent_income/);

  assert.match(apply, /type==="deposit_out"/);
  assert.match(apply, /totals\.deposit_refund\+=amount/);
  assert.doesNotMatch(apply.slice(apply.indexOf('type==="deposit_out"'), apply.indexOf('type==="expense"')), /rent_income/);

  assert.match(apply, /type==="expense"/);
  assert.match(apply, /totals\.expenses\+=amount/);
  assert.doesNotMatch(apply.slice(apply.indexOf('type==="expense"'), apply.indexOf('type==="bed_transfer"')), /rent_income/);

  assert.match(apply, /type==="bed_transfer"/);
  assert.match(apply, /feeStatus/);
  assert.match(apply, /!feeStatus\.includes\("waiv"\)/);
  assert.match(apply, /totals\.bed_transfer_fee\+=amount/);
});

test("canonical finance gateway uses archive semantics and corrected effective totals", async () => {
  const worker = await readFile(workerPath, "utf8");
  const fetchSessions = asyncFunctionBlock(worker, "canonicalFinanceProjectionFetchSessions");
  const build = asyncFunctionBlock(worker, "canonicalFinanceProjectionBuild");
  const correctionBatch = asyncFunctionBlock(worker, "ownerCorrectionFetchCorrectionSessionsByTarget");
  const correction = functionBlock(worker, "canonicalFinanceProjectionApplyCorrectionEffectiveTotals");

  assert.match(fetchSessions, /empTableColumns\(env,"sessions"\)/);
  assert.match(fetchSessions, /entries_json/);
  assert.match(fetchSessions, /'' AS entries_json/);
  assert.match(fetchSessions, /export_text/);
  assert.match(correctionBatch, /CORRECTION ANCHORS JSON/);
  assert.match(correctionBatch, /parseOwnerCorrectionAnchorText/);
  assert.match(correctionBatch, /byTarget/);
  assert.match(build, /ownerCorrectionFetchCorrectionSessionsByTarget/);
  assert.match(build, /extractEmployeeEntryAnchorsFromSession/);
  assert.match(build, /ownerHistoryArchiveDetailRows\(env,user,session,true\)/);
  assert.doesNotMatch(build, /ownerCorrectionFetchExistingCorrectionSessions/);
  assert.match(build, /ownerHistoryDetailCorrectionFields/);
  assert.match(build, /canonicalOwnerHistoryArchiveState/);
  assert.match(build, /canonicalOwnerHistoryActiveForTotals/);
  assert.match(build, /archiveState==="voided"\|\|archiveState==="deleted"\|\|archiveState==="reversed"/);
  assert.match(build, /excluded_from_active_finance_totals/);
  assert.match(build, /summary\.correction_applied/);
  assert.match(build, /canonicalFinanceProjectionApplyCorrectionEffectiveTotals/);
  assert.match(build, /extractEmployeeEntryAnchorsFromSession/);
  assert.match(build, /CANONICAL_ANCHORS_MISSING/);

  for (const field of [
    "cash",
    "bank",
    "gross",
    "rent_income",
    "deposit_liability",
    "arrears_repaid",
    "arrears_open",
    "expense",
    "transfer_fee"
  ]) {
    assert.match(correction, new RegExp(field), `${field} effective total must be read`);
  }
  assert.match(correction, /depositRefund/);
  assert.match(correction, /totals\.cash_out\+=depositRefund\+expense/);
});

test("owner finance projection route and overview summaries use the gateway", async () => {
  const worker = await readFile(workerPath, "utf8");
  const handler = asyncFunctionBlock(worker, "handleOwnerFinanceProjection");
  const overview = asyncFunctionBlock(worker, "phase0OwnerOverviewComparativeSummary");

  assert.match(worker, /path==="\/api\/owner\/finance\/projection"/);
  assert.match(handler, /canonicalFinanceProjectionBuild/);
  assert.match(handler, /include_voided/);
  assert.match(handler, /include_corrections/);
  assert.match(handler, /ownerOverviewBillingPeriodRange/);

  assert.match(overview, /safeFinanceProjection/);
  assert.match(overview, /canonicalFinanceProjectionBuild/);
  assert.match(overview, /canonicalFinanceProjectionToOverviewSummary/);
  assert.match(overview, /canonical_finance_projection_gateway_billing_period_3_to_2/);
  assert.match(overview, /current_billing_period_finance_projection/);
  assert.doesNotMatch(overview, /monthFinanceProjection/);
  assert.doesNotMatch(overview, /lastMonthFinanceProjection/);
  assert.doesNotMatch(overview, /quarterFinanceProjection/);
});

test("live owner read routes expose finance gateway and cap history list scans", async () => {
  const worker = await readFile(workerPath, "utf8");
  const liveRoutes = worker.slice(worker.indexOf('if (path === "/api/owner/overview/comparative-summary"'), worker.indexOf('if (path === "/api/session_detail"'));

  assert.match(liveRoutes, /path === "\/api\/owner\/finance\/projection"/);
  assert.match(liveRoutes, /handleOwnerFinanceProjection\(request, env, user\)/);
  assert.match(liveRoutes, /Math\.min\(Math\.floor\(rawLimit\), 30\)/);
  assert.match(liveRoutes, /: 30/);
  assert.doesNotMatch(liveRoutes, /Math\.min\(Math\.floor\(rawLimit\), 100\)/);
});

test("canonical finance gateway remains read-only", async () => {
  const worker = await readFile(workerPath, "utf8");
  const blocks = [
    functionBlock(worker, "canonicalFinanceProjectionZeroTotals"),
    functionBlock(worker, "canonicalFinanceProjectionSourceProof"),
    functionBlock(worker, "canonicalFinanceProjectionApplyAnchor"),
    functionBlock(worker, "canonicalFinanceProjectionApplyCorrectionEffectiveTotals"),
    asyncFunctionBlock(worker, "canonicalFinanceProjectionFetchSessions"),
    asyncFunctionBlock(worker, "canonicalFinanceProjectionBuild"),
    functionBlock(worker, "canonicalFinanceProjectionToOverviewSummary"),
    asyncFunctionBlock(worker, "handleOwnerFinanceProjection")
  ].join("\n");

  assert.doesNotMatch(blocks, /\.run\(/);
  assert.doesNotMatch(blocks, /INSERT\s+INTO/i);
  assert.doesNotMatch(blocks, /UPDATE\s+/i);
  assert.doesNotMatch(blocks, /DELETE\s+FROM/i);
  assert.match(blocks, /readonly:true/);
});

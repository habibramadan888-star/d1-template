import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf(`__name(${name}`, start);
  assert.ok(end > start, `${name} must have __name marker`);
  return source.slice(start, end);
}

function routeBlock(source, marker, nextMarker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${marker} route must exist`);
  const end = nextMarker ? source.indexOf(nextMarker, start + marker.length) : -1;
  return source.slice(start, end > start ? end : start + 2400);
}

test("canonical owner history gateway exposes archive states and source proof", async () => {
  const worker = await readFile(workerPath, "utf8");
  const state = functionBlock(worker, "canonicalOwnerHistoryArchiveState");
  const summary = functionBlock(worker, "canonicalOwnerHistoryCorrectionSummaryWithArchiveSemantics");
  const effective = functionBlock(worker, "canonicalOwnerHistoryEffectiveTotalsForState");
  const proof = functionBlock(worker, "canonicalOwnerHistorySourceProof");
  const row = functionBlock(worker, "canonicalOwnerHistorySessionRow");
  const detail = functionBlock(worker, "canonicalOwnerHistoryDetailGatewayFields");

  assert.match(state, /missing/);
  assert.match(state, /REVERSED/);
  assert.match(state, /DELETED/);
  assert.match(state, /VOIDED/);
  assert.match(state, /correction_applied/);
  assert.match(state, /CORR-/);
  assert.match(effective, /canonicalOwnerHistoryActiveForTotals/);
  assert.match(effective, /canonicalOwnerHistoryZeroTotals/);
  assert.match(summary, /corrected_totals/);
  assert.match(summary, /archive_effective_totals/);
  assert.match(summary, /active_for_totals/);
  assert.match(summary, /correction_history_visible/);

  assert.match(proof, /L1 Canonical Event Archive/);
  assert.match(proof, /entries_json/);
  assert.match(proof, /correction_anchors/);
  assert.match(proof, /void_reversal_anchors/);
  assert.match(proof, /display_only_legacy_compatibility/);
  assert.match(proof, /owner_display_text_as_write_source/);
  assert.match(proof, /employee_local_cache/);
  assert.match(proof, /whatsapp_export_text/);
  assert.match(proof, /preview_text/);

  for (const forbidden of ["tenant_card_id", "card_id", "old_ttlock_ref", "provider_phone", "phone_99099"]) {
    assert.match(proof, new RegExp(forbidden));
  }

  assert.match(row, /archive_state/);
  assert.match(row, /active_archive_record/);
  assert.match(row, /archive_effective_correction_aware/);
  assert.match(row, /archive_effective_raw/);
  assert.match(row, /correction_totals/);
  assert.match(row, /corrected_totals/);
  assert.match(row, /archive_effective_totals/);
  assert.match(row, /source_proof/);

  assert.match(detail, /archive_gateway/);
  assert.match(detail, /entries_json_preferred/);
  assert.match(detail, /fallback_parser_display_only/);
  assert.match(detail, /owner_history_write_source:false/);
  assert.match(detail, /provider_identity_used:false/);
  assert.match(detail, /active_for_totals/);
  assert.match(detail, /archive_effective_totals/);
});

test("owner history routes are canonical archive gateway based", async () => {
  const worker = await readFile(workerPath, "utf8");
  const history = routeBlock(worker, 'if (path === "/api/history")', 'if (path === "/api/session_detail"');
  const detail = routeBlock(worker, 'if (path === "/api/session_detail" && method === "GET")', 'return errorResponse("not_found"');

  assert.match(history, /COALESCE\(voided_at,''\)=''/);
  assert.match(history, /COALESCE\(handover_status,''\)<>'VOID'/);
  assert.match(history, /canonicalOwnerHistorySessionRowsForList\(env,user,results\|\|\[\]\)/);
  assert.doesNotMatch(history, /parseEmployeeEntryExportRows/);

  assert.match(detail, /extractEmployeeEntryAnchorsFromSession\(sessionRow\)/);
  assert.match(detail, /chooseOwnerEmployeeSessionDetailRows/);
  assert.match(detail, /ownerHistoryDetailAdditiveResponse/);
  assert.match(detail, /canonicalOwnerHistoryDetailGatewayFields/);
  assert.match(detail, /includeVoided\|\|includeCorrections/);
  assert.match(detail, /archive_state:"missing"/);
});

test("archive correction and void totals expose raw corrected and effective semantics", async () => {
  const worker = await readFile(workerPath, "utf8");
  const noCorrection = functionBlock(worker, "ownerHistoryDetailNoCorrectionFields");
  const failClosed = functionBlock(worker, "ownerHistoryDetailFailClosedCorrectionFields");
  const direct = functionBlock(worker, "ownerHistoryDetailDirectCorrectionFields");
  const row = functionBlock(worker, "canonicalOwnerHistorySessionRow");
  const detail = functionBlock(worker, "canonicalOwnerHistoryDetailGatewayFields");

  assert.match(noCorrection, /canonicalOwnerHistoryCorrectionSummaryWithArchiveSemantics/);
  assert.match(failClosed, /canonicalOwnerHistoryCorrectionSummaryWithArchiveSemantics/);
  assert.match(direct, /canonicalOwnerHistoryCorrectionSummaryWithArchiveSemantics/);
  assert.match(direct, /correction_events_count:correctionEvents\.length/);
  assert.match(direct, /correction_sessions_count:correctionSessions\.length/);
  assert.match(row, /active_for_totals/);
  assert.match(row, /archive_effective_totals/);
  assert.match(detail, /raw_totals/);
  assert.match(detail, /correction_totals/);
  assert.match(detail, /corrected_totals/);
  assert.match(detail, /archive_effective_totals/);
});

test("owner history list enriches rows with correction-aware archive effective totals", async () => {
  const worker = await readFile(workerPath, "utf8");
  const detailRows = functionBlock(worker, "ownerHistoryArchiveDetailRows");
  const rowForList = functionBlock(worker, "canonicalOwnerHistorySessionRowForList");
  const rowsForList = functionBlock(worker, "canonicalOwnerHistorySessionRowsForList");

  assert.match(detailRows, /includeArchiveRows/);
  assert.match(detailRows, /SELECT \* FROM transactions WHERE session_id=\? AND corpid=\? ORDER BY created_at ASC/);
  assert.match(detailRows, /extractEmployeeEntryAnchorsFromSession/);
  assert.match(detailRows, /chooseOwnerEmployeeSessionDetailRows/);
  assert.match(rowForList, /ownerCorrectionFetchExistingCorrectionSessions/);
  assert.match(rowForList, /ownerHistoryDetailCorrectionFields/);
  assert.match(rowForList, /canonicalOwnerHistorySessionRow/);
  assert.match(rowsForList, /Promise\.all/);
});

test("entries_json is preferred over display text and fallback is display-only", async () => {
  const worker = await readFile(workerPath, "utf8");
  const extractor = functionBlock(worker, "extractEmployeeEntryAnchorsFromSession");
  const chooser = functionBlock(worker, "chooseOwnerEmployeeSessionDetailRows");
  const sourceProof = functionBlock(worker, "canonicalOwnerHistorySourceProof");
  const detail = functionBlock(worker, "canonicalOwnerHistoryDetailGatewayFields");

  assert.match(extractor, /parseEmployeeEntryAnchorJson\(session\?\.entries_json\)/);
  assert.match(extractor, /ENTRY ANCHORS JSON/);
  assert.match(extractor, /direct\.length\?direct:fromBlock/);
  assert.match(chooser, /source:"structured"/);
  assert.match(chooser, /source:"transactions"/);
  assert.match(chooser, /source:"export_text"/);
  assert.match(chooser, /structured:0,transactions:1,export_text:2/);
  assert.match(sourceProof, /fallback_parser_role:"display_only_legacy_compatibility"/);
  assert.match(detail, /LEGACY_DISPLAY_TEXT_FALLBACK_USED_FOR_DISPLAY_ONLY/);
});

test("owner history gateway helpers remain read-only and do not become write source", async () => {
  const worker = await readFile(workerPath, "utf8");
  const blocks = [
    functionBlock(worker, "canonicalOwnerHistoryArchiveState"),
    functionBlock(worker, "canonicalOwnerHistorySourceProof"),
    functionBlock(worker, "canonicalOwnerHistorySessionRow"),
    functionBlock(worker, "canonicalOwnerHistoryDetailGatewayFields")
  ].join("\n");

  assert.doesNotMatch(blocks, /\.run\(/);
  assert.doesNotMatch(blocks, /INSERT\s+INTO/i);
  assert.doesNotMatch(blocks, /UPDATE\s+/i);
  assert.doesNotMatch(blocks, /DELETE\s+FROM/i);
  assert.doesNotMatch(blocks, /env\.DB\.prepare/);
});

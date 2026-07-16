import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workerPath = new URL('../deploy-worker/src/index.js', import.meta.url);
const worker = await readFile(workerPath, 'utf8');

function functionBlock(name) {
  const start = worker.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = worker.indexOf(`__name(${name}`, start);
  assert.notEqual(end, -1, `${name} must have a bounded function block`);
  return worker.slice(start, end);
}

test('canonical Owner History routes add transfer_lineage without replacing data', () => {
  assert.match(worker, /path === "\/api\/history"/);
  assert.match(worker, /path === "\/api\/session_detail"/);
  assert.match(worker, /transferLineage\?\{transfer_lineage:transferLineage\}:\{\}/);
  assert.match(worker, /qa_run_scope:qaAcceptanceOwnerRunScopeMeta\(qaScope\)/);
  assert.match(worker, /\.\.\.ok\(detailChoice\.rows\)/);
});

test('lineage query is owner-only while non-lineage history behavior is retained', () => {
  const requestBed = functionBlock('ownerHistoryTransferLineageRequestedBed');
  assert.match(requestBed, /requested_bed/);
  assert.match(requestBed, /searchParams.*bed/);
  assert.match(worker, /requestedBed&&!canReadOwnerData\(user\).*forbidden/);
  assert.match(worker, /transferLineage\|\|qaScope\.requested/);
  assert.match(worker, /:success\(data\)/);
});

test('Gateway reads only corpid-scoped canonical sessions and entries_json anchors', () => {
  const load = functionBlock('ownerHistoryTransferLineageForRequest');
  const normalize = functionBlock('ownerHistoryTransferLineageArchiveEntries');
  assert.match(load, /SELECT \* FROM sessions WHERE corpid=\?/);
  assert.match(load, /bind\(user\.corpid\)/);
  assert.match(normalize, /extractEmployeeEntryAnchorsFromSession\(session\)/);
  assert.doesNotMatch(load + normalize, /room IN|tenant_card_id|card_id|provider_phone|phone_99099|localStorage|cache/i);
});

test('client can filter by lineage id but cannot submit anchor refs', () => {
  const load = functionBlock('ownerHistoryTransferLineageForRequest');
  assert.match(load, /transfer_lineage_id/);
  assert.doesNotMatch(load, /source_context_anchor_refs|previous_transfer_anchor_id|transfer_anchor_id.*searchParams/);
});

test('session void state and additive correction anchors feed the pure projection', () => {
  const normalize = functionBlock('ownerHistoryTransferLineageArchiveEntries');
  assert.match(normalize, /canonicalOwnerHistoryArchiveState\(session\)/);
  assert.match(normalize, /parseOwnerCorrectionAnchorText/);
  assert.match(normalize, /replacement_transfer_anchor/);
  assert.match(normalize, /original_event_id/);
  assert.match(worker, /projectOwnerHistoryTransferLineage/);
});

test('lineage integration is read-only and does not touch Finance or write gates', () => {
  const load = functionBlock('ownerHistoryTransferLineageForRequest');
  assert.doesNotMatch(load, /INSERT|UPDATE|DELETE|batch\(|prepareCanonicalTransferArchiveWrite|finance|arrear/i);
  assert.doesNotMatch(load, /BED_TRANSFER_WRITE_ENABLED/);
});

test('no prohibited bed fixture or UI change is introduced by integration tests', async () => {
  const thisTest = await readFile(new URL('./owner-history-bed-transfer-lineage.spec.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(thisTest, /\b334\b/);
  assert.doesNotMatch(worker, /room IN \(/i);
});

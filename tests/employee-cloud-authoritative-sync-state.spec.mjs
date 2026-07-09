import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = "deploy-worker/src/index.js";
const employeePath = "deploy-worker/public/employee-v3.html";

function functionBlock(source, signature, nextSignature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `${signature} not found`);
  const end = source.indexOf(nextSignature, start);
  assert.ok(end > start, `${nextSignature} not found after ${signature}`);
  return source.slice(start, end);
}

function finalFunctionBlock(source, signature, nextSignature) {
  const start = source.lastIndexOf(signature);
  assert.ok(start >= 0, `${signature} not found`);
  const end = source.indexOf(nextSignature, start);
  assert.ok(end > start, `${nextSignature} not found after ${signature}`);
  return source.slice(start, end);
}

test("employee sync-state endpoint is read-only and cloud-authoritative", async () => {
  const worker = await readFile(workerPath, "utf8");
  const handler = functionBlock(
    worker,
    "async function handleEmployeeEntrySyncState",
    "__name(handleEmployeeEntrySyncState"
  );
  const missingHelper = functionBlock(
    worker,
    "function employeeEntryCloudSyncMissing",
    "__name(employeeEntryCloudSyncMissing"
  );

  assert.match(worker, /path==="\/api\/employee\/entry\/sync-state"&&request\.method==="POST"/);
  assert.match(handler, /production_write:false/);
  assert.match(handler, /no_write:true/);
  assert.match(handler, /gateway:"canonical_sync_state_gateway"/);
  assert.doesNotMatch(handler, /\.run\(/);
  assert.doesNotMatch(handler, /empInsertDynamic\(/);
  assert.match(handler, /SELECT id, anchor_id/);
  assert.match(handler, /extractEmployeeEntryAnchorsFromSession\(session\)/);
  assert.match(handler, /status:"cloud_confirmed"/);
  assert.match(handler, /sync_status:"SYNCED"/);
  assert.match(handler, /archive_state:"exists_active"/);
  assert.match(handler, /cloud_match:true/);
  assert.match(handler, /matched_by:"canonical_fingerprint_or_event_id"/);
  assert.match(handler, /status:"cloud_mismatch"/);
  assert.match(handler, /sync_status:"CLOUD_MISMATCH"/);
  assert.match(handler, /session_status:"cloud_missing"/);
  assert.match(handler, /cloud_deleted/);
  assert.match(handler, /cloud_voided/);
  assert.match(handler, /cloud_corrected/);
  assert.match(handler, /allowed_next_action:"owner_review_required"/);
  assert.match(missingHelper, /allowed_next_action:"server_validation_required"/);
});

test("employee UI requires cloud confirmation before showing Synced", async () => {
  const html = await readFile(employeePath, "utf8");
  const stateBlock = functionBlock(
    html,
    "function employeeSessionRecordState(entry,index)",
    "function renderSessionRecordValidationDetails(result,index)"
  );
  const uploadedBlock = functionBlock(
    html,
    "function entrySessionUploaded()",
    "function updateEntrySessionActionState()"
  );

  assert.match(html, /function employeeEntryCloudConfirmed\(entry\)/);
  assert.match(uploadedBlock, /state\.drafts\.every\(employeeEntryCloudConfirmed\)/);
  assert.match(stateBlock, /cloudStatus==='CLOUD_CONFIRMED'/);
  assert.match(stateBlock, /label:'Synced'/);
  assert.match(stateBlock, /cloudStatus==='CLOUD_MISSING'/);
  assert.match(stateBlock, /label:'Cloud Missing'/);
  assert.match(stateBlock, /cloudStatus==='CLOUD_MISMATCH'/);
  assert.match(stateBlock, /label:'Cloud Mismatch \/ Needs Review'/);
  assert.match(stateBlock, /CLOUD_DELETED/);
  assert.match(stateBlock, /CLOUD_VOIDED/);
  assert.match(stateBlock, /CLOUD_CORRECTED/);
  assert.match(stateBlock, /Cloud Voided/);
  assert.match(stateBlock, /label:'Needs Reconciliation'/);
});

test("page load and upload reconcile local synced cache against cloud state", async () => {
  const html = await readFile(employeePath, "utf8");
  const applyBlock = functionBlock(
    html,
    "function applyEmployeeUser(user)",
    "async function checkEmployeeSessionLegacyDisabled()"
  );
  const uploadBlock = finalFunctionBlock(
    html,
    "async function commitSessionAndExport()",
    "function normalizeEmployeeView"
  );

  assert.match(applyBlock, /employeeMarkSyncedDraftsCloudChecking\(\)/);
  assert.match(applyBlock, /reconcileEmployeeCloudSyncState\(\{silent:true\}\)/);
  assert.match(uploadBlock, /await reconcileEmployeeCloudSyncState\(\{silent:true\}\)/);
  assert.match(uploadBlock, /if\(entrySessionUploaded\(\)\)/);
  assert.match(uploadBlock, /if\(currentSessionHasCloudReviewBlock\(\)\)/);
  assert.match(uploadBlock, /Owner review is required before upload/);
  assert.match(uploadBlock, /employeeMarkDraftsAwaitingCloudConfirmation\(uploadList,uploadSessionId\)/);
  assert.match(uploadBlock, /const cloudConfirmed=entrySessionUploaded\(\)/);
  assert.match(uploadBlock, /if\(!cloudConfirmed\)/);
  assert.doesNotMatch(uploadBlock, /cloud_sync_status:'CLOUD_CONFIRMED'/);
});

test("cloud missing does not block upload solely because local cache said synced", async () => {
  const html = await readFile(employeePath, "utf8");
  const blocker = functionBlock(
    html,
    "function currentSessionHasCloudReviewBlock()",
    "updateEntrySessionActionState=function()"
  );
  const renderStart = html.lastIndexOf("renderSessionPreview=function(){");
  assert.ok(renderStart >= 0, "final renderSessionPreview override must exist");
  const renderBlock = html.slice(renderStart, html.indexOf("renderSummary=function(){", renderStart));

  assert.doesNotMatch(blocker, /CLOUD_MISSING/);
  assert.match(blocker, /CLOUD_MISMATCH/);
  assert.match(blocker, /CLOUD_DELETED/);
  assert.match(blocker, /CLOUD_CORRECTED/);
  assert.match(renderBlock, /const failed=\['VALIDATION_FAILED','STALE'\]\.includes\(recordState\.key\)/);
});

test("archive mutation policy documents void correction reversal as preferred production mutation", async () => {
  const doc = await readFile("docs/CANONICAL_SYNC_STATE_GATEWAY_AND_ARCHIVE_MUTATION_POLICY_V1.md", "utf8");
  const constitution = await readFile("docs/SOURCE_OF_TRUTH_CONSTITUTION_AND_OCTOPUS_ARCHITECTURE_LOCK_V1.md", "utf8");
  assert.match(doc, /CANONICAL_SYNC_STATE_GATEWAY_AND_ARCHIVE_MUTATION_POLICY_V1/);
  assert.match(doc, /Preferred production mutation:\s*\n\s*`VOID_CORRECTION_REVERSAL`/);
  assert.match(doc, /Hard delete:/);
  assert.match(doc, /CLOUD_MISSING/);
  assert.match(doc, /CLOUD_DELETED/);
  assert.match(doc, /void/);
  assert.match(doc, /correction anchor/);
  assert.match(doc, /reversal anchor/);
  assert.match(doc, /adjustment anchor/);
  assert.match(constitution, /\| Sync State Gateway \| L1 archive \+ correction\/void\/delete state \| none \| decide Synced \/ Cloud Missing \/ Cloud Deleted \/ Cloud Voided \/ Cloud Corrected \/ Cloud Mismatch \/ Needs Review \| PASS \|/);
  assert.match(constitution, /\| synced status \| Sync State Gateway cloud confirmation \| Canonical Sync State Gateway implemented\/tested \| localStorage flag \| PASS \|/);
});

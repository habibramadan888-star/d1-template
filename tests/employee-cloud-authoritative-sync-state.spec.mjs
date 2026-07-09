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

  assert.match(worker, /path==="\/api\/employee\/entry\/sync-state"&&request\.method==="POST"/);
  assert.match(handler, /production_write:false/);
  assert.match(handler, /no_write:true/);
  assert.doesNotMatch(handler, /\.run\(/);
  assert.doesNotMatch(handler, /empInsertDynamic\(/);
  assert.match(handler, /SELECT id, anchor_id/);
  assert.match(handler, /extractEmployeeEntryAnchorsFromSession\(session\)/);
  assert.match(handler, /status:"cloud_confirmed"/);
  assert.match(handler, /status:"cloud_mismatch"/);
  assert.match(handler, /session_status:"cloud_missing"/);
  assert.match(handler, /cloud_deleted/);
  assert.match(handler, /cloud_corrected/);
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
  assert.match(stateBlock, /CLOUD_CORRECTED/);
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
  assert.match(uploadBlock, /cloud_sync_status:'CLOUD_CONFIRMED'/);
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


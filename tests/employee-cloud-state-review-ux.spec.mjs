import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";

function functionBlock(source, signature, nextSignature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `${signature} not found`);
  const end = source.indexOf(nextSignature, start);
  assert.ok(end > start, `${nextSignature} not found after ${signature}`);
  return source.slice(start, end);
}

function finalRenderBlock(source) {
  const start = source.lastIndexOf("renderSessionPreview=function(){");
  assert.ok(start >= 0, "final renderSessionPreview override must exist");
  const end = source.indexOf("renderSummary=function(){", start);
  assert.ok(end > start, "renderSummary must follow final renderSessionPreview");
  return source.slice(start, end);
}

test("cloud deleted voided corrected states show clear owner-review explanations", async () => {
  const html = await readFile(employeePath, "utf8");
  const explanation = functionBlock(
    html,
    "function employeeCloudReviewExplanation(recordState)",
    "function renderEmployeeCloudReviewPanel"
  );
  const panel = functionBlock(
    html,
    "function renderEmployeeCloudReviewPanel(entry,index,recordState)",
    "function employeeRequestOwnerReuploadApproval"
  );

  assert.match(explanation, /Cloud record was deleted by owner/);
  assert.match(explanation, /Cloud record was voided by owner/);
  assert.match(explanation, /Cloud record was corrected by owner/);
  assert.match(explanation, /Owner review is required before re-upload/);
  assert.match(explanation, /云端记录已被老板删除/);
  assert.match(explanation, /云端记录已被老板作废/);
  assert.match(explanation, /云端记录已被老板更正/);
  assert.match(panel, /Cloud state changed \/ 云端状态已变化/);
  assert.match(panel, /Remove Local Copy/);
  assert.match(panel, /Request Owner Re-upload Approval/);
  assert.match(panel, /View Cloud State/);
  assert.match(panel, /Copy Diagnostic JSON/);
});

test("cloud review actions are local-only and do not call upload or cloud write endpoints", async () => {
  const html = await readFile(employeePath, "utf8");
  const requestApproval = functionBlock(
    html,
    "function employeeRequestOwnerReuploadApproval(entryId)",
    "function employeeViewCloudState(index)"
  );
  const render = finalRenderBlock(html);

  assert.match(requestApproval, /confirm\(/);
  assert.match(requestApproval, /Owner\/admin confirmation is required/);
  assert.match(requestApproval, /owner_reupload_approval_requested=true/);
  assert.match(requestApproval, /No cloud write was made/);
  assert.doesNotMatch(requestApproval, /apiFetch|\/api\/employee\/entry|commitSessionAndExport/);
  assert.match(render, /data-remove-cloud-local/);
  assert.match(render, /removeCurrentSessionRecord\(btn\.dataset\.removeCloudLocal,'Local cloud-state copy removed\. No cloud data was changed\.'\)/);
  assert.match(render, /data-request-owner-reupload/);
  assert.match(render, /employeeRequestOwnerReuploadApproval/);
});

test("cloud review diagnostic JSON includes required sync-state fields", async () => {
  const html = await readFile(employeePath, "utf8");
  const diagnostic = functionBlock(
    html,
    "function employeeCloudReviewDiagnostic(entry,index,recordState=employeeSessionRecordState(entry,index))",
    "async function employeeCopyDiagnosticJson(index)"
  );
  const reconcile = functionBlock(
    html,
    "async function reconcileEmployeeCloudSyncState",
    "function currentSessionId()"
  );

  for (const field of [
    "local_session_id",
    "local_event_id",
    "local_event_type",
    "local_amount",
    "cloud_state",
    "archive_state",
    "matched_by",
    "allowed_next_action",
    "reason"
  ]) {
    assert.match(diagnostic, new RegExp(`${field}:`));
  }
  assert.match(reconcile, /entry\.cloud_archive_state=result\?\.archive_state/);
  assert.match(reconcile, /entry\.cloud_matched_by=result\?\.matched_by/);
  assert.match(reconcile, /entry\.cloud_allowed_next_action=result\?\.allowed_next_action/);
});

test("normal upload remains blocked for cloud review states without owner policy path", async () => {
  const html = await readFile(employeePath, "utf8");
  const blocker = functionBlock(
    html,
    "function currentSessionHasCloudReviewBlock()",
    "updateEntrySessionActionState=function()"
  );
  const upload = functionBlock(
    html,
    "async function commitSessionAndExport()",
    "function normalizeEmployeeView"
  );

  assert.match(blocker, /CLOUD_DELETED/);
  assert.match(blocker, /CLOUD_VOIDED/);
  assert.match(blocker, /CLOUD_CORRECTED/);
  assert.match(upload, /if\(currentSessionHasCloudReviewBlock\(\)\)/);
  assert.match(upload, /Owner review is required before upload/);
});

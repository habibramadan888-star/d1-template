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

function finalFunctionBlock(source, signature, nextSignature) {
  const start = source.lastIndexOf(signature);
  assert.ok(start >= 0, `${signature} not found`);
  const end = source.indexOf(nextSignature, start);
  assert.ok(end > start, `${nextSignature} not found after ${signature}`);
  return source.slice(start, end);
}

test("synced records cannot render stale validation errors", async () => {
  const html = await readFile(employeePath, "utf8");
  const block = functionBlock(
    html,
    "function employeeRecordValidationError(entry,index)",
    "function employeeEntryArrearsRef(entry)"
  );
  const syncedGuard = block.indexOf("if(entry?.sync_status==='SYNCED'||entry?.upload_status==='SYNCED')return null");
  const validationError = block.indexOf("if(entry?.upload_validation_error)");
  const failedIndexFallback = block.indexOf("state.uploadValidationFailedIndex");

  assert.ok(syncedGuard >= 0, "synced guard must exist");
  assert.ok(validationError > syncedGuard, "synced guard must run before record validation error");
  assert.ok(failedIndexFallback > syncedGuard, "synced guard must run before stale session-level fallback");
});

test("full upload success clears stale validation state and waits for cloud confirmation", async () => {
  const html = await readFile(employeePath, "utf8");
  const uploadBlock = finalFunctionBlock(
    html,
    "async function commitSessionAndExport()",
    "function normalizeEmployeeView"
  );
  const helperBlock = functionBlock(
    html,
    "function employeeMarkDraftsAwaitingCloudConfirmation(entries,sessionId)",
    "function employeeMarkSyncedDraftsCloudChecking()"
  );
  const successStart = uploadBlock.indexOf("state.drafts=employeeMarkDraftsAwaitingCloudConfirmation");
  const completeStart = uploadBlock.indexOf("setUploadPhase('Upload complete','Done')");
  assert.ok(successStart >= 0 && completeStart > successStart, "full success reconciliation must precede Done state");
  const successBlock = uploadBlock.slice(successStart, completeStart);

  assert.match(html, /function employeeMarkDraftsAwaitingCloudConfirmation/);
  assert.match(helperBlock, /sync_status:'SYNCED'/);
  assert.match(helperBlock, /upload_status:'CHECKING_CLOUD'/);
  assert.match(helperBlock, /cloud_sync_status:'CHECKING_CLOUD'/);
  assert.match(helperBlock, /upload_validation_error:null/);
  assert.match(helperBlock, /upload_validation_error_code:''/);
  assert.match(helperBlock, /sync_error:''/);
  assert.match(successBlock, /state\.uploadValidationFailedIndex=null/);
  assert.match(successBlock, /state\.uploadValidationFailedMessage=''/);
  assert.match(successBlock, /await reconcileEmployeeCloudSyncState\(\{silent:true\}\)/);
  assert.match(successBlock, /const cloudConfirmed=entrySessionUploaded\(\)/);
  assert.match(successBlock, /if\(!cloudConfirmed\)/);
  assert.match(successBlock, /\$\('validationBox'\)\)\$\('validationBox'\)\.innerHTML=''/);
});

test("session success cannot coexist with active record-level failed state", async () => {
  const html = await readFile(employeePath, "utf8");
  const stateBlock = functionBlock(
    html,
    "function employeeSessionRecordState(entry,index)",
    "function renderSessionRecordValidationDetails(result,index)"
  );
  const actionBlock = functionBlock(
    html,
    "updateEntrySessionActionState=function()",
    "function refreshSessionViews()"
  );

  assert.match(stateBlock, /employeeRecordValidationError\(entry,index\)/);
  assert.match(stateBlock, /if\(entry\?\.sync_status==='SYNCED'\)\{/);
  assert.match(stateBlock, /cloudStatus==='CLOUD_CONFIRMED'/);
  assert.match(stateBlock, /return \{key:'SYNCED',label:'Synced'/);
  assert.match(actionBlock, /const uploaded=entrySessionUploaded\(\)/);
  assert.match(actionBlock, /if\(uploaded&&hasRows\)/);
  assert.match(actionBlock, /renderEmployeeButtonLabel\('Done','Upload Complete'\)/);
  assert.match(actionBlock, /whats\.disabled=!uploaded\|\|blocked/);
});

test("synced arrears payment is not revalidated against current open arrears", async () => {
  const html = await readFile(employeePath, "utf8");
  const stateBlock = functionBlock(
    html,
    "function employeeSessionRecordState(entry,index)",
    "function renderSessionRecordValidationDetails(result,index)"
  );
  const syncCheck = stateBlock.indexOf("if(entry?.sync_status==='SYNCED')");
  const staleCheck = stateBlock.indexOf("if(entry?.type==='AP')");
  const staleCode = stateBlock.indexOf("ARREARS_REF_STALE_REFRESH_REQUIRED", staleCheck);

  assert.ok(syncCheck >= 0, "synced cloud archive state branch must exist");
  assert.ok(staleCheck > syncCheck, "AP stale open-arrears check must only run after synced branch");
  assert.ok(staleCode > staleCheck, "unsynced AP stale detection must remain present");
  assert.match(stateBlock, /cloudStatus==='CLOUD_CONFIRMED'\)return \{key:'SYNCED',label:'Synced'/);
  assert.match(stateBlock, /if\(entry\?\.type==='AP'\)/);
  assert.match(stateBlock, /state\.arrearsTasksLoaded&&!openRefs\.has\(ref\)/);
});

test("server dry-run required renders as pending, not validation failed", async () => {
  const html = await readFile(employeePath, "utf8");
  const stateBlock = functionBlock(
    html,
    "function employeeSessionRecordState(entry,index)",
    "function renderSessionRecordValidationDetails(result,index)"
  );
  const suggestedBlock = functionBlock(
    html,
    "function employeeUploadSuggestedActionParts(result)",
    "function renderEmployeeUploadDryRunError(result)"
  );
  const finalRenderStart = html.lastIndexOf("renderSessionPreview=function(){");
  assert.ok(finalRenderStart >= 0, "final renderSessionPreview override must exist");
  const finalRender = html.slice(finalRenderStart, html.indexOf("renderSummary=function(){", finalRenderStart));

  assert.match(stateBlock, /validation\.error_code==='SERVER_DRY_RUN_REQUIRED'/);
  assert.match(stateBlock, /key:'PENDING_VALIDATION'/);
  assert.match(stateBlock, /label:'Ready for Server Validation'/);
  assert.match(stateBlock, /className:'pending'/);
  assert.match(stateBlock, /key:stale\?'STALE':'VALIDATION_FAILED'/);
  assert.match(html, /\.status-pill\.pending/);
  assert.match(suggestedBlock, /Click Upload Session to run server validation before cloud upload\./);
  assert.match(finalRender, /const failed=\['VALIDATION_FAILED','STALE'\]\.includes\(recordState\.key\)/);
  assert.match(finalRender, /const remove=\['VALIDATION_FAILED','STALE'\]\.includes\(recordState\.key\)/);
  assert.doesNotMatch(finalRender, /recordState\.key!=='SYNCED'\?`<button class="mini-btn danger" data-remove-session-record/);
});

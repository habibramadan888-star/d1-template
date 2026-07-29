import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = "deploy-worker/src/index.js";
const employeePath = "deploy-worker/public/employee-v3.html";

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const marker = `__name(${name},`;
  const end = source.indexOf(marker, start);
  assert.ok(end > start, `${name} block must end with __name marker`);
  return source.slice(start, end);
}

test("DiagnosticTrace failure schema contains required system fields", async () => {
  const worker = await readFile(workerPath, "utf8");
  const failureBlock = functionBlock(worker, "employeeEntryValidationFailure");
  const traceStepBlock = functionBlock(worker, "employeeEntryValidationTraceStep");

  for (const field of [
    "trace_id",
    "action",
    "source",
    "stage",
    "event_index",
    "event_type",
    "record_id",
    "error_code",
    "message_en",
    "message_zh",
    "missing_fields",
    "invalid_fields",
    "suggested_action_en",
    "suggested_action_zh",
    "last_successful_stage",
    "payload_preview",
    "anchor_preview",
    "validation_trace",
    "asset_version",
    "worker_version",
    "commit_hash"
  ]) {
    assert.match(failureBlock, new RegExp(`${field}:`), `${field} must be in failure schema`);
  }

  assert.match(traceStepBlock, /function_name:/);
  assert.match(traceStepBlock, /duration_ms:/);
  assert.match(traceStepBlock, /message_en:/);
  assert.match(traceStepBlock, /message_zh:/);
});

test("DiagnosticTrace success schema contains trace envelope and full stage path", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");
  const successTraceBlock = functionBlock(worker, "employeeEntryValidationSuccessTrace");

  for (const field of [
    "trace_id",
    "action",
    "source",
    "stage:\"final_preflight\"",
    "message_en:\"Upload validation passed.\"",
    "message_zh:\"上传前校验通过。\"",
    "suggested_action_en:\"Continue upload.\"",
    "payload_preview",
    "asset_version",
    "worker_version",
    "commit_hash"
  ]) {
    assert.match(validateBlock, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\./g, "\\.")), `${field} must be in success schema`);
  }

  for (const stage of [
    "payload_parse",
    "event_dispatch",
    "rent_event_validation",
    "anchor_validation",
    "session_summary_build",
    "export_text_build",
    "structured_anchor_block_build",
    "owner_decoder_compat",
    "final_preflight"
  ]) {
    assert.match(successTraceBlock, new RegExp(stage), `${stage} must be represented`);
  }
});

test("frontend diagnostic report renders trace id, source, raw debug, and safe redaction", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /Diagnostic Report/);
  assert.match(html, /Trace ID<br><small>\\u8bca\\u65ad ID<\/small>/);
  assert.match(html, /Action<br><small>\\u52a8\\u4f5c<\/small>/);
  assert.match(html, /Source<br><small>\\u6765\\u6e90<\/small>/);
  assert.match(html, /Raw Validation Debug/);
  assert.match(html, /employeeUploadRawDebugObject/);
  assert.match(html, /password\|token\|cookie\|set-cookie\|authorization\|secret/i);
});

test("frontend maps upload path sources to server dry-run authority", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /source:'server_dry_run_validation'/);
  assert.match(html, /source:'server_upload'/);
  assert.match(html, /source:'network_error'/);
  assert.match(html, /source:'no_records_to_upload'/);
  assert.match(html, /upload_path:'btnExportSession -> commitSessionAndExport -> \/api\/employee\/entry\/validate -> \/api\/employee\/entry'/);
  assert.doesNotMatch(html, /source:'client_local_validation'/);
});

test("frontend upload path does not run local batch gate before server dry-run", async () => {
  const html = await readFile(employeePath, "utf8");
  const commitStart = html.lastIndexOf("async function commitSessionAndExport");
  assert.ok(commitStart >= 0, "commitSessionAndExport must exist");
  const commitBlock = html.slice(commitStart);
  const dryRunStart = commitBlock.indexOf("await validateEmployeeUploadDryRun");
  const uploadStart = commitBlock.indexOf("apiFetch('/api/employee/entry'", dryRunStart);
  assert.ok(dryRunStart >= 0 && uploadStart > dryRunStart, "server dry-run must precede real upload");

  assert.doesNotMatch(commitBlock, /const validation=validateUploadAnchorBatch\(uploadList\)/);
  assert.doesNotMatch(commitBlock, /if\(!validation\.ok\)/);
  assert.doesNotMatch(commitBlock, /CLIENT_ANCHOR_BATCH_VALIDATION_FAILED/);

  const worker = await readFile(workerPath, "utf8");
  const failureBlock = functionBlock(worker, "employeeEntryValidationFailure");
  assert.doesNotMatch(failureBlock, /UPLOAD_VALIDATION_FAILED/);
  assert.match(failureBlock, /validation_trace:/);
});

test("validation failed state cannot render synced or upload-complete success", async () => {
  const html = await readFile(employeePath, "utf8");
  const dryRunFailStart = html.indexOf("if(dryRunFailed.length)");
  const uploadStart = html.indexOf("showStatus(`Uploading confirmed session", dryRunFailStart);
  assert.ok(dryRunFailStart >= 0 && uploadStart > dryRunFailStart, "dry-run failure branch must precede upload");
  const dryRunBranch = html.slice(dryRunFailStart, uploadStart);

  assert.match(dryRunBranch, /upload_status=firstDryRunFailure\.result\?\.error_code===/);
  assert.match(dryRunBranch, /renderEmployeeUploadDryRunError\(firstDryRunFailure\.result\)/);
  assert.doesNotMatch(dryRunBranch, /SYNCED/);
  assert.doesNotMatch(dryRunBranch, /Upload complete/);
  assert.doesNotMatch(dryRunBranch, /Session uploaded to cloud/);
});

test("employee asset disables stale cache and exposes diagnostic version", async () => {
  const worker = await readFile(workerPath, "utf8");
  const html = await readFile(employeePath, "utf8");

  assert.match(worker, /HOMELINK_DIAGNOSTIC_ASSET_VERSION="upload-diagnostic-trace-20260707-001"/);
  assert.match(worker, /function employeeEntryDiagnosticAssetInfo\(body=\{\}\)/);
  assert.match(worker, /asset_status:stale\?"STALE_FRONTEND_ASSET":"ASSET_VERSION_OK"/);
  assert.match(worker, /frontend_asset_version:frontendAssetVersion\|\|null/);
  assert.match(worker, /expected_frontend_asset_version:expected/);
  assert.match(worker, /Cache-Control", "no-store, no-cache, max-age=0, must-revalidate"/);
  assert.match(worker, /X-Employee-Asset-Version", HOMELINK_DIAGNOSTIC_ASSET_VERSION/);
  assert.match(html, /employee_asset_version:'upload-diagnostic-trace-20260707-001'/);
  assert.match(html, /frontend_asset_version:'upload-diagnostic-trace-20260707-001'/);
  assert.match(html, /STALE_FRONTEND_ASSET/);
  assert.match(html, /window\.__EMPLOYEE_ASSET_DIAGNOSTIC/);
});

test("frontend validation failed records expose copyable diagnostic JSON", async () => {
  const html = await readFile(employeePath, "utf8");
  const finalRenderStart = html.lastIndexOf("renderSessionPreview=function(){");
  assert.ok(finalRenderStart >= 0, "final renderSessionPreview override must exist");
  const finalRender = html.slice(finalRenderStart, html.indexOf("renderSummary=function(){", finalRenderStart));

  assert.match(html, /function employeeDiagnosticObjectForRecord\(index\)/);
  assert.match(html, /async function employeeCopyDiagnosticJson\(index\)/);
  assert.match(html, /function employeeBindDiagnosticCopyButtons\(\)/);
  assert.match(html, /data-copy-diagnostic-json/);
  assert.match(html, /Copy Diagnostic JSON/);
  assert.match(html, /Diagnostic JSON copied/);
  assert.match(html, /Diagnostic missing/);
  assert.match(finalRender, /employeeBindDiagnosticCopyButtons\(\)/);
});

test("frontend generic UPLOAD_VALIDATION_FAILED is converted to server dry-run generic diagnostic", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /function employeeIsGenericTraceMissing\(data\)/);
  assert.match(html, /code==='UPLOAD_VALIDATION_FAILED'/);
  assert.match(html, /function employeeDiagnosticMissingTrace\(index,eventType/);
  assert.match(html, /error_code:'SERVER_DRY_RUN_GENERIC_ERROR'/);
  assert.match(html, /missing_fields:\['source','stage','validation_trace'\]/);
  assert.match(html, /stage:'diagnostic_trace_guard'/);
  assert.match(html, /source:'server_dry_run_validation'/);
  assert.doesNotMatch(html, /DIAGNOSTIC_TRACE_MISSING/);
  assert.doesNotMatch(html, /upload_validation_error_code=firstDryRunFailure\.result\?\.error_code\|\|'UPLOAD_VALIDATION_FAILED'/);
  assert.doesNotMatch(html, /state\.uploadValidationFailedMessage=`\$\{firstDryRunFailure\.result\?\.error_code\|\|'UPLOAD_VALIDATION_FAILED'\}/);
});

test("dry-run request carries frontend diagnostic metadata and server echoes asset state", async () => {
  const html = await readFile(employeePath, "utf8");
  const worker = await readFile(workerPath, "utf8");

  assert.match(html, /function employeeDiagnosticAssetMeta\(\)/);
  assert.match(html, /diagnostic:employeeDiagnosticAssetMeta\(\)/);
  assert.match(html, /frontend_asset_version:r\.frontend_asset_version/);
  assert.match(html, /worker_version:r\.worker_version/);
  assert.match(html, /commit_hash:r\.commit_hash/);
  assert.match(html, /built_at:r\.built_at/);
  assert.match(worker, /const assetInfo=employeeEntryDiagnosticAssetInfo\(body\)/);
  assert.match(worker, /result=\{\.\.\.result,\.\.\.assetInfo\}/);
  assert.match(worker, /\.\.\.assetInfo,\s+event_index:eventIndex/s);
});

test("rent 411 diagnostic fixture reaches exact short-paid validator before final preflight", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");
  const successTraceBlock = functionBlock(worker, "employeeEntryValidationSuccessTrace");

  assert.match(validateBlock, /const type=cleanText\(entry\.type\|\|entry\.reason_code\|\|"R",12\)\.toUpperCase\(\)/);
  assert.match(validateBlock, /validateEmployeeEntryUploadEventFields\(type,entry,normalized,eventIndex,anchorPreview\)/);
  assert.match(validateBlock, /employeeEntryValidationSuccessTrace\(type,eventIndex,normalized\.event_type\|\|entryAnchorEventType\(type\)\)/);
  assert.match(successTraceBlock, /R:\["rent_event_validation","validateRentUploadFields"\]/);
  assert.match(validateBlock, /employeeEntryValidationFailure\("rent_validation","RENT_PERIOD_INVALID"/);
  assert.match(validateBlock, /employeeEntryValidationFailure\("rent_short_paid","SHORT_PAID_DUE_DATE_REQUIRED"/);
  assert.match(validateBlock, /missing_fields:\["arrear_promise_date"\]/);
  assert.match(validateBlock, /employeeEntryValidationFailure\("rent_short_paid","ARREAR_REASON_REQUIRED"/);
});

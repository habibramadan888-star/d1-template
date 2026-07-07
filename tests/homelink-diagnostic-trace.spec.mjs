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

test("frontend maps upload path sources for local, dry-run, and real upload failures", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /source:'client_local_validation'/);
  assert.match(html, /source:'server_dry_run_validation'/);
  assert.match(html, /source:'server_upload'/);
  assert.match(html, /upload_path:'btnExportSession -> commitSessionAndExport -> validateUploadAnchorBatch -> \/api\/employee\/entry\/validate -> \/api\/employee\/entry'/);
});

test("generic upload validation failure without diagnostic stage is forbidden", async () => {
  const html = await readFile(employeePath, "utf8");
  const commitStart = html.lastIndexOf("async function commitSessionAndExport");
  assert.ok(commitStart >= 0, "commitSessionAndExport must exist");
  const commitBlock = html.slice(commitStart);
  const localFailStart = commitBlock.indexOf("if(!validation.ok)");
  const dryRunStart = commitBlock.indexOf("const canonicalEntries=uploadList.map", localFailStart);
  assert.ok(localFailStart >= 0 && dryRunStart > localFailStart, "local validation branch must exist");
  const localBranch = commitBlock.slice(localFailStart, dryRunStart);

  assert.match(localBranch, /CLIENT_ANCHOR_BATCH_VALIDATION_FAILED/);
  assert.match(localBranch, /stage:'client_anchor_batch_validation'/);
  assert.doesNotMatch(localBranch, /error_code:'UPLOAD_VALIDATION_FAILED'/);

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
  assert.match(worker, /Cache-Control", "no-store, no-cache, max-age=0, must-revalidate"/);
  assert.match(worker, /X-Employee-Asset-Version", HOMELINK_DIAGNOSTIC_ASSET_VERSION/);
  assert.match(html, /employee_asset_version:'upload-diagnostic-trace-20260707-001'/);
  assert.match(html, /window\.__EMPLOYEE_ASSET_DIAGNOSTIC/);
});

test("rent 145 diagnostic path reaches exact rent validator before final preflight", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");
  const successTraceBlock = functionBlock(worker, "employeeEntryValidationSuccessTrace");

  assert.match(validateBlock, /const type=cleanText\(entry\.type\|\|entry\.reason_code\|\|"R",12\)\.toUpperCase\(\)/);
  assert.match(validateBlock, /validateEmployeeEntryUploadEventFields\(type,entry,normalized,eventIndex,anchorPreview\)/);
  assert.match(validateBlock, /employeeEntryValidationSuccessTrace\(type,eventIndex,normalized\.event_type\|\|entryAnchorEventType\(type\)\)/);
  assert.match(successTraceBlock, /R:\["rent_event_validation","validateRentUploadFields"\]/);
  assert.match(validateBlock, /employeeEntryValidationFailure\("rent_validation","PERIOD_DATES_REQUIRED"/);
  assert.match(validateBlock, /employeeEntryValidationFailure\("rent_validation","PERIOD_END_INVALID_FOR_1M"/);
});

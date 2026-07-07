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

test("dry-run validation failures always include stage and validation_trace", async () => {
  const worker = await readFile(workerPath, "utf8");
  const failureBlock = functionBlock(worker, "employeeEntryValidationFailure");
  const traceBlock = functionBlock(worker, "employeeEntryValidationTraceStep");
  const stageMap = functionBlock(worker, "employeeEntryValidationFunctionForStage");

  assert.match(failureBlock, /validation_trace:Array\.isArray\(extra\.validation_trace\)/);
  assert.match(failureBlock, /employeeEntryValidationTraceStep\(stage,false/);
  assert.match(traceBlock, /stage,/);
  assert.match(traceBlock, /function:extra\.function_name/);
  assert.match(traceBlock, /error_code:extra\.error_code/);
  assert.match(traceBlock, /missing_fields:Array\.isArray\(extra\.missing_fields\)/);
  assert.match(traceBlock, /invalid_fields:Array\.isArray\(extra\.invalid_fields\)/);
  assert.match(stageMap, /rent_event_validation:"validateRentUploadFields"/);
  assert.match(stageMap, /rent_validation:"validateEmployeeEntryUploadPayload"/);
  assert.match(stageMap, /export_text_build:"employeeEntryExportTextWithAnchors"/);
  assert.match(stageMap, /owner_decoder_compat:"parseEmployeeEntryAnchorJson"/);
});

test("rent validation failures return exact stage and exact error code", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");

  assert.match(validateBlock, /employeeEntryValidationFailure\("rent_validation","PERIOD_DATES_REQUIRED"/);
  assert.match(validateBlock, /missing_fields:\["period_start","period_end"\]/);
  assert.match(validateBlock, /employeeEntryValidationFailure\("rent_validation","PERIOD_END_INVALID_FOR_1M"/);
  assert.match(validateBlock, /invalid_fields:\["period_end"\]/);
  assert.match(validateBlock, /employeeEntryValidationFailure\("rent_validation","RENT_CONFIG_MISSING"/);
  assert.match(validateBlock, /missing_fields:\["rent_config"\]/);
  assert.match(validateBlock, /employeeEntryValidationFailure\("rent_short_paid","ARREAR_PROMISE_DATE_REQUIRED"/);
  assert.match(validateBlock, /employeeEntryValidationFailure\("rent_short_paid","ARREAR_REASON_REQUIRED"/);
});

test("dry-run validate route returns structured trace on exceptions and performs no writes", async () => {
  const worker = await readFile(workerPath, "utf8");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");
  const validateHandler = functionBlock(worker, "handleEmployeeEntryValidate");

  assert.doesNotMatch(validateBlock, /\.run\(/, "dry-run validation must not run D1 writes");
  assert.doesNotMatch(validateBlock, /empInsertDynamic\(/, "dry-run validation must not insert rows");
  assert.doesNotMatch(validateBlock, /audit\(/, "dry-run validation must not write audit logs");
  assert.doesNotMatch(validateHandler, /\.run\(/, "dry-run handler must not run D1 writes");
  assert.match(validateHandler, /employeeEntryValidationFailure\("validate_exception","VALIDATION_EXCEPTION"/);
  assert.match(validateHandler, /Upload validation threw an exception before cloud write\./);
});

test("successful dry-run response exposes a validation trace", async () => {
  const worker = await readFile(workerPath, "utf8");
  const successTrace = functionBlock(worker, "employeeEntryValidationSuccessTrace");
  const validateBlock = functionBlock(worker, "validateEmployeeEntryUploadPayload");

  assert.match(successTrace, /payload_parse/);
  assert.match(successTrace, /event_dispatch/);
  assert.match(successTrace, /session_summary_build/);
  assert.match(successTrace, /export_text_build/);
  assert.match(successTrace, /structured_anchor_block_build/);
  assert.match(successTrace, /owner_decoder_compat/);
  assert.match(successTrace, /final_preflight/);
  assert.match(validateBlock, /ok:true/);
  assert.match(validateBlock, /validation_trace:employeeEntryValidationSuccessTrace\(type,eventIndex/);
});

test("frontend preserves and renders validation_trace from dry-run", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /validation_trace:Array\.isArray\(data\.validation_trace\)\?data\.validation_trace\.filter\(Boolean\):\[\]/);
  assert.match(html, /Validation Trace<br><small>\\u6821\\u9a8c\\u94fe\\u8def<\/small>/);
  assert.match(html, /const trace=\(r\.validation_trace\|\|\[\]\)\.map/);
  assert.match(html, /stage:'client_upload_state_fallback'/);
});

test("client-side batch validation cannot return generic no-stage upload error", async () => {
  const html = await readFile(employeePath, "utf8");
  const commitStart = html.lastIndexOf("async function commitSessionAndExport");
  assert.ok(commitStart >= 0, "effective commitSessionAndExport function must exist");
  const commitBlock = html.slice(commitStart);
  const localFailStart = commitBlock.indexOf("if(!validation.ok)");
  const dryRunStart = commitBlock.indexOf("const canonicalEntries=uploadList.map", localFailStart);
  assert.ok(localFailStart >= 0 && dryRunStart > localFailStart, "local validation failure branch must exist");
  const localFailureBranch = commitBlock.slice(localFailStart, dryRunStart);

  assert.match(localFailureBranch, /CLIENT_ANCHOR_BATCH_VALIDATION_FAILED/);
  assert.match(localFailureBranch, /stage:'client_anchor_batch_validation'/);
  assert.match(localFailureBranch, /function:'validateUploadAnchorBatch'/);
  assert.doesNotMatch(localFailureBranch, /error_code:'UPLOAD_VALIDATION_FAILED'/);
});


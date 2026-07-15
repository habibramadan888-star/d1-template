import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";
const workerPath = "deploy-worker/src/index.js";

function finalFunctionBlock(source, signature, nextSignature) {
  const start = source.lastIndexOf(signature);
  assert.ok(start >= 0, `${signature} not found`);
  const end = source.indexOf(nextSignature, start);
  assert.ok(end > start, `${nextSignature} not found after ${signature}`);
  return source.slice(start, end);
}

test("upload session uses server dry-run as the first non-empty validation authority", async () => {
  const html = await readFile(employeePath, "utf8");
  const uploadBlock = finalFunctionBlock(
    html,
    "async function commitSessionAndExport()",
    "function normalizeEmployeeView"
  );

  assert.match(uploadBlock, /if\(state\.user&&!state\.drafts\.length\)/);
  assert.match(uploadBlock, /error_code:'NO_RECORDS_TO_UPLOAD'/);
  assert.match(uploadBlock, /source:'no_records_to_upload'/);
  assert.match(uploadBlock, /const canonicalEntries=uploadList\.map\(normalizeEntryAnchor\)/);
  assert.match(uploadBlock, /validationRequests\.push\(requestPayload\)/);
  assert.match(uploadBlock, /await validateEmployeeUploadAggregateDryRun\(validationRequests\)/);
  assert.match(uploadBlock, /if\(dryRunFailed\.length\)/);
  assert.doesNotMatch(uploadBlock, /const validation=validateUploadAnchorBatch\(uploadList\)/);
  assert.doesNotMatch(uploadBlock, /if\(!validation\.ok\)/);
  assert.doesNotMatch(uploadBlock, /CLIENT_ANCHOR_BATCH_VALIDATION_FAILED/);

  const dryRunIndex = uploadBlock.indexOf("await validateEmployeeUploadAggregateDryRun(validationRequests)");
  const realUploadIndex = uploadBlock.indexOf("apiFetch('/api/employee/entry'", dryRunIndex);
  assert.ok(realUploadIndex > dryRunIndex, "real upload must occur only after server dry-run");
});

test("frontend upload failures use only allowed source labels", async () => {
  const html = await readFile(employeePath, "utf8");
  const sourceMatches = [...html.matchAll(/source:'([^']+)'/g)].map((match) => match[1]);
  const uploadSources = sourceMatches.filter((source) =>
    [
      "server_dry_run_validation",
      "server_upload",
      "network_error",
      "no_records_to_upload",
    ].includes(source)
  );

  assert.ok(uploadSources.includes("server_dry_run_validation"));
  assert.ok(uploadSources.includes("server_upload"));
  assert.ok(uploadSources.includes("network_error"));
  assert.ok(uploadSources.includes("no_records_to_upload"));
  assert.doesNotMatch(html, /source:'client_/);
  assert.doesNotMatch(html, /DIAGNOSTIC_TRACE_MISSING/);
  assert.doesNotMatch(html, /CLIENT_ANCHOR_BATCH_VALIDATION_FAILED/);
});

test("server dry-run exposes exact rent error codes instead of generic validation failure", async () => {
  const worker = await readFile(workerPath, "utf8");

  assert.match(worker, /employeeEntryValidationFailure\("rent_validation","RENT_PERIOD_INVALID"/);
  assert.match(worker, /employeeEntryValidationFailure\("rent_short_paid","SHORT_PAID_DUE_DATE_REQUIRED"/);
  assert.match(worker, /employeeEntryValidationFailure\("payload","PAYLOAD_PARSE_FAILED"/);
  assert.doesNotMatch(worker, /employeeEntryValidationFailure\([^)]*"UPLOAD_VALIDATION_FAILED"/);
});


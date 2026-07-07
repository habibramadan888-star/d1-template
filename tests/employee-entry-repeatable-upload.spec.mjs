import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";

function finalFunctionBlock(source, signature, nextSignature) {
  const start = source.lastIndexOf(signature);
  assert.ok(start > 0, `${signature} not found`);
  const end = source.indexOf(nextSignature, start);
  assert.ok(end > start, `${nextSignature} not found after ${signature}`);
  return source.slice(start, end);
}

test("employee session upload creates a fresh session for every active upload click", async () => {
  const html = await readFile(employeePath, "utf8");
  const uploadBlock = finalFunctionBlock(
    html,
    "async function commitSessionAndExport()",
    "function normalizeEmployeeView"
  );

  assert.match(html, /function startRepeatableUploadSessionId\(\)/);
  assert.match(html, /function prepareRepeatableUploadRows\(rows,sessionId=startRepeatableUploadSessionId\(\),attemptId=uid\('upload'\)\)/);
  assert.match(uploadBlock, /const uploadSessionId=startRepeatableUploadSessionId\(\)/);
  assert.match(uploadBlock, /const uploadList=prepareRepeatableUploadRows\(originalDrafts,uploadSessionId\)/);
  assert.doesNotMatch(uploadBlock, /state\.drafts\.filter\(e=>e\.sync_status!=='SYNCED'\)/);
  assert.doesNotMatch(uploadBlock, /Bed Transfer records are saved separately/);
  assert.match(uploadBlock, /entries:canonicalEntries/);
  assert.match(uploadBlock, /entries_json:sessionEntriesJson/);
});

test("same request idempotency is per upload attempt, while a new click gets a new attempt", async () => {
  const html = await readFile(employeePath, "utf8");

  assert.match(html, /copy\.upload_attempt_id=attemptId/);
  assert.match(html, /copy\.idempotency_key=`\$\{attemptId\}-\$\{entryId\}`/);
  assert.match(html, /copy\.original_local_entry_id=entry\?\.id\|\|entry\?\.event_id\|\|entry\?\.anchor_id/);
});

test("local anchor validation cannot block server dry-run upload validation", async () => {
  const html = await readFile(employeePath, "utf8");
  const uploadBlock = finalFunctionBlock(
    html,
    "async function commitSessionAndExport()",
    "function normalizeEmployeeView"
  );

  assert.match(html, /function validateUploadAnchorBatch\(rows\)/);
  assert.doesNotMatch(uploadBlock, /const validation=validateUploadAnchorBatch\(uploadList\)/);
  assert.doesNotMatch(uploadBlock, /if\(!validation\.ok\)/);
  assert.doesNotMatch(uploadBlock, /CLIENT_ANCHOR_BATCH_VALIDATION_FAILED/);
  assert.doesNotMatch(uploadBlock, /source:'client_local_validation'/);
  const dryRunIndex = uploadBlock.indexOf("validateEmployeeUploadDryRun(e,sessionForEntry,i)");
  const apiIndex = uploadBlock.indexOf("apiFetch('/api/employee/entry'");
  assert.ok(dryRunIndex > 0, "server dry-run must be called");
  assert.ok(apiIndex > dryRunIndex, "real upload must run only after server dry-run");
});

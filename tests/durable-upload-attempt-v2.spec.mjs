import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const worker = await readFile("deploy-worker/src/index.js", "utf8");
const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");
const migration = await readFile("migrations/009_employee_upload_attempts.sql", "utf8");
const contract = await readFile("docs/contracts/EMPLOYEE_UPLOAD_ATTEMPT_V2.md", "utf8");

function functionBlock(source, name, last = false) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, "g");
  const starts = Array.from(source.matchAll(pattern), (match) => match.index);
  const start = last ? (starts.at(-1) ?? -1) : (starts[0] ?? -1);
  assert.notEqual(start, -1, `${name} must exist`);
  const namedEnd = source.indexOf(`__name(${name},`, start);
  if (namedEnd > start) return source.slice(start, namedEnd);
  const parametersStart = source.indexOf("(", start);
  let parametersDepth = 0;
  let bodyStart = -1;
  for (let index = parametersStart; index < source.length; index += 1) {
    if (source[index] === "(") parametersDepth += 1;
    if (source[index] === ")" && --parametersDepth === 0) {
      bodyStart = source.indexOf("{", index + 1);
      break;
    }
  }
  assert.notEqual(bodyStart, -1, `${name} body must exist`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} is unterminated`);
}

test("employee_upload_attempt_v2 migration persists only durable control metadata", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS employee_upload_attempts/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS employee_upload_attempt_entries/);
  for (const field of ["attempt_id", "company_scope", "employee_id", "session_id", "qa_run_id", "artifact_sha", "payload_hash", "validation_attempt_id", "validation_result_digest", "expected_entry_ids_json", "saved_count", "conflict_count", "duplicate_count", "lease_token_hash", "lease_expires_at", "receipt_digest"]) assert.match(migration, new RegExp(`\\b${field}\\b`));
  assert.match(migration, /UNIQUE\(company_scope, session_id, payload_hash\)/);
  assert.doesNotMatch(migration, /password|cookie|access_token|ttlock_token|phone|card_number/i);
  assert.match(contract, /Production migration, deployment, traffic, configuration, and business data remain unchanged/);
});

test("attempt lifecycle has conditional lease, monotonic terminal receipt, and exact reconciliation", () => {
  const acquire = functionBlock(worker, "employeeUploadAttemptAcquireLease");
  const next = functionBlock(worker, "employeeUploadAttemptNext");
  const finalize = functionBlock(worker, "employeeUploadAttemptFinalize");
  const reconcile = functionBlock(worker, "employeeUploadAttemptReconcile");
  assert.match(acquire, /lease_expires_at/);
  assert.match(acquire, /COALESCE\(lease_token_hash/);
  assert.match(acquire, /status IN \('CREATED','VALIDATED','WRITING','PAUSED_TRANSIENT','VERIFYING','FINALIZING'\)/);
  assert.match(next, /UPLOAD_ATTEMPT_LEASE_CONFLICT/);
  assert.match(next, /qaAcceptanceBuildWriteBatches/);
  assert.match(next, /handleEmployeeEntry/);
  assert.doesNotMatch(next, /validateEmployeeEntryAggregatePreflight/);
  assert.match(reconcile, /qaAcceptanceRunPersistenceSnapshot/);
  assert.match(reconcile, /UPLOAD_ENTRY_CONFLICT/);
  assert.match(reconcile, /UPLOAD_ENTRY_DUPLICATE/);
  assert.match(finalize, /UPLOAD_FINALIZATION_NOT_READY/);
  assert.match(finalize, /qaAcceptanceFinalizePersistedRun/);
  assert.match(finalize, /status='COMPLETED'/);
  assert.match(finalize, /receipt_digest/);
});

test("QA Recovery alone injects response loss after exact 40 while retaining E25 E27 E43 E44", () => {
  const next = functionBlock(worker, "employeeUploadAttemptNext");
  assert.match(next, /String\(run\.mode\|\|""\)==="recovery"/);
  assert.match(next, /initial_missing_ordinals/);
  assert.match(next, /recoveryHeldIds/);
  assert.match(next, /afterCounts\.saved_count===recoveryInitialCount/);
  assert.match(next, /SERVER_PROCESSING_TIMEOUT/);
  assert.match(next, /response_lost:true/);
});

test("Recovery automation can accept only its own validated run without a human button", () => {
  const automation = functionBlock(worker, "qaAcceptanceRecordAutomation");
  assert.match(automation, /String\(run\.mode\|\|""\)==="recovery"/);
  assert.match(automation, /recoveryAutoAccepted\?"MANUAL_EMPLOYEE_ACCEPTED":nextStatus/);
  assert.match(automation, /employee_accepted_by='qa-recovery-automation'/);
});

test("start consumes the locked validation attestation once and never persists a full payload", () => {
  const start = functionBlock(worker, "employeeUploadAttemptStart");
  assert.match(start, /qaAcceptanceValidationAttestationCurrent/);
  assert.match(start, /acceptance_locked!==true/);
  assert.match(start, /validation_count:1/);
  assert.match(start, /validation_attestation_reused:true/);
  assert.match(start, /validation_result_digest/);
  assert.doesNotMatch(start, /validateEmployeeEntryAggregatePreflight/);
  assert.doesNotMatch(start, /JSON\.stringify\(body\)/);
});

test("Staff routes expose start, status, next, and finalize without a public recursive request", () => {
  const routes = functionBlock(worker, "handleQaAcceptanceApi");
  assert.match(routes, /upload-attempts/);
  assert.match(routes, /employeeUploadAttemptStart/);
  assert.match(routes, /employeeUploadAttemptStatus/);
  assert.match(routes, /employeeUploadAttemptNext/);
  assert.match(routes, /employeeUploadAttemptFinalize/);
  assert.doesNotMatch([functionBlock(worker, "employeeUploadAttemptStart"), functionBlock(worker, "employeeUploadAttemptNext"), functionBlock(worker, "employeeUploadAttemptFinalize")].join("\n"), /fetch\(|workers\.dev|QA_HOSTNAME/);
});

test("one user click automatically recovers response loss and completes 44 entries with one receipt", async () => {
  const calls = [];
  const state = { sessionId: "QA-RUN-CURRENT", qaAcceptance: { runId: "QA-RUN", artifactSha: "a".repeat(64), payloadHash: "b".repeat(64), validationAttemptId: "qa-val-1" } };
  let nextCall = 0;
  const sandbox = {
    Date,
    Math,
    Number,
    String,
    Promise,
    setTimeout,
    encodeURIComponent,
    state,
    window: {},
    showStatus: () => {},
    employeeQaAttemptAdoptProgress(data) {
      const qa = state.qaAcceptance;
      qa.alreadyPersistedCount = Number(data.saved_count || 0);
      qa.remainingCount = Number(data.remaining_count || 0);
      qa.conflictingEntryCount = Number(data.conflict_count || 0);
      qa.duplicateEntryIdCount = Number(data.duplicate_count || 0);
      if (data.attempt_id) qa.uploadAttemptId = data.attempt_id;
      if (data.upload_receipt) qa.uploadAttemptReceipt = data.upload_receipt;
    },
    async employeeQaAttemptRequest(path) {
      calls.push(path);
      if (path.endsWith("/upload-attempts")) return { attempt_id: "UPA-1", status: "VALIDATED", expected_count: 44, saved_count: 0, remaining_count: 44, conflict_count: 0, duplicate_count: 0 };
      if (path.endsWith("/finalize")) return { attempt_id: "UPA-1", status: "COMPLETED", expected_count: 44, saved_count: 44, remaining_count: 0, conflict_count: 0, duplicate_count: 0, upload_receipt: { formal_write_count: 44, receipt_id: "R-1" } };
      if (path.endsWith("/UPA-1")) return { attempt_id: "UPA-1", status: "VERIFYING", expected_count: 44, saved_count: 44, remaining_count: 0, conflict_count: 0, duplicate_count: 0 };
      nextCall += 1;
      if (nextCall === 7) { const error = new Error("UPLOAD_ATTEMPT_PAUSED_TRANSIENT"); error.retryable = true; throw error; }
      const saved = Math.min(44, nextCall * 6);
      return { attempt_id: "UPA-1", status: saved === 44 ? "VERIFYING" : "WRITING", expected_count: 44, saved_count: saved, remaining_count: 44 - saved, conflict_count: 0, duplicate_count: 0 };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${functionBlock(employee, "employeeQaDurableUpload")}\nthis.run=employeeQaDurableUpload`, sandbox);
  const result = await sandbox.run(Array.from({ length: 44 }, (_, index) => ({ id: `E${index + 1}` })), { validation_attempt_id: "qa-val-1", validation_result_count: 44 });
  assert.equal(result.status, "COMPLETED");
  assert.equal(result.saved_count, 44);
  assert.equal(calls.filter(path => path.endsWith("/upload-attempts")).length, 1);
  assert.equal(calls.filter(path => path.endsWith("/UPA-1")).length, 1, "one status recovery follows response loss");
  assert.equal(calls.filter(path => path.endsWith("/finalize")).length, 1);
  assert.equal(sandbox.window.__qaLastDurableUpload.user_click_count, 1);
  assert.equal(sandbox.window.__qaLastDurableUpload.manual_resume_count, 0);
  assert.equal(sandbox.window.__qaLastDurableUpload.formal_write_count, 44);
});

test("client uses authoritative saved_count, keeps drafts until receipt, and blocks double click", () => {
  const upload = functionBlock(employee, "commitSessionAndExport", true);
  const adopt = functionBlock(employee, "employeeQaAttemptAdoptProgress");
  const durable = functionBlock(employee, "employeeQaDurableUpload");
  assert.match(adopt, /data\.saved_count/);
  assert.doesNotMatch(adopt, /already_persisted_count/);
  assert.match(durable, /statusRecoveries/);
  assert.match(durable, /manual_resume_count:0/);
  assert.match(durable, /String\(progress\?\.status\|\|''\)==='COMPLETED'/);
  assert.match(upload, /const completed=await employeeQaDurableUpload[\s\S]*?state\.drafts=\[\]/);
  assert.match(upload, /const resumed=await employeeQaDurableUpload[\s\S]*?state\.drafts=\[\]/);
  assert.match(upload, /btns\.some\(b=>b\.dataset\.busy==='1'\)/);
  assert.match(upload, /Upload paused/);
  assert.match(upload, /state\.drafts=allOriginalDrafts/);
});

test("error dictionary is bounded and carries authoritative attempt progress", () => {
  const error = functionBlock(worker, "employeeUploadAttemptError");
  for (const code of ["UPLOAD_ATTEMPT_LEASE_CONFLICT", "UPLOAD_ATTEMPT_PAYLOAD_MISMATCH", "UPLOAD_ATTEMPT_ARTIFACT_MISMATCH", "UPLOAD_ATTEMPT_PAUSED_TRANSIENT", "UPLOAD_ATTEMPT_STATUS_UNAVAILABLE", "UPLOAD_ENTRY_CONFLICT", "UPLOAD_ENTRY_DUPLICATE", "UPLOAD_FINALIZATION_NOT_READY", "UPLOAD_FINALIZATION_FAILED"]) assert.match(worker, new RegExp(code));
  for (const field of ["attempt_id", "payload_hash", "stage", "saved_count", "remaining_count", "conflict_count", "duplicate_count", "no_write", "write_attempted", "retryable", "server_time"]) assert.match(error, new RegExp(field));
});

test("QA-only attempt implementation does not alter Finance, Owner, TTLock, or rent split formulas", () => {
  const changedFunctions = ["employeeUploadAttemptStart", "employeeUploadAttemptStatus", "employeeUploadAttemptNext", "employeeUploadAttemptFinalize"].map(name => functionBlock(worker, name)).join("\n");
  assert.match(changedFunctions, /allow_live_fetch=false/g);
  assert.doesNotMatch(changedFunctions, /canonicalFinanceProjectionBuild|ownerOverview|rentEntryV2CanonicalSummary|ttlockFetch|api\.sciener/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = relative => readFile(new URL(relative, root), "utf8");

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} missing`);
  const params = source.indexOf("(", start);
  let paramsDepth = 0;
  let open = -1;
  for (let index = params; index < source.length; index += 1) {
    if (source[index] === "(") paramsDepth += 1;
    if (source[index] === ")" && --paramsDepth === 0) { open = source.indexOf("{", index); break; }
  }
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} unterminated`);
}

function clientFixture(status = "MANUAL_EMPLOYEE_ACCEPTED") {
  const qaRunId = "QA-20260716-4FB51FAF";
  const artifact = "a".repeat(64);
  const payload = "b".repeat(64);
  const worker = "qa-worker-reviewed";
  const matrix = "employee-qa-matrix-v2";
  const entries = Array.from({ length: 16 }, (_, index) => ({ id: `${qaRunId}-E${String(index + 1).padStart(2, "0")}` }));
  const sessionIds = Object.fromEntries(entries.map((entry, index) => [entry.id, `${qaRunId}-S${String(index + 1).padStart(2, "0")}`]));
  const validationResults = entries.map(entry => ({
    entry_identity: entry.id,
    ok: true,
    diagnostic_envelope: {
      validation_attempt_id: "qa-val-123456789012",
      qa_run_id: qaRunId,
      artifact_sha256: artifact,
      worker_version: worker,
      matrix_version: matrix,
      payload_hash: payload,
      result_origin: "SERVER_ATTESTATION",
    },
  }));
  const oracle = Object.fromEntries(["cash_received", "bank_received", "total_received", "total_expenses", "net_funds", "cash_net", "bank_net", "outstanding", "arrears_opened", "arrears_repaid", "deposit_included", "bed_transfer_fee", "rent_income"].map(field => [field, 0]));
  return {
    qa_run_id: qaRunId,
    mode: "quick",
    status,
    cleanup_status: "NOT_RUN",
    delivery_contract: "SERVER_PERSISTED_QA_RUN_V1",
    artifact_sha256: artifact,
    current_artifact_sha256: artifact,
    artifact_compatibility: { ok: true, mode: "CURRENT_ARTIFACT", run_artifact_sha256: artifact, current_artifact_sha256: artifact },
    qa_worker_version: worker,
    matrix_version: matrix,
    payload_hash: payload,
    scenario_count: 16,
    employee_record_count: 16,
    server_record_count: 16,
    employee_review_status: ["MANUAL_EMPLOYEE_ACCEPTED", "UPLOAD_PASS"].includes(status) ? "ACCEPTED" : "PENDING",
    upload_allowed: status === "MANUAL_EMPLOYEE_ACCEPTED",
    readonly: status === "UPLOAD_PASS",
    entries,
    session_ids_by_entry: sessionIds,
    expected_finance: oracle,
    validation_attestation: {
      qa_run_id: qaRunId,
      artifact_sha256: artifact,
      qa_worker_version: worker,
      matrix_version: matrix,
      payload_hash: payload,
      validation_attempt_id: "qa-val-123456789012",
      expires_at: "2020-01-01T00:30:00.000Z",
      acceptance_locked: true,
      acceptance_locked_at: "2020-01-01T00:15:00.000Z",
      entry_ids: entries.map(entry => entry.id),
      validation_results: validationResults,
    },
  };
}

test("accepted and uploaded QA states rehydrate the same locked 16-entry attestation", async () => {
  const employee = await read("deploy-worker/public/employee-v3.html");
  const source = [
    functionBlock(employee, "employeeQaAcceptanceAttestationCurrent"),
    functionBlock(employee, "employeeQaAcceptanceStatePolicy"),
    functionBlock(employee, "employeeQaAcceptanceDeliveryContract"),
  ].join("\n");
  const context = vm.createContext({ employeeEntryStableIdentity: row => String(row.id || ""), Date, Set, String, Number });
  vm.runInContext(source, context);
  const contract = vm.runInContext("employeeQaAcceptanceDeliveryContract", context);

  const accepted = clientFixture();
  const acceptedResult = contract(accepted, accepted.qa_run_id);
  assert.equal(acceptedResult.expected, 16);
  assert.equal(acceptedResult.validationAttestation.acceptance_locked, true);
  assert.equal(acceptedResult.policy.upload_allowed, true);
  assert.equal(acceptedResult.policy.readonly, false);

  const predecessor = clientFixture();
  predecessor.current_artifact_sha256 = "d".repeat(64);
  predecessor.artifact_compatibility = { ok: true, mode: "REHYDRATION_PREDECESSOR", scope: "employee_post_acceptance_rehydration_v1", qa_run_id: predecessor.qa_run_id, run_artifact_sha256: predecessor.artifact_sha256, current_artifact_sha256: predecessor.current_artifact_sha256 };
  assert.equal(contract(predecessor, predecessor.qa_run_id).expected, 16);

  const uploaded = clientFixture("UPLOAD_PASS");
  const uploadedResult = contract(uploaded, uploaded.qa_run_id);
  assert.equal(uploadedResult.expected, 16);
  assert.equal(uploadedResult.policy.upload_allowed, false);
  assert.equal(uploadedResult.policy.readonly, true);

  const automation = clientFixture("AUTOMATION_PASS");
  automation.validation_attestation.acceptance_locked = false;
  automation.validation_attestation.acceptance_locked_at = "";
  automation.validation_attestation.expires_at = new Date(Date.now() + 60_000).toISOString();
  assert.equal(contract(automation, automation.qa_run_id).policy.upload_allowed, false);
  automation.validation_attestation.expires_at = "2020-01-01T00:30:00.000Z";
  assert.equal(contract(automation, automation.qa_run_id).validationAttestation, null);
});

test("artifact payload Entry and cleanup drift remain fail closed", async () => {
  const employee = await read("deploy-worker/public/employee-v3.html");
  const source = [functionBlock(employee, "employeeQaAcceptanceAttestationCurrent"), functionBlock(employee, "employeeQaAcceptanceStatePolicy"), functionBlock(employee, "employeeQaAcceptanceDeliveryContract")].join("\n");
  const context = vm.createContext({ employeeEntryStableIdentity: row => String(row.id || ""), Date, Set, String, Number });
  vm.runInContext(source, context);
  const contract = vm.runInContext("employeeQaAcceptanceDeliveryContract", context);
  const valid = clientFixture();
  assert.throws(() => contract({ ...valid, payload_hash: "c".repeat(64) }, valid.qa_run_id), /QA_ACCEPTED_ATTESTATION_MISSING/);
  assert.throws(() => contract({ ...valid, cleanup_status: "COMPLETED", upload_allowed: false }, valid.qa_run_id), /QA_RUN_NOT_READY|QA_RUN_ALREADY_CLEANED/);
  const duplicate = { ...valid, entries: [...valid.entries.slice(0, 15), valid.entries[0]] };
  assert.throws(() => contract(duplicate, valid.qa_run_id), /QA_ENTRY_ID_CONTRACT_INVALID/);
  assert.throws(() => contract({ ...valid, current_artifact_sha256: "c".repeat(64) }, valid.qa_run_id), /QA_ARTIFACT_MISMATCH/);
});

test("accepted server attestation freezes only exact proof accepted within its original TTL", async () => {
  const worker = await read("deploy-worker/src/index.js");
  const context = vm.createContext({ cleanText: value => String(value || ""), Date, Set, String, Number });
  vm.runInContext(functionBlock(worker, "qaAcceptanceValidationAttestationCurrent"), context);
  const current = vm.runInContext("qaAcceptanceValidationAttestationCurrent", context);
  const qaRunId = "QA-20260716-4FB51FAF";
  const ids = Array.from({ length: 16 }, (_, index) => `${qaRunId}-E${String(index + 1).padStart(2, "0")}`);
  const run = { qa_run_id: qaRunId, status: "MANUAL_EMPLOYEE_ACCEPTED", artifact_sha256: "a".repeat(64), artifact_commit: "b".repeat(40), qa_worker_version: "reviewed-worker", matrix_version: "employee-qa-matrix-v2", employee_record_count: 16, employee_accepted_at: "2020-01-01T00:15:00.000Z" };
  const contract = { payloadHash: "c".repeat(64), scenarios: ids.map(entry_id => ({ entry_id })) };
  const stored = { qa_run_id: qaRunId, artifact_sha256: run.artifact_sha256, qa_worker_version: run.qa_worker_version, matrix_version: run.matrix_version, payload_hash: contract.payloadHash, validation_attempt_id: "qa-val-123456789012", server_validated_at: "2020-01-01T00:00:00.000Z", expires_at: "2020-01-01T00:30:00.000Z", passed_count: 16, failed_count: 0, formal_write_count: 0, validation_results: ids.map(entry_identity => ({ entry_identity, ok: true, diagnostic_envelope: { validation_attempt_id: "qa-val-123456789012", qa_run_id: qaRunId, artifact_sha256: run.artifact_sha256, worker_version: run.qa_worker_version, matrix_version: run.matrix_version, payload_hash: contract.payloadHash } })) };
  const locked = current(run, contract, stored);
  assert.equal(locked.current, true);
  assert.equal(locked.acceptance_locked, true);
  assert.equal(locked.attestation, stored);
  assert.equal(current({ ...run, employee_accepted_at: "2020-01-01T00:31:00.000Z" }, contract, stored).current, false);
  assert.equal(current(run, { ...contract, payloadHash: "d".repeat(64) }, stored).current, false);
});

test("artifact compatibility lineage is exact to the accepted Run artifact commit and payload", async () => {
  const worker = await read("deploy-worker/src/index.js");
  const context = vm.createContext({ String });
  vm.runInContext(`const QA_REHYDRATION_COMPATIBILITY_SCOPE="employee_post_acceptance_rehydration_v1";const QA_SESSION_RESUME_COMPATIBILITY_SCOPE="employee_post_acceptance_session_resume_v1";${functionBlock(worker, "qaAcceptanceArtifactCompatibility")}`, context);
  const compatible = vm.runInContext("qaAcceptanceArtifactCompatibility", context);
  const run = { qa_run_id: "QA-20260716-4FB51FAF", artifact_sha256: "a".repeat(64), artifact_commit: "b".repeat(40) };
  const payloadHash = "c".repeat(64);
  const manifest = { candidate_sha256: "d".repeat(64), git_commit: "e".repeat(40), rehydration_compatible_artifacts: [{ scope: "employee_post_acceptance_rehydration_v1", qa_run_id: run.qa_run_id, artifact_sha256: run.artifact_sha256, git_commit: run.artifact_commit, payload_hash: payloadHash }] };
  assert.equal(compatible(manifest, run, payloadHash).mode, "REHYDRATION_PREDECESSOR");
  assert.equal(compatible(manifest, { ...run, qa_run_id: "QA-20260716-OTHER123" }, payloadHash).ok, false);
  assert.equal(compatible(manifest, run, "f".repeat(64)).ok, false);
});

test("transient and role failures preserve all loaded records while only real 401 redirects", async () => {
  const employee = await read("deploy-worker/public/employee-v3.html");
  const state = { qaAcceptance: { runId: "QA-20260716-4FB51FAF", status: "MANUAL_EMPLOYEE_ACCEPTED", mode: "quick", loadStatus: "READY", artifactSha: "a", workerVersion: "w", matrixVersion: "m", payloadHash: "p", sessionIdsByEntry: {}, validationAttestation: {} }, drafts: Array.from({ length: 16 }, (_, index) => ({ id: index + 1 })) };
  let redirects = 0;
  const context = vm.createContext({ state, buildExport() {}, refreshSessionViews() {}, employeeQaAcceptanceBanner() {}, showStatus() {}, redirectToUnifiedLogin() { redirects += 1; }, String, Number });
  vm.runInContext(functionBlock(employee, "employeeQaAcceptancePreserveLoadFailure"), context);
  const preserve = vm.runInContext("employeeQaAcceptancePreserveLoadFailure", context);

  for (const status of [500, 409, 403]) {
    const result = preserve(state.qaAcceptance.runId, 0, { message: `HTTP_${status}`, httpStatus: status }, { status: "MANUAL_EMPLOYEE_ACCEPTED", serverRecordCount: 16, httpStatus: status });
    assert.equal(result.preserved_count, 16);
    assert.equal(state.drafts.length, 16);
    assert.equal(state.qaAcceptance.loadStatus, "FAILED");
    assert.equal(state.qaAcceptance.uploadAllowed, false);
  }
  assert.equal(redirects, 0);
  preserve(state.qaAcceptance.runId, 0, { message: "AUTH_REQUIRED", httpStatus: 401 }, { status: "MANUAL_EMPLOYEE_ACCEPTED", serverRecordCount: 16, httpStatus: 401 });
  assert.equal(state.drafts.length, 16);
  assert.equal(redirects, 1);
});

test("current identity redirects only on a real 401 and preserves role 403 as an error", async () => {
  const employee = await read("deploy-worker/public/employee-v3.html");
  const responses = new Map([
    [401, { status: 401, ok: false, headers: { get: () => "" }, json: async () => ({}) }],
    [403, { status: 403, ok: false, headers: { get: () => "" }, json: async () => ({}) }],
    [200, { status: 200, ok: true, headers: { get: name => name === "content-type" ? "application/json" : "" }, json: async () => ({ role: "staff", userid: "qa-staff" }) }],
  ]);
  let selected = 200;
  const context = vm.createContext({
    apiFetch: async () => responses.get(selected), unwrapStandardResponse: value => value, Error,
    EMPLOYEE_ASSET_DIAGNOSTIC: { frontend_asset_version: "qa-idempotent-finalization-v1", employee_asset_version: "qa-idempotent-finalization-v1" },
    EMPLOYEE_AUTH_DIAGNOSTIC: { contract_version: "employee-auth-attempt-v1", attempt_sequence: 0, attempts: [], transitions: [], concurrent_join_count: 0, active_attempt_id: "", latest_response_class: "", latest_worker_version: "", latest_asset_version: "" },
  });
  vm.runInContext([
    functionBlock(employee, "employeeAuthDiagnosticTimestamp"),
    functionBlock(employee, "employeeAuthDiagnosticTrim"),
    functionBlock(employee, "employeeAuthDiagnosticBeginAttempt"),
    functionBlock(employee, "employeeAuthDiagnosticFinishAttempt"),
    functionBlock(employee, "employeeAuthError"),
    functionBlock(employee, "fetchCurrentAuthUser"),
  ].join("\n"), context);
  const current = vm.runInContext("fetchCurrentAuthUser", context);
  selected = 401;
  assert.equal(await current(), null);
  selected = 403;
  await assert.rejects(current(), /me_role_forbidden_403/);
  selected = 200;
  assert.equal((await current()).role, "staff");
});

test("QA staff routes and formal writes exclude Owner while upload completion remains Staff", async () => {
  const worker = await read("deploy-worker/src/index.js");
  assert.match(worker, /employee-draft\|automation\|upload-complete/);
  assert.match(worker, /const staffRoute=staffDraft\|\|staffAutomation\|\|staffUploadComplete/);
  assert.match(worker, /options\.staff===true&&!isStaffRoleValue\(user\?\.role\)/);
  assert.match(worker, /String\(user\?\.corpid\|\|""\)!=="HL-QA"\|\|!isStaffRoleValue\(user\?\.role\)/);
});

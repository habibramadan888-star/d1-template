import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = relative => readFile(new URL(relative, root), "utf8");

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} missing`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} unterminated`);
}

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `${startMarker} missing`);
  assert.notEqual(end, -1, `${endMarker} missing`);
  return source.slice(start, end);
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    value: key => values.get(key),
  };
}

test("QA and personal Current Session drafts use disjoint per-run namespaces", async () => {
  const employee = await read("deploy-worker/public/employee-v3.html");
  const source = [
    sourceBetween(employee, "function employeeStorageKey", "function employeeQaAcceptanceStorageKey"),
    sourceBetween(employee, "function employeeQaAcceptanceStorageKey", "function employeeActiveStorageKey"),
    sourceBetween(employee, "function employeeActiveStorageKey", "function employeeRemoveActiveDraftStorage"),
    sourceBetween(employee, "function employeeRemoveActiveDraftStorage", "function readDrafts"),
    sourceBetween(employee, "function saveDrafts", "function employeeEntryCloudConfirmed"),
  ].join("\n");
  const localStorage = memoryStorage();
  const state = { user: { userid: "qa-staff" }, qaAcceptance: { runId: "" }, drafts: [{ id: "622" }], sessionId: "S-PERSONAL" };
  const context = vm.createContext({ state, localStorage });
  vm.runInContext(source, context);

  vm.runInContext("saveDrafts()", context);
  const personalKey = "empv3:drafts:qa-staff";
  assert.deepEqual(JSON.parse(localStorage.value(personalKey)), [{ id: "622" }]);

  state.qaAcceptance.runId = "QA-20260716-ABCDEF12";
  state.drafts = Array.from({ length: 16 }, (_, index) => ({ id: `QA-20260716-ABCDEF12-E${String(index + 1).padStart(2, "0")}` }));
  state.sessionId = "QA-20260716-ABCDEF12-CURRENT";
  vm.runInContext("saveDrafts()", context);
  const qaKey = "empv3:drafts:qa-run:qa-staff:QA-20260716-ABCDEF12";
  assert.equal(JSON.parse(localStorage.value(qaKey)).length, 16);
  assert.deepEqual(JSON.parse(localStorage.value(personalKey)), [{ id: "622" }]);

  vm.runInContext("employeeRemoveActiveDraftStorage({drafts:true,session:true})", context);
  assert.equal(localStorage.value(qaKey), undefined);
  assert.deepEqual(JSON.parse(localStorage.value(personalKey)), [{ id: "622" }]);

  state.qaAcceptance.runId = "QA-20260716-1234ABCD";
  state.drafts = [{ id: "QA-20260716-1234ABCD-E01" }];
  vm.runInContext("saveDrafts()", context);
  assert.equal(JSON.parse(localStorage.value("empv3:drafts:qa-run:qa-staff:QA-20260716-1234ABCD")).length, 1);
  assert.equal(localStorage.value(qaKey), undefined);
});

test("server delivery response is accepted only with active matching artifact IDs and full oracle", async () => {
  const employee = await read("deploy-worker/public/employee-v3.html");
  const contract = sourceBetween(employee, "function employeeQaAcceptanceStatePolicy", "function employeeQaAcceptanceBanner");
  const context = vm.createContext({ employeeEntryStableIdentity: row => String(row.id || "") });
  vm.runInContext(contract, context);
  const runId = "QA-20260716-ABCDEF12";
  const entries = Array.from({ length: 16 }, (_, index) => ({ id: `${runId}-E${String(index + 1).padStart(2, "0")}` }));
  const sessions = Object.fromEntries(entries.map((entry, index) => [entry.id, `${runId}-S${String(index + 1).padStart(2, "0")}`]));
  const oracle = Object.fromEntries(["cash_received","bank_received","total_received","total_expenses","net_funds","cash_net","bank_net","outstanding","arrears_opened","arrears_repaid","deposit_included","bed_transfer_fee","rent_income"].map(key => [key, 0]));
  const artifact = "a".repeat(64);
  const valid = { qa_run_id: runId, mode: "quick", status: "DRAFT_READY", cleanup_status: "NOT_RUN", delivery_contract: "SERVER_PERSISTED_QA_RUN_V1", artifact_sha256: artifact, current_artifact_sha256: artifact, artifact_compatibility: { ok: true, mode: "CURRENT_ARTIFACT", run_artifact_sha256: artifact, current_artifact_sha256: artifact }, qa_worker_version: "qa-worker-v2", matrix_version: "employee-qa-matrix-v2", payload_hash: "b".repeat(64), scenario_count: 16, employee_record_count: 16, server_record_count: 16, employee_review_status: "PENDING", upload_allowed: false, readonly: false, entries, session_ids_by_entry: sessions, expected_finance: oracle };
  assert.equal(vm.runInContext("employeeQaAcceptanceDeliveryContract", context)(valid, runId).expected, 16);
  assert.throws(() => vm.runInContext("employeeQaAcceptanceDeliveryContract", context)({ ...valid, current_artifact_sha256: "b".repeat(64) }, runId), /QA_ARTIFACT_MISMATCH/);
  assert.throws(() => vm.runInContext("employeeQaAcceptanceDeliveryContract", context)({ ...valid, entries: [...entries.slice(0, 15), entries[0]] }, runId), /QA_ENTRY_ID_CONTRACT_INVALID/);
  assert.throws(() => vm.runInContext("employeeQaAcceptanceDeliveryContract", context)({ ...valid, expected_finance: {} }, runId), /QA_FINANCIAL_ORACLE_MISSING/);
  assert.throws(() => vm.runInContext("employeeQaAcceptanceDeliveryContract", context)({ ...valid, cleanup_status: "COMPLETED" }, runId), /QA_RUN_ALREADY_CLEANED/);

  const fullEntries = Array.from({ length: 41 }, (_, index) => ({ id: `${runId}-E${String(index + 1).padStart(2, "0")}` }));
  const fullSessions = Object.fromEntries(fullEntries.map((entry, index) => [entry.id, `${runId}-S${String(index + 1).padStart(2, "0")}`]));
  const full = { ...valid, mode: "full", scenario_count: 46, employee_record_count: 41, server_record_count: 41, entries: fullEntries, session_ids_by_entry: fullSessions };
  assert.equal(vm.runInContext("employeeQaAcceptanceDeliveryContract", context)(full, runId).expected, 41);
  assert.throws(() => vm.runInContext("employeeQaAcceptanceDeliveryContract", context)({ ...full, scenario_count: 40 }, runId), /QA_EMPLOYEE_COUNT_MISMATCH/);
});

test("cross-browser loader always fetches server state and never falls back to personal draft or auto upload", async () => {
  const [employee, worker] = await Promise.all([
    read("deploy-worker/public/employee-v3.html"),
    read("deploy-worker/src/index.js"),
  ]);
  const loader = functionBlock(employee, "employeeLoadQaAcceptanceRun");
  assert.match(loader, /\/employee-draft/);
  assert.match(loader, /personalDraftCount=state\.drafts\.length/);
  assert.match(loader, /employeeQaAcceptanceStorageKey\('empv3:drafts',runId\)/);
  assert.match(loader, /QA Run could not be loaded\. Your personal draft remains unchanged\./);
  assert.doesNotMatch(loader, /QA_LOCAL_DRAFT_CONFLICT|commitSessionAndExport|\/api\/employee\/entry['"]/);
  assert.match(worker, /SERVER_PERSISTED_QA_RUN_V1/);
  assert.match(worker, /qa:artifact-manifest/);
  assert.match(worker, /QA_RUN_ALREADY_CLEANED/);
  assert.match(worker, /QA_RUN_ENTRY_ID_INVALID/);
  assert.match(worker, /QA_RUN_SESSION_ID_INVALID/);
  assert.match(worker, /QA_RUN_FINANCIAL_ORACLE_MISSING/);
  assert.match(worker, /formal_write_count:0/);
  assert.match(loader, /upload_status:uploadStatus/);
  assert.doesNotMatch(loader, /upload_status:'VALIDATION_PASSED'/);
});

test("old failed handoff remains preserved and cannot be mistaken for acceptance", async () => {
  const evidence = await read("docs/evidence/qa-runs/QA-20260716-F62E35B7/acceptance.md");
  assert.match(evidence, /QA_RUN_STATUS: AUTOMATION_PASS/);
  assert.match(evidence, /MANUAL_EMPLOYEE_STATUS: DELIVERY_FAILED/);
  assert.match(evidence, /MANUAL_EMPLOYEE_DELIVERY_RESULT: FAILED_CROSS_BROWSER_STATE/);
  assert.match(evidence, /Formal write count: 0/);
  assert.doesNotMatch(evidence, /MANUAL_EMPLOYEE_ACCEPTED|UPLOAD_PASS|FINAL_ACCEPTED/);
});

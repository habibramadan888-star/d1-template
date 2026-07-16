import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import {
  EMPLOYEE_VALIDATION_ERROR_CATALOG,
  normalizeEmployeeValidationErrorCode,
} from "../modules/employees/validation-error-catalog.mjs";

const root = new URL("../", import.meta.url);
const read = relative => readFile(new URL(relative, root), "utf8");

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} missing`);
  const namedEnd = source.indexOf(`__name(${name},`, start);
  if (namedEnd > start) return source.slice(start, namedEnd);
  const paramsStart = source.indexOf("(", start);
  let paramsDepth = 0;
  let open = -1;
  for (let index = paramsStart; index < source.length; index += 1) {
    if (source[index] === "(") paramsDepth += 1;
    if (source[index] === ")" && --paramsDepth === 0) {
      open = source.indexOf("{", index);
      break;
    }
  }
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} end missing`);
}

test("validation error catalog covers every employee validator code", async () => {
  const worker = await read("deploy-worker/src/index.js");
  const emitted = [...worker.matchAll(/employeeEntryValidationFailure\([^,]+,["']([A-Z0-9_]+)["']/g)].map(match => match[1]);
  const missing = [...new Set(emitted)].filter(code => !EMPLOYEE_VALIDATION_ERROR_CATALOG[code]);
  assert.deepEqual(missing, []);
  for (const code of ["LEGACY_ARREARS_CANONICAL_REF_INVALID", "LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING"]) {
    const row = EMPLOYEE_VALIDATION_ERROR_CATALOG[code];
    for (const field of ["code", "event_types", "stage", "category", "severity", "retryable", "employee_message", "operator_message", "engineering_cause", "required_fields", "invalid_fields", "expected_action", "safe_context_schema", "owning_validator", "first_introduced_version"]) assert.notEqual(row?.[field], undefined, `${code}.${field}`);
  }
  assert.equal(normalizeEmployeeValidationErrorCode({ nested: true }), "UNREGISTERED_VALIDATION_ERROR");
  assert.equal(normalizeEmployeeValidationErrorCode("NOT_REGISTERED"), "UNREGISTERED_VALIDATION_ERROR");
});

test("QA aggregate results carry a complete live-server diagnostic envelope", async () => {
  const worker = await read("deploy-worker/src/index.js");
  const envelope = functionBlock(worker, "qaValidationDiagnosticEnvelope");
  for (const field of ["trace_id", "validation_attempt_id", "qa_run_id", "qa_run_mode", "matrix_version", "artifact_sha256", "worker_version", "session_id", "entry_id", "event_type", "event_index", "payload_hash", "validator_stage", "validator_function", "error_code", "error_category", "result_origin", "server_validated_at", "client_received_at", "expires_at", "snapshot_version", "cache_status", "stale_reason", "retryable", "suggested_user_action", "safe_engineering_hint"]) assert.match(envelope, new RegExp(`${field}:`), field);
  assert.match(envelope, /result_origin:"LIVE_SERVER"/);
});

test("attestation freshness binds Run artifact Worker matrix payload and attempt", async () => {
  const [worker, employee] = await Promise.all([
    read("deploy-worker/src/index.js"),
    read("deploy-worker/public/employee-v3.html"),
  ]);
  const server = functionBlock(worker, "qaAcceptanceValidationAttestationCurrent");
  const client = functionBlock(employee, "employeeQaAcceptanceAttestationCurrent");
  for (const field of ["qa_run_id", "artifact_sha256", "qa_worker_version", "matrix_version", "payload_hash", "validation_attempt_id"]) {
    assert.match(server, new RegExp(field));
    assert.match(client, new RegExp(field));
  }
  assert.match(client, /NEEDS_REVALIDATION|stale_reason/);
});

test("stale diagnostics are isolated by Run Entry payload artifact Worker and attempt", async () => {
  const employee = await read("deploy-worker/public/employee-v3.html");
  const key = functionBlock(employee, "employeeQaDiagnosticStorageKey");
  const current = functionBlock(employee, "employeeQaDiagnosticEnvelopeCurrent");
  assert.match(key, /qaRunId/);
  assert.match(key, /entryId/);
  for (const field of ["qa_run_id", "entry_id", "artifact_sha256", "worker_version", "payload_hash", "validation_attempt_id"]) assert.match(current, new RegExp(field));
  assert.match(current, /STALE_LOCAL|LEGACY_UNSCOPED/);
});

test("QA client asset version mismatch is blocked before per-record business errors", async () => {
  const [worker, employee, qaConfig] = await Promise.all([
    read("deploy-worker/src/index.js"),
    read("deploy-worker/public/employee-v3.html"),
    read("deploy-worker/wrangler.qa.toml"),
  ]);
  assert.match(worker, /QA_CLIENT_ASSET_STALE/);
  assert.match(employee, /QA_CLIENT_ASSET_STALE/);
  assert.match(qaConfig, /QA_CLIENT_ASSET_VERSION\s*=\s*"qa-session-atomic-resume-v1"/);
});

test("QA diagnostic endpoint and console expose bounded copy bundle only in QA", async () => {
  const [worker, consolePage, production] = await Promise.all([
    read("deploy-worker/src/index.js"),
    read("deploy-worker/public/qa-acceptance.html"),
    read("deploy-worker/wrangler.toml"),
  ]);
  assert.match(worker, /action==="diagnostics"/);
  assert.match(consolePage, /Copy Diagnostic Bundle/);
  assert.match(consolePage, /validation attempt|validation_attempt/i);
  assert.doesNotMatch(production, /QA_ACCEPTANCE_ENABLED|QA_CLIENT_ASSET_VERSION/);
});

test("same Entry ID cannot carry a diagnostic across QA Runs", async () => {
  const employee = await read("deploy-worker/public/employee-v3.html");
  const source = functionBlock(employee, "employeeQaDiagnosticEnvelopeCurrent");
  const context = vm.createContext({ result: null });
  vm.runInContext(`${source}; result=employeeQaDiagnosticEnvelopeCurrent({qa_run_id:'QA-20260716-OLD',entry_id:'E05',artifact_sha256:'a',worker_version:'w',payload_hash:'p',validation_attempt_id:'attempt-old'},{runId:'QA-20260716-NEW',artifactSha:'a',workerVersion:'w',payloadHash:'p',validationAttemptId:'attempt-new'},'E05')`, context);
  assert.equal(context.result.current, false);
  assert.equal(context.result.result_origin, "STALE_LOCAL");
  assert.equal(context.result.stale_reason, "QA_DIAGNOSTIC_SCOPE_MISMATCH");
});

test("payload artifact Worker attempt and expiry drift require revalidation", async () => {
  const employee = await read("deploy-worker/public/employee-v3.html");
  const source = functionBlock(employee, "employeeQaAcceptanceAttestationCurrent");
  const ids = ["QA-20260716-NEW-E05"];
  const context = { qa_run_id: "QA-20260716-NEW", artifact_sha256: "artifact-new", qa_worker_version: "worker-new", matrix_version: "matrix-v3", payload_hash: "payload-new" };
  const envelope = { validation_attempt_id: "qa-val-123456789012", qa_run_id: context.qa_run_id, artifact_sha256: context.artifact_sha256, worker_version: context.qa_worker_version, matrix_version: context.matrix_version, payload_hash: context.payload_hash, result_origin: "SERVER_ATTESTATION" };
  const attestation = { ...context, validation_attempt_id: envelope.validation_attempt_id, expires_at: new Date(Date.now()+60000).toISOString(), validation_results: [{ entry_identity: ids[0], diagnostic_envelope: envelope }] };
  const run = input => {
    const sandbox = vm.createContext({ result: null, Date });
    vm.runInContext(`${source}; result=employeeQaAcceptanceAttestationCurrent(${JSON.stringify(input)},${JSON.stringify(context)},${JSON.stringify(ids)})`, sandbox);
    return sandbox.result;
  };
  assert.equal(run(attestation).current, true);
  for (const [field, value] of [["payload_hash", "old"], ["artifact_sha256", "old"], ["qa_worker_version", "old"], ["validation_attempt_id", "qa-val-old000000"]]) assert.equal(run({ ...attestation, [field]: value }).current, false, field);
  assert.equal(run({ ...attestation, expires_at: "2020-01-01T00:00:00.000Z" }).current, false);
});

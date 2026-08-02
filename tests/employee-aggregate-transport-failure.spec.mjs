import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");
const worker = await readFile("deploy-worker/src/index.js", "utf8");

function functionBlock(source, name, last = false) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, "g");
  const starts = Array.from(source.matchAll(pattern), match => match.index);
  const start = last ? starts.at(-1) ?? -1 : starts[0] ?? -1;
  assert.notEqual(start, -1, `${name} must exist`);
  let depth = 0;
  let body = false;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") { depth += 1; body = true; }
    if (source[index] === "}" && body && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} must close`);
}

function transportSandbox(apiFetch) {
  const sandbox = {
    Blob,
    performance,
    apiFetch,
    employeeDiagnosticAssetMeta: () => ({ asset: "fixture" }),
    unwrapStandardResponse: body => body?.code === 0 && body?.data ? body.data : body
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(employee, "employeeAggregateValidationSessionFailure"),
    functionBlock(employee, "employeeAggregateValidationEntry"),
    functionBlock(employee, "employeeAggregateTechnicalValidationEntry"),
    functionBlock(employee, "validateEmployeeUploadAggregateDryRun"),
    "this.validate=validateEmployeeUploadAggregateDryRun"
  ].join("\n"), sandbox);
  return sandbox;
}

function identitySandbox() {
  const sandbox = {
    employeeEntryStableIdentity: entry => String(entry?.id || entry?.event_id || entry?.anchor_id || entry?.original_local_entry_id || "").trim()
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(employee, "employeeAggregateValidationSessionFailure"),
    functionBlock(employee, "employeeAggregateValidationIdentityContract"),
    "this.contract=employeeAggregateValidationIdentityContract",
    "this.failure=employeeAggregateValidationSessionFailure"
  ].join("\n"), sandbox);
  return sandbox;
}

test("aggregate validation uses the authenticated same-origin Worker route without recursive public fetch", () => {
  const client = functionBlock(employee, "validateEmployeeUploadAggregateDryRun");
  const handler = functionBlock(worker, "handleEmployeeEntryValidate");
  assert.equal((client.match(/apiFetch\('\/api\/employee\/entry\/validate'/g) || []).length, 1);
  assert.doesNotMatch(client, /https?:\/\/|workers\.dev/);
  assert.match(employee, /credentials:'include'/);
  assert.match(worker, /path==="\/api\/employee\/entry\/validate"&&request\.method==="POST"/);
  assert.match(handler, /validateEmployeeEntryAggregatePreflight\(env,user,body,\{request_context\}\)/);
});

test("network, 404, 503, timeout and non-JSON failures stay session-scoped", async () => {
  const requests = [{ entry: { id: "entry-1", type: "E" } }, { entry: { id: "entry-2", type: "TF" } }];
  const network = await transportSandbox(async () => { throw new TypeError("network unavailable"); }).validate(requests);
  assert.equal(network.error_code, "SERVER_VALIDATE_UNREACHABLE");
  assert.equal(network.exception_name, "TypeError");
  for (const status of [404, 503]) {
    const result = await transportSandbox(async () => ({
      status,
      headers: { get: () => "text/html" },
      text: async () => "<html>not exposed</html>"
    })).validate(requests);
    assert.equal(result.error_code, status === 404 ? "SERVER_VALIDATE_ROUTE_NOT_FOUND" : "SERVER_VALIDATE_HTTP_503");
    assert.equal(result.response_body_kind, "non_json");
    assert.equal(result.transport_failure, true);
    assert.equal(result.session_error, true);
    assert.equal(result.validation_result_count, 0);
    assert.equal(result.failed_result_count, 0);
    assert.deepEqual(Array.from(result.validation_results), []);
    assert.equal(result.formal_write_count, 0);
    assert.doesNotMatch(JSON.stringify(result), /<html>|not exposed/);
  }
});

test("transport failures remain diagnostic for Validate but do not gate ordinary formal upload", () => {
  const sessionError = functionBlock(employee, "renderEmployeeAggregateSessionError");
  const upload = functionBlock(employee, "commitSessionAndExport", true);
  assert.match(sessionError, /data-aggregate-session-error/);
  assert.match(sessionError, /Retry Validation/);
  assert.doesNotMatch(sessionError, /Remove Invalid Record/);
  const transportGate = upload.indexOf("aggregatePreflight?.transport_failure===true");
  const resultLoop = upload.indexOf("for(let i=0;i<uploadList.length;i++)", transportGate);
  assert.ok(transportGate >= 0 && resultLoop > transportGate);
  const gateBlock = upload.slice(transportGate, resultLoop);
  assert.match(gateBlock, /state\.drafts=allOriginalDrafts/);
  assert.match(gateBlock, /state\.aggregateValidationSessionError=aggregatePreflight/);
  assert.match(gateBlock, /if\(validateOnly\|\|state\.qaAcceptance\?\.runId\)/);
  assert.match(gateBlock, /formal_upload_technical_validation_deferred/);
  assert.match(gateBlock, /preflight_deferred_to_formal_upload:true/);
  assert.doesNotMatch(gateBlock, /upload_validation_error=/);
});

test("ordinary aggregate preflight sends a minimal technical envelope instead of four copies of raw evidence", async () => {
  let capturedBody = "";
  const largeEvidence = "x".repeat(200_000);
  const requests = [{
    entry_identity: "entry-1",
    entry: { id: "entry-1", type: "R", session_id: "session-1", idempotency_key: "idem-1", amount: 700, ttlock_context: largeEvidence, source_evidence: largeEvidence },
    entries: [{ id: "entry-1", type: "R", session_id: "session-1", idempotency_key: "idem-1", amount: 700, ttlock_context: largeEvidence }],
    session: { id: "session-1", entries: [{ id: "entry-1", type: "R", session_id: "session-1", idempotency_key: "idem-1", amount: 700, source_evidence: largeEvidence }] }
  }];
  const sandbox = transportSandbox(async (_path, options) => {
    capturedBody = options.body;
    return { status: 200, headers: { get: () => "application/json" }, text: async () => JSON.stringify({ validation_results: [{ ok: true, entry_identity: "entry-1" }] }) };
  });
  sandbox.state = { qaAcceptance: { runId: "" } };
  await sandbox.validate(requests);
  assert.ok(capturedBody.length < 5000, `technical preflight body must stay bounded, got ${capturedBody.length}`);
  assert.doesNotMatch(capturedBody, /ttlock_context|source_evidence/);
  assert.match(capturedBody, /entry-1/);
  assert.match(capturedBody, /idem-1/);
});

test("server error identity is preserved instead of collapsing every 503 into a timeout", async () => {
  const requests = [{ entry: { id: "entry-1", type: "E" } }];
  const result = await transportSandbox(async () => ({
    status: 503,
    headers: { get: () => "application/json" },
    text: async () => JSON.stringify({ error_code: "D1_TEMPORARILY_UNAVAILABLE" })
  })).validate(requests);
  assert.equal(result.error_code, "D1_TEMPORARILY_UNAVAILABLE");
  assert.equal(result.response_error_code, "D1_TEMPORARILY_UNAVAILABLE");
});

test("pure Retry Validation validates all saved records and returns before formal write", () => {
  const upload = functionBlock(employee, "commitSessionAndExport", true);
  assert.match(employee, /id="btnValidateSession"/);
  assert.match(employee, /btnValidateSession'\)\.onclick=\(\)=>\{state\.aggregateValidationOnly=true;commitSessionAndExport\(\)\}/);
  assert.match(upload, /const validateOnly=state\.aggregateValidationOnly===true/);
  assert.match(employee, /state\.aggregateValidationOnly=true;commitSessionAndExport\(\)/);
  assert.match(upload, /const originalDrafts=allOriginalDrafts/);
  assert.doesNotMatch(upload, /state\.drafts=uploadList/);
  const validateOnlyGate = upload.indexOf("if(validateOnly)");
  const formalWrite = upload.indexOf("apiFetch('/api/employee/entry'", validateOnlyGate);
  assert.ok(validateOnlyGate >= 0 && formalWrite > validateOnlyGate);
  assert.match(upload.slice(validateOnlyGate, formalWrite), /No business write was attempted/);
});

test("Bed Transfer preserves its stable Entry ID outside the business allowlist", () => {
  const payloadStart = employee.indexOf("function employeeBedTransferValidatePayload");
  const payload = employee.slice(payloadStart, employee.indexOf("function employeeBedTransferRecordPayload", payloadStart));
  const identityStart = worker.indexOf("function employeeEntryAggregateResultIdentity");
  const identity = worker.slice(identityStart, worker.indexOf("__name(employeeEntryAggregateResultIdentity", identityStart));
  const aggregateStart = worker.indexOf("async function validateEmployeeEntryAggregatePreflight");
  const aggregate = worker.slice(aggregateStart, worker.indexOf("__name(validateEmployeeEntryAggregatePreflight", aggregateStart));
  assert.match(payload, /const entryIdentity=employeeEntryStableIdentity\(entry\)/);
  assert.match(payload, /entry_identity:entryIdentity/);
  assert.doesNotMatch(payload, /const allowed=\[[^\]]*(?:anchor_id|fingerprint|transfer_at|accepted_at)/);
  assert.match(identity, /requestBody\?\.entry_identity\|\|entry\.id/);
  assert.match(aggregate, /entry_identity:entryIdentity/);
});

test("missing, duplicate and unknown Entry IDs fail once at the session boundary", () => {
  const sandbox = identitySandbox();
  const uploads = [{ id: "entry-a" }, { id: "entry-b" }];
  const valid = sandbox.contract([{ entry_identity: "entry-a" }, { entry_identity: "entry-b" }], uploads);
  assert.equal(valid.ok, true);
  for (const results of [
    [{ entry_identity: "entry-a" }, { entry_identity: "" }],
    [{ entry_identity: "entry-a" }, { entry_identity: "entry-a" }],
    [{ entry_identity: "entry-a" }, { entry_identity: "entry-x" }]
  ]) {
    const contract = sandbox.contract(results, uploads);
    assert.equal(contract.ok, false);
    const failure = sandbox.failure("SERVER_VALIDATE_MALFORMED_RESPONSE", {
      validation_result_count: results.length,
      unmatched_result_count: contract.unmatched_result_count,
      duplicate_entry_id_count: contract.duplicate_entry_id_count
    });
    assert.equal(failure.session_error, true);
    assert.equal(failure.failed_result_count, 0);
    assert.deepEqual(Array.from(failure.validation_results), []);
  }
});

test("frontend result association uses only stable Entry ID and never event index", () => {
  const upload = functionBlock(employee, "commitSessionAndExport", true);
  assert.match(upload, /employeeAggregateValidationIdentityContract\(aggregateResults,uploadList\)/);
  assert.match(upload, /aggregateResults\.find\(result=>String\(result\?\.entry_identity\|\|''\)===employeeEntryStableIdentity\(e\)\)/);
  assert.doesNotMatch(upload, /aggregateResults\[(?:i|index|eventIndex)\]/);
  assert.doesNotMatch(upload, /result\?\.entry_identity\|\|result\?\.record_id/);
});

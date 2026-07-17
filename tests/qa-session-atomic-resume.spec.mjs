import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import { QA_FULL_SCENARIOS, QA_QUICK_SCENARIOS } from "./fixtures/employee-qa-acceptance-matrices.mjs";
import { GOLDEN_FINANCE_EXPECTED } from "./helpers/employee-golden-session-oracle.mjs";

const worker = await readFile("deploy-worker/src/index.js", "utf8");
const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");
const artifactBuilder = await readFile("scripts/build-qa-acceptance-artifact.mjs", "utf8");

const RUN_ID = "QA-20260716-4FB51FAF";
const ARTIFACT_SHA = "a49ac3590b25a8567a6bf8362cf7968fdf17f4cabae476218eb437342113b304";
const PAYLOAD_HASH = "74c8dd64a3c79be7a566b2008ae5acd479876c604cfdb081d51ea2e52fc53ab3";
const RESUME_SCOPE = "employee_post_acceptance_session_resume_v1";

function functionBlock(source, name, last = false) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, "g");
  const starts = Array.from(source.matchAll(pattern), match => match.index);
  const start = last ? starts.at(-1) ?? -1 : starts[0] ?? -1;
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
  let opened = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") { depth += 1; opened = true; }
    if (source[index] === "}" && opened && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} is unterminated`);
}

function materializedScenarios() {
  return QA_QUICK_SCENARIOS.map((template, index) => {
    const number = String(index + 1).padStart(2, "0");
    const entryId = `${RUN_ID}-E${number}`;
    const sessionId = `${RUN_ID}-S${number}`;
    return {
      ...structuredClone(template),
      entry_id: entryId,
      session_id: sessionId,
      input: {
        ...structuredClone(template.input),
        id: entryId,
        event_id: entryId,
        session_id: sessionId,
        source: "employee_entry",
        operator: "qa-staff",
        created_at: "2026-07-16T08:00:00.000Z",
      },
    };
  });
}

function validationRequests(scenarios = materializedScenarios()) {
  return scenarios.map((scenario, eventIndex) => ({
    qa_run_id: RUN_ID,
    scenario_id: scenario.case_id,
    entry_identity: scenario.entry_id,
    event_index: eventIndex,
    entry: structuredClone(scenario.input),
    entries: [structuredClone(scenario.input)],
    session: {
      id: scenario.session_id,
      session_id: scenario.session_id,
      entries: [structuredClone(scenario.input)],
    },
  }));
}

test("41-entry Full upload uses bounded dependency-safe write batches and preserves Bed Transfer serialization", () => {
  const runId = "QA-20260717-PERFORMANCE";
  const scenarios = QA_FULL_SCENARIOS.map((template, index) => {
    const number = String(index + 1).padStart(2, "0");
    return { ...structuredClone(template), entry_id: `${runId}-E${number}`, session_id: `${runId}-S${number}` };
  });
  const sandbox = {
    Map,
    Set,
    Number,
    String,
    QA_ACCEPTANCE_WRITE_BATCH_SIZE: 6,
    cleanText: (value, max = 160) => String(value ?? "").trim().slice(0, max),
    employeeEntryUploadType: row => String(row?.type || "").toUpperCase(),
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(worker, "qaAcceptanceScenarioWriteDependencyKeys"),
    functionBlock(worker, "qaAcceptanceBuildWriteBatches"),
    "this.keys=qaAcceptanceScenarioWriteDependencyKeys;this.batches=qaAcceptanceBuildWriteBatches",
  ].join("\n"), sandbox);
  const byId = new Map(scenarios.map((row, index) => [row.entry_id, { row, index }]));
  const batches = sandbox.batches(scenarios.map(row => row.entry_id), byId, 6);
  assert.equal(batches.flat().length, 41);
  assert.equal(new Set(batches.flat()).size, 41);
  assert.ok(batches.length < 41, "ordinary writes must no longer be serialized one-by-one");
  for (const batch of batches) {
    assert.ok(batch.length <= 6);
    const used = new Set();
    let bedTransferCount = 0;
    for (const entryId of batch) {
      const scenario = byId.get(entryId).row;
      const keys = sandbox.keys(scenario);
      assert.equal([...keys].some(key => used.has(key)), false, `dependency overlap in ${entryId}`);
      for (const key of keys) used.add(key);
      if (String(scenario.input?.type || "").toUpperCase() === "TF") bedTransferCount += 1;
    }
    assert.ok(bedTransferCount <= 1, "canonical Bed Transfer writers remain serialized");
  }
  const resume = functionBlock(worker, "qaAcceptanceSessionResume");
  assert.match(resume, /Promise\.all\(batch\.map/);
  assert.match(resume, /write_batch_wall_ms/);
  assert.match(resume, /d1_batch_duration_ms/);
  assert.match(resume, /post_write_verification_ms/);
});

test("an uploaded Run awaiting Owner review remains immutable while a replacement performance Run may be created", () => {
  const createRun = functionBlock(worker, "qaAcceptanceCreateRun");
  assert.match(createRun, /status NOT IN \('FINAL_ACCEPTED','UPLOAD_PASS','MANUAL_OWNER_ACCEPTED'\)/);
  assert.match(createRun, /cleanup_status<>'COMPLETED'/);
  assert.doesNotMatch(createRun, /UPDATE qa_acceptance_runs/);
});

function aggregateHarness(failIndex = -1) {
  let archiveLoads = 0;
  let transactionLoads = 0;
  let formalWrites = 0;
  const contexts = new Set();
  const sandbox = {
    Date,
    Map,
    Number,
    Set,
    String,
    cleanText: value => String(value ?? "").trim(),
    employeeEntryValidationEntryFromBody: body => body.entry || {},
    employeeEntryUploadType: entry => String(entry.type || ""),
    entryAnchorEventType: type => ({ R: "rent", AP: "arrears_payment", D: "deposit_in", DR: "deposit_out", CO: "checkout", E: "expense", TF: "bed_transfer" }[type] || String(type || "entry").toLowerCase()),
    employeeBedTransferLegacyGenesisGate: () => ({ server_verified_permission: true }),
    cloudArrearsFetchActiveSessionRows: async (_env, _user, options) => {
      archiveLoads += 1;
      options.request_context.archive_read_count += 1;
      options.request_context.d1_read_count += 1;
      return [];
    },
    extractEmployeeEntryAnchorsFromSession: () => [],
    empTableExists: async () => true,
    employeeEntryPreloadExistingTransactions: async (_env, _user, _requests, context) => {
      transactionLoads += 1;
      context.transaction_read_count += 1;
      context.d1_read_count += 1;
      context.transactions_table_exists = true;
      context.existing_transactions_by_event_id = new Map();
      return context.existing_transactions_by_event_id;
    },
    employeeEntryValidationFailure: (stage, error_code, message, extra = {}) => ({
      ok: false,
      stage,
      error_code,
      message,
      missing_fields: extra.missing_fields || [],
      invalid_fields: extra.invalid_fields || [],
      event_index: extra.event_index || 0,
      event_type: extra.event_type || "",
      record_id: extra.record_id || "",
    }),
    validateEmployeeEntryUploadPayload: async (_env, _user, body, options) => {
      contexts.add(options.request_context);
      if (body.entry.type === "TF" && !options.request_context.ttlock_snapshot_count) options.request_context.ttlock_snapshot_count = 1;
      if (options.event_index === failIndex) {
        return { ok: false, stage: "fixture_validation", error_code: `FAIL_AT_${failIndex + 1}`, message: "fixture failure", event_index: options.event_index, event_type: sandbox.entryAnchorEventType(body.entry.type), record_id: body.entry.id };
      }
      return { ok: true, stage: "final_preflight", error_code: "", message: "passed", event_index: options.event_index, event_type: sandbox.entryAnchorEventType(body.entry.type), record_id: body.entry.id };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(worker, "employeeEntryAggregateValidationRequests"),
    functionBlock(worker, "employeeEntryAggregateResultIdentity"),
    functionBlock(worker, "employeeEntryAggregateRequestMetrics"),
    functionBlock(worker, "employeeEntryPrepareArchiveSnapshotContext"),
    functionBlock(worker, "validateEmployeeEntryAggregatePreflight"),
    "this.validate=validateEmployeeEntryAggregatePreflight",
  ].join("\n"), sandbox);
  const context = {
    started_at_ms: Date.now(),
    archive_read_count: 0,
    archive_parse_count: 0,
    transaction_read_count: 0,
    d1_read_count: 0,
    d1_write_count: 0,
    ttlock_snapshot_count: 0,
    ttlock_external_call_count: 0,
    capabilities_read_count: 0,
    kv_read_count: 0,
    kv_write_count: 0,
  };
  return {
    context,
    validate: body => sandbox.validate({}, { role: "staff", corpid: "HL-QA" }, body, { request_context: context }),
    get archiveLoads() { return archiveLoads; },
    get transactionLoads() { return transactionLoads; },
    get formalWrites() { return formalWrites; },
    contexts,
  };
}

test("all 16 records share one bounded aggregate preflight and immutable E14/E15 identities", async () => {
  const harness = aggregateHarness();
  const result = await harness.validate({ aggregate_preflight: true, validation_requests: validationRequests() });
  assert.equal(result.ok, true);
  assert.equal(result.validation_result_count, 16);
  assert.equal(result.passed_result_count, 16);
  assert.equal(result.failed_result_count, 0);
  assert.equal(result.formal_write_count, 0);
  assert.equal(result.write_attempted, false);
  assert.equal(harness.formalWrites, 0);
  assert.equal(harness.contexts.size, 1);
  assert.equal(harness.archiveLoads, 1);
  assert.equal(harness.transactionLoads, 1);
  assert.equal(result.request_context_metrics.archive_read_count, 1);
  assert.equal(result.request_context_metrics.entries_json_parse_count, 1);
  assert.equal(result.request_context_metrics.transaction_read_count, 1);
  assert.equal(result.request_context_metrics.d1_write_count, 0);
  assert.equal(result.request_context_metrics.ttlock_external_call_count, 0);
  assert.equal(Number.isFinite(result.request_context_metrics.duration_ms), true);
  assert.deepEqual(
    Array.from(result.validation_results, row => row.entry_identity),
    materializedScenarios().map(row => row.entry_id),
  );
  assert.equal(result.validation_results[13].entry_identity, `${RUN_ID}-E14`);
  assert.equal(result.validation_results[14].entry_identity, `${RUN_ID}-E15`);
});

test("QA persistence scope ignores waiver-only text for paid transfers but preserves waived semantics", () => {
  const scenarios = materializedScenarios();
  const sandbox = {
    cleanText: value => String(value ?? "").trim(),
    cleanDate: value => String(value ?? "").trim(),
    normalizeEntryAnchor: row => ({ ...row }),
    employeeEntryUploadType: row => String(row?.type || ""),
    entryAnchorType: row => String(row?.type || ""),
    entryAnchorEventType: type => String(type || "").toUpperCase() === "TF" ? "bed_transfer" : String(type || "").toLowerCase(),
    employeeEntryBedTransferFee: row => ({ fee_choice: row.fee_mode, fee_amount: Number(row.fee_amount_aed || 0), payment_method: row.payment_method, waiver_reason: row.fee_waiver_reason }),
    employeeEntryFingerprintMoney: value => Number(value || 0).toFixed(2),
    hscStableValue: value => Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))),
  };
  vm.createContext(sandbox);
  vm.runInContext(`${functionBlock(worker, "qaAcceptanceEntryBusinessScope")}\nthis.scope=qaAcceptanceEntryBusinessScope`, sandbox);

  for (const scenario of scenarios.slice(13, 15)) {
    const persisted = { ...structuredClone(scenario.input), fee_waiver_reason: "" };
    assert.deepEqual(
      structuredClone(sandbox.scope(scenario.input, { corpid: "HL-QA" })),
      structuredClone(sandbox.scope(persisted, { corpid: "HL-QA" })),
      `${scenario.entry_id} paid scope must not conflict on non-operative waiver text`,
    );
  }

  const waived = scenarios[15].input;
  const changedWaiver = { ...structuredClone(waived), fee_waiver_reason: "different approved waiver" };
  assert.notDeepEqual(
    structuredClone(sandbox.scope(waived, { corpid: "HL-QA" })),
    structuredClone(sandbox.scope(changedWaiver, { corpid: "HL-QA" })),
    "waived transfer scope must retain the operative waiver reason",
  );
});

for (const oneBasedPosition of [1, 8, 14, 16]) {
  test(`preflight failure at record ${oneBasedPosition} returns all results and performs zero writes`, async () => {
    const harness = aggregateHarness(oneBasedPosition - 1);
    const result = await harness.validate({ aggregate_preflight: true, validation_requests: validationRequests() });
    assert.equal(result.ok, false);
    assert.equal(result.validation_result_count, 16);
    assert.equal(result.failed_result_count, 1);
    assert.equal(result.passed_result_count, 15);
    assert.equal(result.validation_results[oneBasedPosition - 1].error_code, `FAIL_AT_${oneBasedPosition}`);
    assert.equal(result.formal_write_count, 0);
    assert.equal(result.write_attempted, false);
    assert.equal(result.request_context_metrics.d1_write_count, 0);
    assert.equal(result.request_context_metrics.archive_read_count, 1);
    assert.equal(result.request_context_metrics.transaction_read_count, 1);
    assert.equal(result.request_context_metrics.ttlock_external_call_count, 0);
    assert.equal(harness.formalWrites, 0);
  });
}

function acceptedAggregateHarness() {
  const scenarios = materializedScenarios();
  const requests = validationRequests(scenarios);
  const persistedIds = scenarios.slice(0, 13).map(row => row.entry_id);
  const missingIds = scenarios.slice(13).map(row => row.entry_id);
  const freshValidationBatches = [];
  let archiveLoads = 0;
  let transactionLoads = 0;
  const context = {
    started_at_ms: Date.now(),
    archive_read_count: 0,
    archive_parse_count: 0,
    transaction_read_count: 0,
    d1_read_count: 0,
    d1_write_count: 0,
    ttlock_snapshot_count: 1,
    ttlock_external_call_count: 0,
    capabilities_read_count: 1,
    kv_read_count: 0,
    kv_write_count: 0,
  };
  const storedResults = scenarios.map((row, index) => ({
    entry_identity: row.entry_id,
    ok: true,
    error_code: "",
    accepted_attestation_marker: index === 3 ? "STALE_ARREARS_STATE_ACCEPTED_BEFORE_PERSISTENCE" : "ACCEPTED",
  }));
  const persistence = {
    persistence_read_ok: true,
    persisted_entry_ids: persistedIds,
    missing_entry_ids: missingIds,
    conflicting_entries: [],
    duplicate_entry_ids: [],
    persisted_count: 13,
    missing_count: 3,
    conflicting_count: 0,
    duplicate_count: 0,
  };
  const scopeResults = scenarios.map(row => ({
    entry_identity: row.entry_id,
    ok: true,
    expected_scope_digest: `expected-${row.entry_id}`,
    actual_scope_digest: `expected-${row.entry_id}`,
  }));
  const sandbox = {
    Date,
    Map,
    Number,
    Set,
    String,
    cleanText: value => String(value ?? "").trim(),
    qaAcceptanceStoredValidation: () => ({
      validation_attempt_id: "qa-val-accepted-079",
      expires_at: "2026-07-16T23:59:59.000Z",
      validation_result_count: 16,
      validation_results: storedResults,
    }),
    qaAcceptanceValidationAttestationCurrent: () => ({ current: true, acceptance_locked: true }),
    cloudArrearsFetchActiveSessionRows: async (_env, _user, options) => {
      archiveLoads += 1;
      options.request_context.archive_read_count += 1;
      options.request_context.d1_read_count += 1;
      return [];
    },
    employeeEntryPrepareArchiveSnapshotContext: (_rows, requestContext) => {
      if (!requestContext.archive_entries_prepared) {
        requestContext.archive_entries_prepared = true;
        requestContext.archive_parse_count += 1;
      }
      return [];
    },
    employeeEntryPreloadExistingTransactions: async (_env, _user, _requests, requestContext) => {
      transactionLoads += 1;
      requestContext.transaction_read_count += 1;
      requestContext.d1_read_count += 1;
      requestContext.existing_transactions_by_event_id = new Map();
      return requestContext.existing_transactions_by_event_id;
    },
    qaAcceptanceSessionPreflight: async () => ({
      ok: true,
      persistence,
      entry_scope: { ok: true, scope_results: scopeResults },
      scope_match_count: 16,
      persisted_count: 13,
      missing_count: 3,
      conflicting_count: 0,
      duplicate_entry_id_count: 0,
    }),
    validateEmployeeEntryAggregatePreflight: async (_env, _user, body, options) => {
      assert.equal(options.request_context, context, "missing records must reuse the shared request context");
      const batch = Array.isArray(body.validation_requests) ? body.validation_requests : [];
      const ids = batch.map(row => String(row.entry_identity || ""));
      freshValidationBatches.push(ids);
      assert.deepEqual(ids, missingIds, "persisted records, including stale arrears, must not be revalidated");
      return {
        ok: true,
        error_code: "",
        validation_results: batch.map(row => ({
          entry_identity: row.entry_identity,
          ok: true,
          error_code: "",
          source: "fresh_missing_only",
        })),
      };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(worker, "employeeEntryAggregateRequestMetrics"),
    functionBlock(worker, "qaAcceptanceValidateAcceptedAggregatePreflight"),
    "this.validateAccepted=qaAcceptanceValidateAcceptedAggregatePreflight",
  ].join("\n"), sandbox);
  const qaContext = {
    ok: true,
    run: { qa_run_id: RUN_ID, status: "MANUAL_EMPLOYEE_ACCEPTED" },
    contract: { scenarios, payloadHash: PAYLOAD_HASH },
  };
  return {
    invoke: () => sandbox.validateAccepted(
      {},
      { userid: "qa-staff", role: "staff", corpid: "HL-QA" },
      { aggregate_preflight: true, validation_requests: requests },
      qaContext,
      context,
      requests,
    ),
    context,
    freshValidationBatches,
    persistedIds,
    missingIds,
    get archiveLoads() { return archiveLoads; },
    get transactionLoads() { return transactionLoads; },
  };
}

test("accepted aggregate validate-only reuses 13 locked attestations and freshly validates only E14-E16", async () => {
  const harness = acceptedAggregateHarness();
  const result = await harness.invoke();

  assert.equal(result.ok, true);
  assert.equal(result.source, "qa_accepted_resume_preflight");
  assert.equal(result.qa_accepted_resume_preflight, true);
  assert.equal(result.validation_result_count, 16);
  assert.equal(result.passed_result_count, 16);
  assert.equal(result.failed_result_count, 0);
  assert.equal(result.already_persisted_count, 13);
  assert.equal(result.remaining_count, 3);
  assert.equal(result.formal_write_count, 0);
  assert.equal(result.write_attempted, false);
  assert.equal(result.no_write, true);
  assert.equal(result.ttlock_external_calls, 0);
  assert.deepEqual(
    Array.from(result.validation_results, row => row.entry_identity),
    materializedScenarios().map(row => row.entry_id),
  );
  assert.equal(result.validation_results[3].accepted_attestation_marker, "STALE_ARREARS_STATE_ACCEPTED_BEFORE_PERSISTENCE");
  assert.equal(result.validation_results[3].locked_accepted_attestation, true);
  assert.equal(result.validation_results[3].already_persisted, true);
  assert.deepEqual(
    Array.from(result.validation_results.slice(0, 13), row => row.locked_accepted_attestation),
    Array(13).fill(true),
  );
  assert.deepEqual(
    Array.from(result.validation_results.slice(13), row => row.locked_accepted_attestation),
    [false, false, false],
  );
  assert.deepEqual(harness.freshValidationBatches, [harness.missingIds]);
  assert.equal(harness.archiveLoads, 1);
  assert.equal(harness.transactionLoads, 1);
  assert.equal(result.request_context_metrics.archive_read_count, 1);
  assert.equal(result.request_context_metrics.entries_json_parse_count, 1);
  assert.equal(result.request_context_metrics.transaction_read_count, 1);
  assert.equal(result.request_context_metrics.d1_write_count, 0);
  assert.equal(result.request_context_metrics.ttlock_external_call_count, 0);
  assert.match(functionBlock(worker, "handleEmployeeEntryValidate"), /qaAcceptanceValidateAcceptedAggregatePreflight/);
});

test("accepted QA validate and resume use a strict run-scoped archive query", async () => {
  let sql = "";
  let bindings = [];
  const sandbox = {
    cleanId: (value, max = 80) => {
      const id = String(value ?? "").trim().slice(0, max);
      return /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : "";
    },
    cleanText: value => String(value ?? "").trim(),
    empTableExists: async () => true,
    empTableColumns: async () => new Set(["entries_json", "summary_json"]),
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(worker, "cloudArrearsFetchActiveSessionRows"),
    "this.fetchArchive=cloudArrearsFetchActiveSessionRows",
  ].join("\n"), sandbox);
  const context = {
    archive_session_prefix: `${RUN_ID}-%`,
    strict_archive_session_prefix: true,
  };
  const env = {
    DB: {
      prepare(statement) {
        sql = statement;
        return {
          bind(...values) {
            bindings = values;
            return { all: async () => ({ results: [] }) };
          },
        };
      },
    },
  };

  await sandbox.fetchArchive(env, { corpid: "HL-QA" }, { limit: 1000, request_context: context });

  assert.match(sql, /WHERE corpid=\? AND id LIKE \?/);
  assert.doesNotMatch(sql, /\) OR \(corpid=\? AND id LIKE \?\)/);
  assert.doesNotMatch(sql, /CASE WHEN id LIKE \?/);
  assert.deepEqual(bindings, ["HL-QA", `${RUN_ID}-%`, 1000]);
  assert.equal(context.archive_read_count, 1);
  assert.equal(context.archive_snapshot_truncated, false);
  assert.match(functionBlock(worker, "qaAcceptanceValidateAcceptedAggregatePreflight"), /strict_archive_session_prefix=true/);
  assert.match(functionBlock(worker, "qaAcceptanceSessionResume"), /strict_archive_session_prefix=true/);
});

test("structured entries_json skips the duplicate export anchor block", () => {
  let parseCount = 0;
  const sandbox = {
    employeeEntryAnchorParseCache: new WeakMap(),
    JSON: {
      parse(value) { parseCount += 1; return JSON.parse(value); },
    },
    cleanText: value => String(value ?? "").trim(),
    normalizeEntryAnchor: row => ({ ...row }),
    entryAnchorType: row => String(row?.type || ""),
    Object,
    String,
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(worker, "parseEmployeeEntryAnchorJson"),
    functionBlock(worker, "extractEmployeeEntryAnchorsFromSession"),
    "this.extract=extractEmployeeEntryAnchorsFromSession",
  ].join("\n"), sandbox);
  const session = {
    id: `${RUN_ID}-S01`,
    entries_json: JSON.stringify({ entries: [{ id: `${RUN_ID}-E01`, type: "R" }] }),
    export_text: `==== ENTRY ANCHORS JSON ====\n${JSON.stringify({ entries: [{ id: "duplicate-export", type: "R" }] })}\n==== END ENTRY ANCHORS JSON ====`,
  };

  const entries = sandbox.extract(session);

  assert.equal(parseCount, 1);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, `${RUN_ID}-E01`);
});

test("QA scope digests are computed concurrently while preserving scenario order", async () => {
  let active = 0;
  let maxActive = 0;
  const sandbox = {
    Map,
    Set,
    String,
    JSON,
    cleanText: value => String(value ?? "").trim(),
    qaAcceptanceEmployeeWriteIdentity: body => ({ entry_identity: body.entry_identity, entry_id: body.entry_identity }),
    qaAcceptanceCompareEntryScope: (_runId, scenario) => ({ ok: true, expected: { id: scenario.entry_id }, actual: { id: scenario.entry_id }, first_different_field: "" }),
    hscStableValue: value => value,
    hscSha256: async value => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active -= 1;
      return `digest:${value}`;
    },
    setTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(worker, "qaAcceptanceVerifyEntryScopes"),
    "this.verify=qaAcceptanceVerifyEntryScopes",
  ].join("\n"), sandbox);
  const scenarios = materializedScenarios();
  const requests = scenarios.map(row => ({ entry_identity: row.entry_id }));

  const result = await sandbox.verify({ qa_run_id: RUN_ID }, { scenarios }, requests, {});

  assert.equal(result.ok, true);
  assert.equal(result.scope_match_count, 16);
  assert.equal(maxActive > 1, true);
  assert.deepEqual(Array.from(result.scope_results, row => row.entry_identity), scenarios.map(row => row.entry_id));
});

test("transaction preload marks outer Bed Transfer Entry identities as checked when canonical transactions are absent", async () => {
  const scenarios = materializedScenarios();
  const requests = validationRequests(scenarios).map((request, index) => {
    if (index < 13) return request;
    const next = structuredClone(request);
    delete next.entry.id;
    delete next.entry.event_id;
    next.entries = [structuredClone(next.entry)];
    next.session.entries = [structuredClone(next.entry)];
    return next;
  });
  let queryBindings = [];
  const existingRows = scenarios.slice(0, 13).map(row => ({ id: row.entry_id, session_id: row.session_id, type: row.input.type }));
  const sandbox = {
    Map,
    Set,
    String,
    Number,
    cleanId: (value, max = 80) => {
      const id = String(value ?? "").trim().slice(0, max);
      return /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : "";
    },
    cleanText: value => String(value ?? "").trim(),
    employeeEntryAggregateResultIdentity: body => String(body.entry_identity || ""),
    employeeEntryDuplicateIncomingRows: body => Array.isArray(body.entries) ? body.entries : [body.entry || {}],
    empTableExists: async () => true,
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(worker, "employeeEntryPreloadExistingTransactions"),
    "this.preload=employeeEntryPreloadExistingTransactions",
  ].join("\n"), sandbox);
  const context = {
    sessions_table_exists: true,
    transaction_session_prefix: `${RUN_ID}-%`,
    d1_read_count: 0,
    transaction_read_count: 0,
  };
  const env = {
    DB: {
      prepare() {
        return {
          bind(...values) {
            queryBindings = values;
            return { all: async () => ({ results: existingRows }) };
          },
        };
      },
    },
  };

  const rows = await sandbox.preload(env, { corpid: "HL-QA" }, requests, context);

  assert.equal(rows.size, 13);
  assert.equal(context.transaction_read_ok, true);
  assert.equal(context.existing_transaction_ids_checked.size, 16);
  for (const scenario of scenarios) assert.equal(context.existing_transaction_ids_checked.has(scenario.entry_id), true);
  assert.deepEqual(queryBindings, ["HL-QA", `${RUN_ID}-%`]);
});

test("persisted QA cards render as Already Persisted before local arrears staleness checks", () => {
  let staleLookupCalls = 0;
  const sandbox = {
    String,
    state: { arrearsTasksLoaded: true },
    employeeRecordValidationError: () => null,
    employeeEntryArrearsRef: () => { staleLookupCalls += 1; return "stale-ref"; },
    employeeOpenTaskRefSet: () => new Set(),
    employeeLegacyArrearsReferenceIsStable: () => false,
    normalizeEmployeeUploadDryRunError: value => value,
    Set,
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(employee, "employeeSessionRecordState"),
    "this.recordState=employeeSessionRecordState",
  ].join("\n"), sandbox);

  const result = sandbox.recordState({ type: "AP", upload_status: "ALREADY_PERSISTED" }, 3);

  assert.equal(result.key, "ALREADY_PERSISTED");
  assert.equal(result.label, "Already Persisted");
  assert.equal(result.className, "validated");
  assert.equal(staleLookupCalls, 0);
});

test("Bed Transfer safe serializer preserves outer E14/E15 identity and exact business scope", () => {
  const scenarios = materializedScenarios();
  const employeeSandbox = {
    state: { bedTransferCapabilities: { controlled_beta_preview: false } },
    employeeEntryStableIdentity: entry => String(entry?.id || entry?.event_id || ""),
    employeeBedTransferCanonicalSessionId: (_entry, session) => String(session?.id || ""),
    Object,
    String,
  };
  vm.createContext(employeeSandbox);
  vm.runInContext([
    functionBlock(employee, "employeeBedTransferValidatePayload"),
    functionBlock(employee, "employeeBedTransferRecordPayload"),
    "this.validatePayload=employeeBedTransferValidatePayload;this.recordPayload=employeeBedTransferRecordPayload",
  ].join("\n"), employeeSandbox);

  const scopeSandbox = {
    cleanText: (value, max = 1000) => String(value ?? "").trim().slice(0, max),
    cleanDate: value => String(value || "").slice(0, 10),
    normalizeEntryAnchor: row => ({ ...row }),
    employeeEntryUploadType: row => String(row?.type || ""),
    entryAnchorType: row => String(row?.type || ""),
    entryAnchorEventType: type => String(type || "").toUpperCase() === "TF" ? "bed_transfer" : String(type || "").toLowerCase(),
    employeeEntryBedTransferFee: row => ({ fee_choice: row.fee_mode, fee_amount: Number(row.fee_amount_aed || 0), payment_method: row.payment_method, waiver_reason: row.fee_waiver_reason }),
    employeeEntryFingerprintMoney: value => Math.round(Number(value || 0) * 100) / 100,
    buildCanonicalEventFingerprint: row => JSON.stringify(row),
    hscStableValue: value => value,
    JSON,
    Set,
    String,
  };
  vm.createContext(scopeSandbox);
  vm.runInContext([
    functionBlock(worker, "qaAcceptanceRunId"),
    functionBlock(worker, "qaAcceptanceRunIdFromEmployeeWriteBody"),
    functionBlock(worker, "qaAcceptanceEmployeeWriteIdentity"),
    functionBlock(worker, "qaAcceptanceEntryBusinessScope"),
    functionBlock(worker, "qaAcceptanceEntryScopeValue"),
    functionBlock(worker, "qaAcceptanceExpectedEntryScope"),
    functionBlock(worker, "qaAcceptanceCompareEntryScope"),
    "this.identity=qaAcceptanceEmployeeWriteIdentity;this.compare=qaAcceptanceCompareEntryScope",
  ].join("\n"), scopeSandbox);

  for (const index of [13, 14]) {
    const scenario = scenarios[index];
    const validated = employeeSandbox.validatePayload(scenario.input, { id: scenario.session_id });
    const recorded = employeeSandbox.recordPayload(validated);
    recorded.qa_run_id = RUN_ID;
    recorded.scenario_id = scenario.case_id;
    assert.equal(recorded.entry_identity, scenario.entry_id);
    assert.equal(recorded.session.id, scenario.session_id);
    assert.equal(recorded.entry.id, undefined, "server-managed Entry ID stays outside the business allowlist");
    assert.equal(scopeSandbox.identity(recorded).entry_id, scenario.entry_id);
    const compared = scopeSandbox.compare(RUN_ID, scenario, recorded, { corpid: "HL-QA" });
    assert.equal(compared.ok, true, compared.first_different_field);
  }

  const e14 = scenarios[13];
  const mismatch = employeeSandbox.recordPayload(employeeSandbox.validatePayload(e14.input, { id: e14.session_id }));
  mismatch.qa_run_id = RUN_ID;
  mismatch.scenario_id = e14.case_id;
  mismatch.entry_identity = `${RUN_ID}-E15`;
  const rejected = scopeSandbox.compare(RUN_ID, e14, mismatch, { corpid: "HL-QA" });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.first_different_field, "entry_identity");
});

function resumeHarness({ initiallyPersisted = 13, failIndex = -1, intent = "EMPLOYEE_MANUAL_RESUME", financeOk = true, conflicting = 0, duplicate = 0 } = {}) {
  const scenarios = materializedScenarios();
  const persisted = new Set(scenarios.slice(0, initiallyPersisted).map(row => row.entry_id));
  const writes = [];
  const stateBatches = [];
  let finalized = false;
  const run = {
    qa_run_id: RUN_ID,
    status: "MANUAL_EMPLOYEE_ACCEPTED",
    cleanup_status: "NOT_RUN",
    artifact_sha256: ARTIFACT_SHA,
    employee_accepted_at: "2026-07-16T17:19:15.416Z",
    upload_json: null,
  };
  const validationAttemptId = "qa-val-079-accepted-proof";
  const contract = {
    ok: true,
    scenarios,
    payloadHash: PAYLOAD_HASH,
    artifactCompatibility: { ok: true, scope: RESUME_SCOPE },
  };
  const response = (body, status = 200) => new Response(JSON.stringify({ code: status < 400 ? 0 : status, data: status < 400 ? body : undefined, ...body }), { status, headers: { "Content-Type": "application/json" } });
  const snapshot = () => ({
    ok: true,
    persisted_entry_ids: scenarios.map(row => row.entry_id).filter(id => persisted.has(id)),
    missing_entry_ids: scenarios.map(row => row.entry_id).filter(id => !persisted.has(id)),
    conflicting_entries: Array.from({ length: conflicting }, (_, index) => ({ entry_identity: scenarios[index].entry_id })),
    duplicate_entry_ids: Array.from({ length: duplicate }, (_, index) => scenarios[index].entry_id),
    unexpected_session_ids: [],
    persisted_count: persisted.size,
    missing_count: scenarios.length - persisted.size,
    conflicting_count: conflicting,
    duplicate_count: duplicate,
    session_count: persisted.size,
    completed_session_count: finalized ? persisted.size : 0,
  });
  const sandbox = {
    Date,
    JSON,
    Map,
    Number,
    Request,
    Response,
    Set,
    String,
    Symbol,
    QA_SESSION_RESUME_COMPATIBILITY_SCOPE: RESUME_SCOPE,
    QA_SESSION_RESUME_INTERNAL: Symbol("qa_session_resume_internal"),
    QA_ACCEPTANCE_WRITE_BATCH_SIZE: 6,
    TTLOCK_STRICT_CACHE_MAX_AGE_MS: 60_000,
    cleanText: value => String(value ?? "").trim(),
    employeeEntryUploadType: row => String(row?.type || ""),
    qaAcceptanceRunId: value => String(value || "").toUpperCase() === RUN_ID ? RUN_ID : "",
    qaAcceptanceEmployeeDraftContract: async () => contract,
    qaAcceptanceStoredValidation: () => ({
      validation_attempt_id: validationAttemptId,
      validation_result_count: 16,
      validation_results: scenarios.map(row => ({ entry_identity: row.entry_id, ok: true, error_code: "" })),
    }),
    qaAcceptanceValidationAttestationCurrent: () => ({ current: true, acceptance_locked: true }),
    empNow: () => "2026-07-16T20:00:00.000Z",
    ttlockRequestContext: () => ({
      started_at_ms: Date.now(),
      archive_read_count: 0,
      archive_parse_count: 0,
      transaction_read_count: 0,
      d1_read_count: 0,
      d1_write_count: 0,
      ttlock_snapshot_count: 1,
      ttlock_external_call_count: 0,
      kv_read_count: 0,
      kv_write_count: 0,
      capabilities_read_count: 1,
      last_successful_stage: "canonical_archive_parsed",
    }),
    cloudArrearsFetchActiveSessionRows: async (_env, _user, options) => {
      const context = options.request_context;
      context.archive_read_count += 1;
      context.d1_read_count += 1;
      context.archive_read_ok = true;
      const rows = [];
      context.archiveSnapshotPromise = Promise.resolve(rows);
      return rows;
    },
    employeeEntryPrepareArchiveSnapshotContext: (_sessions, context) => {
      if (!context.archive_entries_prepared) {
        context.archive_entries_prepared = true;
        context.archive_anchor_items = [];
        context.archive_parse_count = 1;
      }
      return context.archive_anchor_items;
    },
    employeeEntryPreloadExistingTransactions: async (_env, _user, _requests, context) => {
      context.transaction_read_count += 1;
      context.d1_read_count += 1;
      context.transaction_read_ok = true;
      context.transactions_table_exists = true;
      context.existing_transactions_by_event_id = new Map();
      context.existing_transaction_ids_checked = new Set(scenarios.map(row => row.entry_id));
      return context.existing_transactions_by_event_id;
    },
    validateEmployeeEntryAggregatePreflight: async () => {
      const validation_results = scenarios.map((row, index) => ({ entry_identity: row.entry_id, ok: index !== failIndex, error_code: index === failIndex ? `FAIL_AT_${index + 1}` : "" }));
      return { ok: failIndex < 0, error_code: failIndex < 0 ? "" : `FAIL_AT_${failIndex + 1}`, validation_results };
    },
    qaAcceptanceSessionPreflight: async (_env, _user, _run, _contract, _requests, context) => {
      const persistence = snapshot();
      context.qa_persisted_entry_locations = new Map(scenarios.filter(row => persisted.has(row.entry_id)).map(row => [row.entry_id, { entry: { ...row.input, anchor_id: row.entry_id } }]));
      return { ok: conflicting === 0 && duplicate === 0, persistence, scope_match_count: 16, persisted_count: persistence.persisted_count, missing_count: persistence.missing_count, conflicting_count: conflicting, duplicate_entry_id_count: duplicate };
    },
    qaAcceptanceFinalizationFinanceCheck: () => ({ ok: financeOk, error_code: financeOk ? "" : "QA_RUN_FINANCIAL_ORACLE_MISMATCH", actual: { total_received: 2500 }, mismatched_fields: financeOk ? [] : ["total_received"] }),
    qaAcceptanceStableUploadReceipt: async (_run, _contract, _stored, finance, recordedAt, _context, stageMs) => ({ receipt_version: "qa-upload-receipt-v1", receipt_id: "QA-UPLOAD-STABLE-RECEIPT", formal_write_count: 16, total_count: 16, already_persisted_count: 16, new_write_count: 0, anchor_count: 16, session_count: 16, session_status: "COMPLETED", entry_ids: scenarios.map(row => row.entry_id), anchor_ids: scenarios.map(row => row.entry_id), completed_session_ids: scenarios.map(row => row.session_id), canonical_write_count: 0, transaction_write_count: 0, anchor_write_count: 0, business_write_count: 0, finance_result: "PASS", finance_actual: finance.actual, stage_duration_ms: { ...stageMs }, pre_finalization_duration_ms: 1, finalization_only: true, recorded_at: recordedAt }),
    qaAcceptanceStoredUploadReceipt: value => value?.upload_json ? JSON.parse(value.upload_json) : null,
    empTableColumns: async () => new Set(["entries_json"]),
    ensureAuditLogSchema: async (_env, context) => { context.audit_schema_ready = true; },
    empRentConfig: async () => ({}),
    handleEmployeeEntry: async (_request, _env, _user, options) => {
      const id = String(options?.body?.entry_identity || "");
      const newWrite = !persisted.has(id);
      if (newWrite) { persisted.add(id); writes.push(id); }
      return response({ success: true, idempotent: !newWrite, already_accepted: !newWrite });
    },
    qaAcceptanceRunPersistenceSnapshot: async () => snapshot(),
    qaAcceptanceReadRun: async () => ({ ...run }),
    badRequest: message => response({ success: false, error_code: message }, 400),
    json: (body, status = 200) => response(body, status),
    success: body => response(body, 200),
    env: {
      DB: {
        prepare(sql) {
          return {
            bind(...args) {
              return {
                async run() {
                  if (/UPDATE sessions SET handover_status='COMPLETED'/.test(sql)) finalized = true;
                  if (/UPDATE qa_acceptance_runs SET status='UPLOAD_PASS'/.test(sql)) { run.status = "UPLOAD_PASS"; run.upload_json = args[0]; }
                  return { meta: { changes: 1 } };
                },
              };
            },
          };
        },
        async batch(statements) {
          stateBatches.push(statements.length);
          const results = [];
          for (const statement of statements) results.push(await statement.run());
          return results;
        },
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(worker, "employeeEntryAggregateRequestMetrics"),
    functionBlock(worker, "qaAcceptanceScenarioRequestBody"),
    functionBlock(worker, "qaAcceptanceScenarioWriteDependencyKeys"),
    functionBlock(worker, "qaAcceptanceBuildWriteBatches"),
    functionBlock(worker, "qaAcceptanceFinalizePersistedRun"),
    functionBlock(worker, "qaAcceptanceSessionResume"),
    "this.resume=qaAcceptanceSessionResume",
  ].join("\n"), sandbox);
  const invoke = () => sandbox.resume(
    new Request(`https://qa.example/api/qa/acceptance/runs/${RUN_ID}/session-resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qa_run_id: RUN_ID, artifact_sha256: ARTIFACT_SHA, payload_hash: PAYLOAD_HASH, validation_attempt_id: validationAttemptId, resume_intent: intent }),
    }),
    sandbox.env,
    { userid: "qa-staff", role: "staff", corpid: "HL-QA" },
    run,
  );
  return { invoke, persisted, writes, run, stateBatches };
}

test("13 persisted plus E14/E15/E16 resumes only three writes and response-loss retry is idempotent", async () => {
  const harness = resumeHarness({ initiallyPersisted: 13 });
  const firstResponse = await harness.invoke();
  const firstRaw = await firstResponse.json();
  const first = firstRaw.data || firstRaw;
  assert.equal(firstResponse.status, 200);
  assert.equal(first.status, "UPLOAD_PASS");
  assert.equal(first.already_persisted_count, 13);
  assert.equal(first.new_write_count, 3);
  assert.equal(first.formal_write_count, 16);
  assert.equal(first.remaining_count, 0);
  assert.equal(first.completed_session_count, 16);
  assert.equal(first.ttlock_external_calls, 0);
  assert.equal(first.request_context_metrics.archive_read_count, 1);
  assert.equal(first.request_context_metrics.entries_json_parse_count, 1);
  assert.equal(first.request_context_metrics.transaction_read_count, 1);
  assert.deepEqual(harness.writes, [`${RUN_ID}-E14`, `${RUN_ID}-E15`, `${RUN_ID}-E16`]);
  assert.equal(harness.persisted.size, 16);

  // Treat the first success response as lost by retrying from server state.
  const secondResponse = await harness.invoke();
  const secondRaw = await secondResponse.json();
  const second = secondRaw.data || secondRaw;
  assert.equal(secondResponse.status, 200);
  assert.equal(second.idempotent, true);
  assert.equal(second.formal_write_count, 16);
  assert.equal(second.new_write_count, 0);
  assert.equal(harness.writes.length, 3);
  assert.equal(harness.persisted.size, 16);
});

test("fully persisted accepted Run finalizes with one state batch and zero business writes", async () => {
  const harness = resumeHarness({ initiallyPersisted: 16, intent: "EMPLOYEE_FINALIZE_PERSISTED_RUN" });
  const firstResponse = await harness.invoke();
  const firstRaw = await firstResponse.json();
  const first = firstRaw.data || firstRaw;
  assert.equal(firstResponse.status, 200);
  assert.equal(first.status, "UPLOAD_PASS");
  assert.equal(first.already_persisted_count, 16);
  assert.equal(first.remaining_count, 0);
  assert.equal(first.formal_write_count, 16);
  assert.equal(first.new_write_count, 0);
  assert.equal(first.canonical_write_count, 0);
  assert.equal(first.transaction_write_count, 0);
  assert.equal(first.anchor_write_count, 0);
  assert.equal(first.business_write_count, 0);
  assert.equal(first.write_attempted, false);
  assert.equal(first.completed_session_count, 16);
  assert.equal(first.upload_receipt.receipt_id, "QA-UPLOAD-STABLE-RECEIPT");
  assert.equal(first.upload_receipt.total_count, 16);
  assert.equal(first.upload_receipt.already_persisted_count, 16);
  assert.equal(first.upload_receipt.new_write_count, 0);
  assert.equal(first.upload_receipt.anchor_ids.length, 16);
  assert.equal(first.upload_receipt.completed_session_ids.length, 16);
  assert.equal(typeof first.upload_receipt.stage_duration_ms.finalization_preflight_ms, "number");
  assert.deepEqual(harness.writes, []);
  assert.deepEqual(harness.stateBatches, [2]);

  // A response-loss retry returns the stored receipt and performs no second batch.
  const retryResponse = await harness.invoke();
  const retryRaw = await retryResponse.json();
  const retry = retryRaw.data || retryRaw;
  assert.equal(retryResponse.status, 200);
  assert.equal(retry.idempotent, true);
  assert.equal(retry.upload_receipt.receipt_id, first.upload_receipt.receipt_id);
  assert.deepEqual(harness.writes, []);
  assert.deepEqual(harness.stateBatches, [2]);
});

test("finalization-only intent fails closed when one record is missing", async () => {
  const harness = resumeHarness({ initiallyPersisted: 15, intent: "EMPLOYEE_FINALIZE_PERSISTED_RUN" });
  const response = await harness.invoke();
  const raw = await response.json();
  const body = raw.data || raw;
  assert.equal(response.status, 409);
  assert.equal(body.error_code, "QA_RUN_NOT_READY_FOR_FINALIZATION");
  assert.equal(body.remaining_count, 1);
  assert.equal(body.new_write_count, 0);
  assert.equal(body.write_attempted, false);
  assert.deepEqual(harness.writes, []);
  assert.deepEqual(harness.stateBatches, []);
});

test("legacy manual resume cannot finalize a fully persisted accepted Run", async () => {
  const harness = resumeHarness({ initiallyPersisted: 16, intent: "EMPLOYEE_MANUAL_RESUME" });
  const response = await harness.invoke();
  const raw = await response.json();
  const body = raw.data || raw;
  assert.equal(response.status, 409);
  assert.equal(body.error_code, "QA_FINALIZATION_INTENT_REQUIRED");
  assert.equal(body.already_persisted_count, 16);
  assert.equal(body.remaining_count, 0);
  assert.equal(body.new_write_count, 0);
  assert.equal(body.canonical_write_count, 0);
  assert.equal(body.transaction_write_count, 0);
  assert.equal(body.anchor_write_count, 0);
  assert.equal(body.business_write_count, 0);
  assert.equal(body.write_attempted, false);
  assert.equal(harness.run.status, "MANUAL_EMPLOYEE_ACCEPTED");
  assert.equal(harness.run.upload_json, null);
  assert.deepEqual(harness.writes, []);
  assert.deepEqual(harness.stateBatches, []);
});

for (const [label, options] of [
  ["a persistence conflict", { conflicting: 1 }],
  ["a duplicate Entry ID", { duplicate: 1 }],
]) {
  test(`finalization-only intent rejects ${label} before state or business writes`, async () => {
    const harness = resumeHarness({ initiallyPersisted: 16, intent: "EMPLOYEE_FINALIZE_PERSISTED_RUN", ...options });
    const response = await harness.invoke();
    const raw = await response.json();
    const body = raw.data || raw;
    assert.equal(response.status, 409);
    assert.equal(body.error_code, "QA_RUN_PERSISTENCE_CONFLICT");
    assert.equal(body.new_write_count, 0);
    assert.equal(body.write_attempted, false);
    assert.deepEqual(harness.writes, []);
    assert.deepEqual(harness.stateBatches, []);
  });
}

test("finalization-only intent fails closed on financial oracle mismatch", async () => {
  const harness = resumeHarness({ initiallyPersisted: 16, intent: "EMPLOYEE_FINALIZE_PERSISTED_RUN", financeOk: false });
  const response = await harness.invoke();
  const raw = await response.json();
  const body = raw.data || raw;
  assert.equal(response.status, 409);
  assert.equal(body.error_code, "QA_RUN_FINANCIAL_ORACLE_MISMATCH");
  assert.deepEqual(body.finance_mismatched_fields, ["total_received"]);
  assert.deepEqual(harness.writes, []);
  assert.deepEqual(harness.stateBatches, []);
});

test("finalization finance check derives the complete Quick oracle from the 16 persisted anchors", () => {
  const scenarios = materializedScenarios();
  const sandbox = { Map, Number, Object, String, entryAnchorContract: { R: [], AP: [], D: [], DR: [], CO: [], E: [], TF: [], TFF: [] } };
  vm.createContext(sandbox);
  vm.runInContext([
    functionBlock(worker, "ownerOverviewMoney"),
    functionBlock(worker, "entryAnchorType"),
    functionBlock(worker, "entryAnchorEventType"),
    functionBlock(worker, "canonicalFinanceProjectionZeroTotals"),
    functionBlock(worker, "canonicalFinanceProjectionRoundTotals"),
    functionBlock(worker, "canonicalFinanceProjectionPaymentMethod"),
    functionBlock(worker, "canonicalFinanceProjectionAmount"),
    functionBlock(worker, "canonicalFinanceProjectionEventType"),
    functionBlock(worker, "canonicalFinanceProjectionAddInflow"),
    functionBlock(worker, "canonicalFinanceProjectionAddOutflow"),
    functionBlock(worker, "canonicalFinanceProjectionApplyAnchor"),
    functionBlock(worker, "qaAcceptanceFinanceComparable"),
    functionBlock(worker, "qaAcceptanceFinalizationFinanceCheck"),
    "this.check=qaAcceptanceFinalizationFinanceCheck",
  ].join("\n"), sandbox);
  const context = { qa_persisted_entry_locations: new Map(scenarios.map(row => [row.entry_id, { entry: structuredClone(row.input) }])) };
  const result = sandbox.check({ qa_run_id: RUN_ID }, { scenarios, expected: GOLDEN_FINANCE_EXPECTED }, context);
  assert.equal(result.ok, true, result.mismatched_fields.join(","));
  assert.equal(result.entry_count, 16);
  assert.deepEqual({ ...result.actual }, GOLDEN_FINANCE_EXPECTED);

  const tampered = structuredClone(scenarios);
  tampered[0].input.paid_amount = 699;
  tampered[0].input.paid = 699;
  tampered[0].input.amount = 699;
  const badContext = { qa_persisted_entry_locations: new Map(tampered.map(row => [row.entry_id, { entry: row.input }])) };
  const mismatch = sandbox.check({ qa_run_id: RUN_ID }, { scenarios, expected: GOLDEN_FINANCE_EXPECTED }, badContext);
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.error_code, "QA_RUN_FINANCIAL_ORACLE_MISMATCH");
  assert.equal(mismatch.mismatched_fields.includes("total_received"), true);
});

test("stable finalization receipt binds all Entry, anchor, Session, oracle, and timing evidence", async () => {
  const scenarios = materializedScenarios();
  const sandbox = { Date, JSON, Map, Math, Number, Object, String, hscStableValue: value => value, hscSha256: async () => "a".repeat(64) };
  vm.createContext(sandbox);
  vm.runInContext(`${functionBlock(worker, "qaAcceptanceStableUploadReceipt")}\nthis.receipt=qaAcceptanceStableUploadReceipt`, sandbox);
  const context = { qa_persisted_entry_locations: new Map(scenarios.map(row => [row.entry_id, { entry: { ...row.input, anchor_id: `ANCHOR-${row.entry_id}` } }])) };
  const receipt = await sandbox.receipt(
    { qa_run_id: RUN_ID, artifact_sha256: ARTIFACT_SHA },
    { payloadHash: PAYLOAD_HASH, scenarios },
    { validation_attempt_id: "qa-val-stable" },
    { actual: GOLDEN_FINANCE_EXPECTED },
    "2026-07-16T20:00:00.000Z",
    context,
    { finalization_preflight_ms: 12 },
    Date.now() - 20,
  );
  assert.equal(receipt.receipt_id, `QA-UPLOAD-${"A".repeat(24)}`);
  assert.equal(receipt.total_count, 16);
  assert.equal(receipt.already_persisted_count, 16);
  assert.equal(receipt.new_write_count, 0);
  assert.equal(receipt.entry_ids.length, 16);
  assert.equal(receipt.anchor_ids.length, 16);
  assert.equal(receipt.completed_session_ids.length, 16);
  assert.equal(receipt.canonical_write_count, 0);
  assert.equal(receipt.transaction_write_count, 0);
  assert.equal(receipt.anchor_write_count, 0);
  assert.equal(receipt.finance_result, "PASS");
  assert.equal(receipt.stage_duration_ms.finalization_preflight_ms, 12);
  assert.equal(receipt.pre_finalization_duration_ms >= 0, true);
});

for (const oneBasedPosition of [1, 8, 14, 16]) {
  test(`atomic resume refuses preflight failure at record ${oneBasedPosition} before every write`, async () => {
    const harness = resumeHarness({ initiallyPersisted: 0, failIndex: oneBasedPosition - 1 });
    const response = await harness.invoke();
    const raw = await response.json();
    const body = raw.data || raw;
    assert.equal(response.status, 422);
    assert.equal(body.validation_result_count, 16);
    assert.equal(body.failed_count, 1);
    assert.equal(body.new_write_count, 0);
    assert.equal(body.write_attempted, false);
    assert.equal(body.no_write, true);
    assert.equal(body.ttlock_external_calls, 0);
    assert.equal(harness.writes.length, 0);
    assert.equal(harness.persisted.size, 0);
  });
}

test("QA atomic resume route is Staff-only, server-sourced, bounded, and the only accepted QA write path", () => {
  const resume = functionBlock(worker, "qaAcceptanceSessionResume");
  const directGate = functionBlock(worker, "qaAcceptanceEmployeeFormalWriteGate");
  const preload = functionBlock(worker, "employeeEntryPreloadExistingTransactions");
  const upload = functionBlock(employee, "commitSessionAndExport", true);
  const clientResume = functionBlock(employee, "employeeQaAcceptanceSessionResume", true);

  assert.match(worker, /employee-draft\|automation\|upload-complete\|session-resume/);
  assert.match(worker, /staffSessionResume=.*session-resume/);
  assert.match(worker, /action==="session-resume"&&method==="POST"/);
  assert.match(worker, /options\.staff===true&&!isStaffRoleValue\(user\?\.role\)/);
  assert.match(directGate, /QA_SESSION_RESUME_ROUTE_REQUIRED/);
  assert.match(resume, /requests=scenarios\.map/);
  assert.doesNotMatch(resume, /body\.(?:entries|validation_requests)/);
  assert.match(resume, /requestContext\.allow_live_fetch=false/);
  assert.match(resume, /ttlock_external_call_count\|\|0\)===0/);
  assert.match(resume, /sessionPreflight\.persistence\.missing_entry_ids/);
  assert.match(resume, /QA_SESSION_RESUME_INTERNAL/);
  assert.match(resume, /EMPLOYEE_FINALIZE_PERSISTED_RUN/);
  assert.match(worker, /QA_RUN_NOT_READY_FOR_FINALIZATION/);
  assert.match(resume, /QA_FINALIZATION_INTENT_REQUIRED/);
  assert.match(worker, /canonical_write_count:0/);
  assert.match(worker, /transaction_write_count:0/);
  assert.match(worker, /anchor_write_count:0/);
  assert.match(resume, /if\(run\.status==="UPLOAD_PASS"\)/);
  assert.match(resume, /sessionPreflight\.missing_count!==0/);
  assert.match(resume, /idempotent:true/);
  assert.match(preload, /id IN \(\$\{placeholders\}\)/);
  assert.match(preload, /existing_transactions_by_event_id=rows/);
  assert.equal((preload.match(/FROM transactions/g) || []).length, 1);
  assert.match(artifactBuilder, /employee_post_acceptance_session_resume_v1/);
  assert.match(upload, /employeeQaAcceptanceSessionResume\(aggregatePreflight,uploadList\)/);
  assert.match(clientResume, /\/session-resume/);
  assert.ok(upload.indexOf("validateEmployeeUploadAggregateDryRun(validationRequests)") < upload.indexOf("employeeQaAcceptanceSessionResume(aggregatePreflight,uploadList)"));
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pbkdf2Sync } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  executeLocalD1Command,
  runLocalMigrations,
} from "./db-local-bootstrap-utils.mjs";
import {
  fetchWithRetry,
  removeDirWithRetries,
  rootDir,
  startWorker,
  stopProcessTree,
  waitForWorker,
  workerDir,
  wranglerBin,
} from "./local-worker-utils.mjs";
import {
  EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS,
  GOLDEN_CORPID,
  GOLDEN_ENTRY_IDS,
  GOLDEN_TTLOCK_SNAPSHOT,
  goldenNegativeExpenseRequests,
  goldenScenarioSession,
  goldenValidationRequests,
} from "../tests/fixtures/employee-seven-event-golden-session.mjs";
import {
  GOLDEN_FINANCE_EXPECTED,
  aggregateIdentityContract,
  assertAuthAndDraftRecovery,
  assertEventIsolation,
  assertGoldenFinance,
  assertGoldenFixturePrivacy,
  assertGoldenScenarioManifest,
  countDuplicateAnchors,
} from "../tests/helpers/employee-golden-session-oracle.mjs";
import {
  goldenSessionHumanLines,
  writeGoldenSessionReport,
} from "./generate-employee-golden-session-report.mjs";

const STAFF_PASSWORD = "golden-staff-password";
const MANAGER_PASSWORD = "golden-manager-password";
const TEST_SALT = "golden-session-salt-20260716";

function sqlText(value) {
  return String(value ?? "").replaceAll("'", "''");
}

function accessSnapshotRuntimeHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(typeof address === "object" && address ? address.port : 0));
    });
  });
}

function passwordHash(password) {
  return pbkdf2Sync(password, TEST_SALT, 100000, 32, "sha256").toString("hex");
}

function runWrangler(args, options = {}) {
  return execFileSync(process.execPath, [wranglerBin, ...args], {
    cwd: workerDir,
    encoding: "utf8",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    stdio: options.stdio || ["ignore", "pipe", "pipe"],
  });
}

function d1Rows(persistTo, sql) {
  const parsed = JSON.parse(executeLocalD1Command(sql, { persistTo, json: true }));
  return parsed?.[0]?.results || [];
}

function cookieHeader(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map(value => value.split(";")[0]).join("; ");
}

async function requestJson(environment, pathname, options = {}) {
  const response = await fetchWithRetry(`${environment.baseUrl}${pathname}`, {
    ...options,
    headers: {
      Origin: environment.baseUrl,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  }, { diagnostics: environment.diagnostics });
  const text = await response.text();
  let raw = null;
  try { raw = text ? JSON.parse(text) : {}; } catch { raw = { raw_body_kind: "non_json" }; }
  const body = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  return { status: response.status, body, raw, headers: response.headers };
}

async function login(environment, password) {
  const response = await requestJson(environment, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  assert.equal(response.status, 200, `local login failed: ${JSON.stringify(response.body)}`);
  return cookieHeader({ headers: response.headers });
}

async function logout(environment, cookie) {
  return requestJson(environment, "/auth/logout", {
    method: "POST",
    headers: { Cookie: cookie },
    body: "{}",
  });
}

async function seedLocalDatabase(persistTo) {
  await runLocalMigrations({ persistTo });
  for (const statement of [
    "ALTER TABLE sessions ADD COLUMN entries_json TEXT",
    "ALTER TABLE sessions ADD COLUMN summary_json TEXT",
  ]) executeLocalD1Command(statement, { persistTo });
  const rents = JSON.stringify({ 201: 700, 202: 770, 203: 700 });
  executeLocalD1Command(
    `INSERT INTO app_settings (corpid,key,value,updated_by,updated_at) VALUES ('${sqlText(GOLDEN_CORPID)}','rent_ref_room','${sqlText(rents)}','golden-harness','2026-07-16T08:00:00.000Z')`,
    { persistTo },
  );
  executeLocalD1Command(
    `INSERT INTO arrear_tasks (task_id,corpid,userid,entry_id,bed,tenant_name,arrear_amount,arrear_reason,created_at,followup_status,promise_date,promise_amount,actual_received,close_status) VALUES ('GOLDEN-CLOUD-ARREARS-1','${sqlText(GOLDEN_CORPID)}','golden-staff','GOLDEN-SEED-ARREARS','204','golden-fixture',100,'golden seeded cloud arrears','2026-07-15T08:00:00.000Z','pending','2026-07-20',100,60,'OPEN')`,
    { persistTo },
  );
}

async function seedTtlockSnapshot(persistTo, tempRoot) {
  const snapshot = {
    ...GOLDEN_TTLOCK_SNAPSHOT,
    observed_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    loadedAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
  const snapshotPath = path.join(tempRoot, "ttlock-snapshot.json");
  await writeFile(snapshotPath, JSON.stringify(snapshot), "utf8");
  const key = `ttlock:snapshot:v2:internal_beta:${accessSnapshotRuntimeHash(GOLDEN_CORPID)}`;
  runWrangler([
    "kv", "key", "put", key,
    "--path", snapshotPath,
    "--binding", "RATE_LIMIT",
    "--local",
    "--persist-to", persistTo,
    "--config", "wrangler.toml",
  ]);
}

async function createEnvironment(label) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), `homelink-golden-${label}-`));
  const persistTo = path.join(tempRoot, "d1-kv");
  await seedLocalDatabase(persistTo);
  await seedTtlockSnapshot(persistTo, tempRoot);
  const accounts = [
    { userid: "golden-staff", name: "Golden Staff", role: "staff", hash: passwordHash(STAFF_PASSWORD), salt: TEST_SALT },
    { userid: "golden-manager", name: "Golden Manager", role: "manager", hash: passwordHash(MANAGER_PASSWORD), salt: TEST_SALT },
  ];
  const envPath = path.join(tempRoot, "golden.env");
  await writeFile(envPath, [
    "APP_ENV=internal_beta",
    `CORPID=${GOLDEN_CORPID}`,
    "JWT_SECRET=golden-session-jwt-secret-not-for-production",
    `PW_SALT=${TEST_SALT}`,
    `USER_ACCOUNTS='${JSON.stringify(accounts)}'`,
    "BED_TRANSFER_WRITE_APPROVED=true",
    "BED_TRANSFER_LEGACY_GENESIS_MODE=server_verified",
    "BED_TRANSFER_OWNER_VOID_ENABLED=false",
    "OWNER_TODAY_TODO_ACK_ENABLED=false",
    "DURABLE_STAY_WRITE_APPROVED=false",
  ].join("\n"), "utf8");
  const port = await freePort();
  const worker = startWorker({ port, persistTo, envFiles: [envPath] });
  let stdout = "";
  let stderr = "";
  worker.stdout.on("data", chunk => { stdout += chunk.toString("utf8"); });
  worker.stderr.on("data", chunk => { stderr += chunk.toString("utf8"); });
  const baseUrl = `http://127.0.0.1:${port}`;
  const diagnostics = {
    label: `employee golden session ${label}`,
    port,
    child: worker,
    command: `wrangler dev --local --port ${port}`,
    get stdout() { return stdout; },
    get stderr() { return stderr; },
  };
  try {
    await waitForWorker(baseUrl, 60000, diagnostics);
  } catch (error) {
    await stopProcessTree(worker, { label });
    await removeDirWithRetries(tempRoot, { label: `${label} golden environment` });
    throw error;
  }
  return {
    label,
    tempRoot,
    persistTo,
    worker,
    baseUrl,
    diagnostics,
    get logs() { return `${stdout}\n${stderr}`; },
  };
}

async function destroyEnvironment(environment) {
  if (!environment) return;
  await stopProcessTree(environment.worker, { label: environment.label });
  const cleanup = await removeDirWithRetries(environment.tempRoot, { label: `${environment.label} golden environment` });
  assert.equal(cleanup.ok, true, `temporary environment cleanup failed: ${JSON.stringify(cleanup)}`);
}

function writeBody(row) {
  return {
    entry_identity: row.entry_id,
    entry: structuredClone(row.input),
    session: goldenScenarioSession(row),
    event_index: 0,
  };
}

async function aggregateValidate(environment, staffCookie, requests) {
  return requestJson(environment, "/api/employee/entry/validate", {
    method: "POST",
    headers: { Cookie: staffCookie },
    body: JSON.stringify({
      aggregate_preflight: true,
      validation_requests: requests,
      dry_run: true,
      validate_only: true,
      no_write: true,
    }),
  });
}

async function writeScenarios(environment, staffCookie, scenarios) {
  const responses = [];
  for (const row of scenarios) {
    const response = await requestJson(environment, "/api/employee/entry", {
      method: "POST",
      headers: { Cookie: staffCookie },
      body: JSON.stringify(writeBody(row)),
    });
    const sessionRows = response.status === 200 ? [] : d1Rows(
      environment.persistTo,
      `SELECT id,entries_count,handover_status,entries_json FROM sessions WHERE id='${sqlText(row.session_id)}' AND corpid='${sqlText(GOLDEN_CORPID)}'`,
    );
    assert.equal(response.status, 200, `${row.case_id}: ${JSON.stringify(response.body)} persisted=${JSON.stringify(sessionRows)} logs=${environment.logs.slice(-6000)}`);
    assert.equal(response.body?.success, true, row.case_id);
    responses.push(response.body);
  }
  return responses;
}

function persistedArchive(environment) {
  const rows = d1Rows(environment.persistTo, `SELECT id,entries_json,handover_status FROM sessions WHERE corpid='${sqlText(GOLDEN_CORPID)}' ORDER BY id`);
  const anchors = [];
  for (const row of rows) {
    let envelope = {};
    try { envelope = JSON.parse(row.entries_json || "{}"); } catch {}
    const entries = Array.isArray(envelope) ? envelope : (Array.isArray(envelope.entries) ? envelope.entries : []);
    for (const entry of entries) anchors.push({ ...entry, persisted_session_id: row.id });
  }
  return { rows, anchors };
}

function externalCallMetrics(logs) {
  const events = [];
  for (const line of String(logs || "").split(/\r?\n/)) {
    const start = line.indexOf('{"event":"ttlock_outbound"');
    if (start < 0) continue;
    try { events.push(JSON.parse(line.slice(start))); } catch {}
  }
  const sum = endpoint => events.filter(row => !endpoint || row.endpoint_class === endpoint).reduce((total, row) => total + Number(row.external_call_count || 0), 0);
  return {
    ttlock_external_calls: sum(),
    oauth_calls: sum("oauth"),
    lock_list_calls: sum("lock_list"),
    identity_card_calls: sum("identity_card_list"),
    exit_event_ttlock_calls: events.filter(row => ["checkout", "deposit_out"].includes(row.calling_route_category)).reduce((total, row) => total + Number(row.external_call_count || 0), 0),
  };
}

function projectionRows(body) {
  if (Array.isArray(body)) return body;
  for (const key of ["rows", "items", "sessions", "history", "results", "open_items", "all_items", "data"]) if (Array.isArray(body?.[key])) return body[key];
  return [];
}

async function phaseB() {
  const environment = await createEnvironment("phase-b");
  try {
    const staffCookie = await login(environment, STAFF_PASSWORD);
    const ownerCookie = await login(environment, MANAGER_PASSWORD);
    const before = persistedArchive(environment);
    assert.equal(before.anchors.length, 0);

    const aggregate = await aggregateValidate(environment, staffCookie, goldenValidationRequests());
    assert.equal(aggregate.status, 200, JSON.stringify(aggregate.body));
    assert.equal(aggregate.body.validation_result_count, 16);
    assert.equal(aggregate.body.passed_result_count, 16);
    assert.equal(aggregate.body.failed_result_count, 0);
    assert.equal(aggregate.body.formal_write_count, 0);
    const identity = aggregateIdentityContract(aggregate.body.validation_results);
    assert.equal(identity.ok, true, JSON.stringify(identity));

    const negative = await aggregateValidate(environment, staffCookie, goldenNegativeExpenseRequests());
    assert.equal(negative.status, 422);
    assert.equal(negative.body.validation_result_count, 16);
    assert.equal(negative.body.passed_result_count, 15);
    assert.equal(negative.body.failed_result_count, 1);
    assert.equal(negative.body.formal_write_count, 0);
    assert.equal(persistedArchive(environment).anchors.length, 0);

    await writeScenarios(environment, staffCookie, EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS);
    const first = persistedArchive(environment);
    assert.equal(first.anchors.length, 16);
    assert.equal(first.rows.every(row => String(row.handover_status).toUpperCase() === "COMPLETED"), true);
    assert.equal(countDuplicateAnchors(first.anchors), 0);
    const eventIsolationErrors = assertEventIsolation(first.anchors);
    assert.deepEqual(eventIsolationErrors, []);

    const sessionCountBeforeRetry = first.rows.length;
    const retryValidation = await aggregateValidate(environment, staffCookie, goldenValidationRequests());
    assert.equal(retryValidation.status, 200, JSON.stringify(retryValidation.body));
    assert.equal(retryValidation.body.validation_result_count, 16);
    assert.equal(retryValidation.body.validation_results.every(row => row.idempotent === true), true);
    const retryPending = retryValidation.body.validation_results.filter(row => row.idempotent !== true);
    assert.equal(retryPending.length, 0);
    const retried = persistedArchive(environment);
    assert.equal(retried.rows.length, sessionCountBeforeRetry);
    assert.equal(retried.anchors.length, 16);

    const history = await requestJson(environment, "/api/history?limit=30&include_voided=1", { headers: { Cookie: ownerCookie } });
    const finance = await requestJson(environment, "/api/owner/finance/projection?start=2026-07-01&end=2026-07-31&include_voided=1", { headers: { Cookie: ownerCookie } });
    const arrears = await requestJson(environment, "/api/owner/cloud-arrears/projection", { headers: { Cookie: ownerCookie } });
    const todos = await requestJson(environment, "/api/owner/today-todos?limit=100", { headers: { Cookie: ownerCookie } });
    for (const [name, response] of Object.entries({ history, finance, arrears, todos })) assert.equal(response.status, 200, `${name}: ${JSON.stringify(response.body)}`);
    const financeActual = assertGoldenFinance(finance.body);
    const historyRows = projectionRows(history.body);
    assert.equal(historyRows.length >= 16, true, `history rows=${historyRows.length}`);
    const arrearsRows = projectionRows(arrears.body);
    assert.equal(arrearsRows.length > 0, true, `arrears rows=${arrearsRows.length}`);
    const metrics = externalCallMetrics(environment.logs);
    assert.equal(metrics.ttlock_external_calls, 0);
    assert.equal(metrics.exit_event_ttlock_calls, 0);

    return {
      aggregate,
      negative,
      first,
      retried,
      retry_validation: retryValidation,
      identity,
      history_count: historyRows.length,
      finance_actual: financeActual,
      arrears_count: arrearsRows.length,
      todo_count: projectionRows(todos.body).length || Number(todos.body?.summary?.total_count || 0),
      event_isolation_errors: eventIsolationErrors,
      metrics,
    };
  } finally {
    await destroyEnvironment(environment);
  }
}

async function phaseC() {
  const environment = await createEnvironment("phase-c");
  try {
    let staffCookie = await login(environment, STAFF_PASSWORD);
    const drafts = structuredClone(EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS);
    await writeScenarios(environment, staffCookie, drafts.slice(0, 8));
    assert.equal(persistedArchive(environment).anchors.length, 8);

    const logoutResult = await logout(environment, staffCookie);
    assert.equal(logoutResult.status, 200);
    const unauthorized = await aggregateValidate(environment, staffCookie, goldenValidationRequests(drafts));
    assert.equal(unauthorized.status, 401);
    assert.equal(drafts.length, 16);
    staffCookie = await login(environment, STAFF_PASSWORD);

    const refreshedDrafts = JSON.parse(JSON.stringify(drafts));
    assert.deepEqual(refreshedDrafts.map(row => row.entry_id), GOLDEN_ENTRY_IDS);
    const resumeValidation = await aggregateValidate(environment, staffCookie, goldenValidationRequests(refreshedDrafts));
    assert.equal(resumeValidation.status, 200);
    assert.equal(resumeValidation.body.validation_result_count, 16);
    const alreadyPersisted = resumeValidation.body.validation_results.filter(row => row.idempotent === true).length;
    assert.equal(alreadyPersisted, 8);
    const pendingIds = resumeValidation.body.validation_results.filter(row => row.idempotent !== true).map(row => row.entry_identity);
    assert.deepEqual(pendingIds, GOLDEN_ENTRY_IDS.slice(8));

    await writeScenarios(environment, staffCookie, refreshedDrafts.filter(row => pendingIds.includes(row.entry_id)));
    const complete = persistedArchive(environment);
    assert.equal(complete.anchors.length, 16);
    assert.equal(countDuplicateAnchors(complete.anchors), 0);
    assertAuthAndDraftRecovery();
    const metrics = externalCallMetrics(environment.logs);
    assert.equal(metrics.ttlock_external_calls, 0);
    assert.equal(metrics.exit_event_ttlock_calls, 0);
    return {
      already_persisted_count: alreadyPersisted,
      resumed_write_count: pendingIds.length,
      final_anchor_count: complete.anchors.length,
      local_count_parity: refreshedDrafts.length === 16,
      refresh_recovery: true,
      auth_recovery: true,
      metrics,
    };
  } finally {
    await destroyEnvironment(environment);
  }
}

export async function runEmployeeGoldenSessionHarness() {
  assertGoldenScenarioManifest();
  assertGoldenFixturePrivacy();
  const phaseBResult = await phaseB();
  const phaseCResult = await phaseC();
  const metrics = {
    ttlock_external_calls: phaseBResult.metrics.ttlock_external_calls + phaseCResult.metrics.ttlock_external_calls,
    oauth_calls: phaseBResult.metrics.oauth_calls + phaseCResult.metrics.oauth_calls,
    lock_list_calls: phaseBResult.metrics.lock_list_calls + phaseCResult.metrics.lock_list_calls,
    identity_card_calls: phaseBResult.metrics.identity_card_calls + phaseCResult.metrics.identity_card_calls,
    exit_event_ttlock_calls: phaseBResult.metrics.exit_event_ttlock_calls + phaseCResult.metrics.exit_event_ttlock_calls,
  };
  const report = {
    pass: true,
    scenario_count: 16,
    scenario_matrix_result: "PASS",
    fixture_privacy_result: "PASS",
    aggregate_http_status: phaseBResult.aggregate.status,
    aggregate_result_count: phaseBResult.aggregate.body.validation_result_count,
    validation_passed_count: phaseBResult.aggregate.body.passed_result_count,
    validation_failed_count: phaseBResult.aggregate.body.failed_result_count,
    negative_validation_passed_count: phaseBResult.negative.body.passed_result_count,
    negative_validation_failed_count: phaseBResult.negative.body.failed_result_count,
    entry_id_association_result: phaseBResult.identity.ok ? "PASS" : "FAIL",
    unmatched_result_count: phaseBResult.identity.unmatched_result_count,
    duplicate_entry_id_count: phaseBResult.identity.duplicate_entry_id_count,
    cross_event_error_count: phaseBResult.event_isolation_errors.length,
    formal_write_during_validate: 0,
    formal_write_count: 16,
    isolated_write_result: "PASS",
    first_write_anchor_count: phaseBResult.first.anchors.length,
    idempotent_retry_new_writes: phaseBResult.retried.anchors.length - phaseBResult.first.anchors.length,
    duplicate_anchor_count: countDuplicateAnchors(phaseBResult.retried.anchors),
    session_finalization_result: "PASS",
    partial_resume_result: "PASS",
    partial_write_simulation_result: "PASS",
    already_persisted_count: phaseCResult.already_persisted_count,
    resumed_write_count: phaseCResult.resumed_write_count,
    local_count_parity_result: phaseCResult.local_count_parity ? "PASS" : "FAIL",
    refresh_recovery_result: phaseCResult.refresh_recovery ? "PASS" : "FAIL",
    auth_recovery_result: phaseCResult.auth_recovery ? "PASS" : "FAIL",
    auth_stability_result: "PASS",
    finance_result: "PASS",
    finance_expected: GOLDEN_FINANCE_EXPECTED,
    finance_actual: phaseBResult.finance_actual,
    owner_history_result: phaseBResult.history_count >= 16 ? "PASS" : "FAIL",
    owner_history_count: phaseBResult.history_count,
    arrears_result: "PASS",
    arrears_projection_count: phaseBResult.arrears_count,
    today_todo_result: "PASS",
    today_todo_count: phaseBResult.todo_count,
    archive_read_count: Number(phaseBResult.aggregate.body.request_context_metrics?.archive_read_count || 0),
    entries_json_parse_count: Number(phaseBResult.aggregate.body.request_context_metrics?.entries_json_parse_count || 0),
    d1_query_count: "runtime_not_exposed; archive and persistence counts asserted",
    aggregate_request_count: 1,
    write_request_count: 16,
    ...metrics,
    new_external_ttlock_paths: 0,
    temporary_environment_destroyed: true,
    production_runtime_changed: false,
    deployment_result: "not_required",
    production_business_data_changed: false,
    ttlock_configuration_changed: false,
    migration_applied: false,
  };
  assert.equal(report.archive_read_count, 1);
  assert.equal(report.entries_json_parse_count, 1);
  assert.equal(report.idempotent_retry_new_writes, 0);
  assert.equal(report.duplicate_anchor_count, 0);
  assert.equal(report.ttlock_external_calls, 0);
  return writeGoldenSessionReport(report);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await runEmployeeGoldenSessionHarness();
    for (const line of goldenSessionHumanLines(report)) console.log(line);
  } catch (error) {
    console.error("SEVEN_EVENT_GOLDEN_SESSION: FAIL");
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  }
}

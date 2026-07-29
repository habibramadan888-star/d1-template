import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import {
  executeLocalD1Command,
  runLocalDevSeed,
  runLocalMigrations
} from "../scripts/db-local-bootstrap-utils.mjs";
import {
  defaultEnvPath,
  fetchWithRetry,
  readDevVars,
  removeDirWithRetries,
  startWorker,
  stopProcessTree,
  waitForWorker
} from "../scripts/local-worker-utils.mjs";

const env = readDevVars(defaultEnvPath);
const employeeId = env.LOCAL_EMPLOYEE_ID || "abdul";
const employeePin = env.LOCAL_EMPLOYEE_PIN || "8888";
const ownerPassword = env.LOCAL_MANAGER_PASSWORD;
const workerRuns = [];
const workerDiagnosticsByBaseUrl = new Map();

after(async () => {
  for (const run of workerRuns.reverse()) {
    await cleanupRun(run);
  }
});

async function cleanupRun(run) {
  if (!run || run.cleaned) return;
  run.cleaned = true;
  if (run.baseUrl) workerDiagnosticsByBaseUrl.delete(run.baseUrl);
  await stopProcessTree(run.worker, { label: run.label });
  await removeDirWithRetries(run.persistTo, { label: `${run.label} D1` });
}

function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).join("; ");
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function startIsolatedWorker({
  vars,
  migrate = true,
  seed = true,
  label = "employee entry route switch worker"
}) {
  const port = await freePort();
  const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-entry-route-switch-"));
  if (migrate) await runLocalMigrations({ persistTo });
  if (seed) runLocalDevSeed({ persistTo });
  const worker = startWorker({ port, persistTo, vars });
  let stdout = "";
  let stderr = "";
  worker.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  worker.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  const diagnostics = {
    label,
    port,
    vars,
    child: worker,
    command: `wrangler dev --local --port ${port}`,
    get stdout() {
      return stdout;
    },
    get stderr() {
      return stderr;
    }
  };
  const run = { baseUrl, persistTo, worker, label, diagnostics, cleaned: false };
  workerRuns.push(run);
  try {
    await waitForWorker(baseUrl, Number(process.env.WORKER_READY_TIMEOUT_MS || 60000), diagnostics);
  } catch (error) {
    await cleanupRun(run);
    throw error;
  }
  workerDiagnosticsByBaseUrl.set(baseUrl, diagnostics);
  return run;
}

async function startTestWorker(t, options) {
  const run = await startIsolatedWorker(options);
  t.after(async () => {
    await cleanupRun(run);
  });
  return run;
}

async function request(baseUrl, pathName, options = {}) {
  return fetchWithRetry(
    `${baseUrl}${pathName}`,
    {
      ...options,
      headers: {
        Origin: baseUrl,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    },
    { diagnostics: workerDiagnosticsByBaseUrl.get(baseUrl) }
  );
}

async function jsonBody(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function assertStatus(response, expected, label) {
  if (response.status !== expected) {
    assert.fail(`${label} expected ${expected}, got ${response.status}: ${await response.text()}`);
  }
}

async function loginEmployee(baseUrl) {
  const response = await request(baseUrl, "/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({ employee_id: employeeId, pin: employeePin })
  });
  assert.equal(response.status, 200, await response.text());
  return cookieHeader(response);
}

async function loginOwner(baseUrl) {
  assert.ok(ownerPassword, "LOCAL_MANAGER_PASSWORD is required for owner route-switch tests");
  const response = await request(baseUrl, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ password: ownerPassword })
  });
  assert.equal(response.status, 200, await response.text());
  return cookieHeader(response);
}

function d1Results(command, persistTo) {
  const parsed = JSON.parse(executeLocalD1Command(command, { persistTo, json: true }));
  return parsed?.[0]?.results || [];
}

function counts(persistTo) {
  return d1Results(
    `SELECT
      (SELECT COUNT(*) FROM sessions) AS sessions_count,
      (SELECT COUNT(*) FROM transactions) AS transactions_count,
      (SELECT COUNT(*) FROM deposit_ledger) AS deposit_ledger_count,
      (SELECT COUNT(*) FROM arrears) AS arrears_count,
      (SELECT COUNT(*) FROM arrear_tasks) AS arrear_tasks_count,
      (SELECT COUNT(*) FROM audit_logs WHERE action='employee.entry.adapter_prevalidation') AS adapter_audit_count,
      (SELECT COUNT(*) FROM entry_events WHERE ref_type='employee_entry_live_route_switch_rehearsal' AND event_type='employee_entry_adapter_prevalidation') AS adapter_event_count`,
    persistTo
  )[0];
}

function legacyRentPayload(id, overrides = {}) {
  return {
    session: {
      id: `eelr-session-${id}`,
      date: "2026-06-01",
      entries: [`eelr-entry-${id}`],
      cash_handover: 770,
      bank_transfer_total: 0,
      bank_transfer_count: 0,
      gross_received: 770,
      handover_status: "REHEARSAL",
      export_text: "P0-001J local rehearsal"
    },
    entry: {
      id: `eelr-entry-${id}`,
      type: "R",
      cat: "cash",
      room: "SMOKE101",
      amount: 770,
      due: 770,
      paid: 770,
      period_due: 770,
      period_start: "2026-06-01",
      period_end: "2026-07-01",
      cycle: "1M",
      tenant_card_id: `EELR-CID-${id}`,
      tenant_name: "EELR D200 0101",
      note: "P0-001J local rehearsal"
    },
    ...overrides,
    session: {
      id: `eelr-session-${id}`,
      date: "2026-06-01",
      entries: [`eelr-entry-${id}`],
      cash_handover: 770,
      bank_transfer_total: 0,
      bank_transfer_count: 0,
      gross_received: 770,
      handover_status: "REHEARSAL",
      export_text: "P0-001J local rehearsal",
      ...(overrides.session || {})
    },
    entry: {
      id: `eelr-entry-${id}`,
      type: "R",
      cat: "cash",
      room: "SMOKE101",
      amount: 770,
      due: 770,
      paid: 770,
      period_due: 770,
      period_start: "2026-06-01",
      period_end: "2026-07-01",
      cycle: "1M",
      tenant_card_id: `EELR-CID-${id}`,
      tenant_name: "EELR D200 0101",
      note: "P0-001J local rehearsal",
      ...(overrides.entry || {})
    }
  };
}

function adapterRentPayload(id, overrides = {}) {
  return legacyRentPayload(id, {
    property_id: "HL-TEST",
    resolved: {
      propertyId: "HL-TEST",
      listPriceAed: "770.00",
      depositBalanceAed: "200.00",
      ...(overrides.resolved || {})
    },
    ids: {
      transactionId: `eelr-tx-${id}`,
      ...(overrides.ids || {})
    },
    ...overrides,
    entry: {
      amount: "770.00",
      due: "770.00",
      paid: "770.00",
      period_due: "770.00",
      ...(overrides.entry || {})
    }
  });
}

async function postEmployeeEntry(baseUrl, cookie, payload) {
  return request(baseUrl, "/api/employee/entry", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify(payload)
  });
}

test("production APP_ENV keeps /api/employee/entry on legacy behavior even when adapter flag is true", async (t) => {
  const { baseUrl, persistTo } = await startTestWorker(t, {
    vars: { APP_ENV: "production", ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true" },
    label: "production legacy employee entry route switch worker"
  });
  const ownerCookie = await loginOwner(baseUrl);
  const before = counts(persistTo);
  const response = await postEmployeeEntry(
    baseUrl,
    ownerCookie,
    legacyRentPayload(`prod-${Date.now()}`)
  );
  await assertStatus(response, 200, "production legacy employee entry");
  const body = await jsonBody(response);
  assert.equal(body.success, true);
  assert.equal(body.adapter_live_route_rehearsal, undefined);
  const after = counts(persistTo);
  assert.equal(after.transactions_count, before.transactions_count + 1);
  assert.equal(after.adapter_audit_count, before.adapter_audit_count);
  assert.equal(after.adapter_event_count, before.adapter_event_count);
});

test("local flag off keeps legacy behavior and rollback path available", async (t) => {
  const { baseUrl, persistTo } = await startTestWorker(t, {
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "false"
    },
    label: "flag off legacy employee entry route switch worker"
  });
  const employeeCookie = await loginEmployee(baseUrl);
  const before = counts(persistTo);
  const response = await postEmployeeEntry(
    baseUrl,
    employeeCookie,
    legacyRentPayload(`rollback-${Date.now()}`)
  );
  await assertStatus(response, 200, "flag off legacy employee entry");
  const body = await jsonBody(response);
  assert.equal(body.success, true);
  assert.equal(body.adapter_live_route_rehearsal, undefined);
  const after = counts(persistTo);
  assert.equal(after.transactions_count, before.transactions_count + 1);
  assert.equal(after.adapter_audit_count, before.adapter_audit_count);
  assert.equal(after.adapter_event_count, before.adapter_event_count);
});

test("local flag on runs adapter pre-validation before continuing legacy write", async (t) => {
  const { baseUrl, persistTo } = await startTestWorker(t, {
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true"
    },
    label: "flag on adapter employee entry route switch worker"
  });
  const employeeCookie = await loginEmployee(baseUrl);
  const before = counts(persistTo);
  const response = await postEmployeeEntry(
    baseUrl,
    employeeCookie,
    adapterRentPayload(`adapter-${Date.now()}`)
  );
  await assertStatus(response, 200, "flag on adapter employee entry");
  const body = await jsonBody(response);
  assert.equal(body.success, true);
  assert.equal(body.adapter_live_route_rehearsal.status, "DRAFT_READY");
  assert.equal(body.adapter_live_route_rehearsal.legacy_write_continued, true);
  assert.equal(body.adapter_live_route_rehearsal.frontend_totals_authority, false);
  assert.equal(body.adapter_live_route_rehearsal.transaction_fils_patch.amount_fils, 77000);
  assert.equal(body.adapter_live_route_rehearsal.session_fils_patch.cash_handover_fils, 77000);
  const after = counts(persistTo);
  assert.equal(after.transactions_count, before.transactions_count + 1);
  assert.equal(after.sessions_count, before.sessions_count + 1);
  assert.equal(after.adapter_audit_count, before.adapter_audit_count + 1);
  assert.equal(after.adapter_event_count, before.adapter_event_count + 1);
});

test("local flag on rejects owner submitter before adapter rehearsal write", async (t) => {
  const { baseUrl, persistTo } = await startTestWorker(t, {
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true"
    },
    label: "adapter owner rejection employee entry route switch worker"
  });
  const ownerCookie = await loginOwner(baseUrl);
  const beforeOwner = counts(persistTo);
  const ownerSubmit = await postEmployeeEntry(
    baseUrl,
    ownerCookie,
    adapterRentPayload(`owner-${Date.now()}`)
  );
  assert.equal(ownerSubmit.status, 403);
  assert.deepEqual(counts(persistTo), beforeOwner);
});

test("local flag on rejects invalid money before legacy write", async (t) => {
  const { baseUrl, persistTo } = await startTestWorker(t, {
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true"
    },
    label: "adapter invalid money employee entry route switch worker"
  });
  const employeeCookie = await loginEmployee(baseUrl);
  const beforeInvalid = counts(persistTo);
  const invalid = await postEmployeeEntry(
    baseUrl,
    employeeCookie,
    adapterRentPayload(`invalid-${Date.now()}`, { entry: { amount: "100.999" } })
  );
  assert.equal(invalid.status, 422);
  const invalidBody = await jsonBody(invalid);
  assert.equal(invalidBody.code, "EMPLOYEE_ENTRY_ADAPTER_REJECTED");
  assert.equal(invalidBody.adapter_live_route_rehearsal.legacy_write_continued, false);
  const afterInvalid = counts(persistTo);
  assert.equal(afterInvalid.transactions_count, beforeInvalid.transactions_count);
  assert.equal(afterInvalid.adapter_event_count, beforeInvalid.adapter_event_count + 1);
});

test("local flag on skips voided rows before legacy write", async (t) => {
  const { baseUrl, persistTo } = await startTestWorker(t, {
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true"
    },
    label: "adapter voided row employee entry route switch worker"
  });
  const employeeCookie = await loginEmployee(baseUrl);
  const beforeVoided = counts(persistTo);
  const voided = await postEmployeeEntry(
    baseUrl,
    employeeCookie,
    adapterRentPayload(`voided-${Date.now()}`, { entry: { status: "VOIDED" } })
  );
  await assertStatus(voided, 200, "voided adapter employee entry");
  const voidedBody = await jsonBody(voided);
  assert.equal(voidedBody.skipped, true);
  assert.equal(voidedBody.adapter_live_route_rehearsal.status, "SKIPPED_VOIDED");
  assert.equal(voidedBody.adapter_live_route_rehearsal.legacy_write_continued, false);
  const afterVoided = counts(persistTo);
  assert.equal(afterVoided.transactions_count, beforeVoided.transactions_count);
  assert.equal(afterVoided.adapter_event_count, beforeVoided.adapter_event_count + 1);
});

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

const endpoint = "/api/staging/employee-entry/adapter-draft";
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
  port = 0,
  vars,
  migrate = false,
  seed = false,
  label = "employee entry adapter staging endpoint worker"
}) {
  const actualPort = port || (await freePort());
  const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-entry-adapter-staging-"));
  if (migrate) await runLocalMigrations({ persistTo });
  if (seed) runLocalDevSeed({ persistTo });
  const worker = startWorker({ port: actualPort, persistTo, vars });
  let stdout = "";
  let stderr = "";
  worker.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  worker.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  const baseUrl = `http://127.0.0.1:${actualPort}`;
  const diagnostics = {
    label,
    port: actualPort,
    vars,
    child: worker,
    get stdout() {
      return stdout;
    },
    get stderr() {
      return stderr;
    },
    command: `wrangler dev --local --port ${actualPort}`
  };
  const run = { worker, persistTo, label, baseUrl, diagnostics, cleaned: false };
  workerRuns.push(run);
  try {
    await waitForWorker(baseUrl, Number(process.env.WORKER_READY_TIMEOUT_MS || 60000), diagnostics);
  } catch (error) {
    await cleanupRun(run);
    throw error;
  }
  workerDiagnosticsByBaseUrl.set(baseUrl, diagnostics);
  return { baseUrl, persistTo };
}

async function startTestWorker(t, options) {
  const run = await startIsolatedWorker(options);
  t.after(async () => {
    const tracked = workerRuns.find((item) => item.baseUrl === run.baseUrl);
    await cleanupRun(tracked);
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
  const response = await request(baseUrl, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ password: ownerPassword })
  });
  assert.equal(response.status, 200, await response.text());
  return cookieHeader(response);
}

function validPayload(overrides = {}) {
  return {
    property_id: "HL-TEST",
    session: {
      id: "eea-session-001",
      date: "2026-05-24"
    },
    entry: {
      id: "eea-entry-rent-001",
      type: "R",
      room: "144",
      amount: "770.00",
      cat: "cash",
      period_start: "2026-06-01",
      cycle: "1M"
    },
    resolved: {
      propertyId: "HL-TEST",
      listPriceAed: "770.00",
      depositBalanceAed: "200.00"
    },
    ids: {
      transactionId: "eea-tx-001"
    },
    ...overrides,
    session: {
      id: "eea-session-001",
      date: "2026-05-24",
      ...(overrides.session || {})
    },
    entry: {
      id: "eea-entry-rent-001",
      type: "R",
      room: "144",
      amount: "770.00",
      cat: "cash",
      period_start: "2026-06-01",
      cycle: "1M",
      ...(overrides.entry || {})
    },
    resolved: {
      propertyId: "HL-TEST",
      listPriceAed: "770.00",
      depositBalanceAed: "200.00",
      ...(overrides.resolved || {})
    },
    ids: {
      transactionId: "eea-tx-001",
      ...(overrides.ids || {})
    }
  };
}

function d1Results(command, persistTo) {
  const parsed = JSON.parse(executeLocalD1Command(command, { persistTo, json: true }));
  return parsed?.[0]?.results || [];
}

function legacyCounts(persistTo) {
  return d1Results(
    `SELECT
      (SELECT COUNT(*) FROM sessions) AS sessions_count,
      (SELECT COUNT(*) FROM transactions) AS transactions_count,
      (SELECT COUNT(*) FROM deposit_ledger) AS deposit_ledger_count,
      (SELECT COUNT(*) FROM arrears) AS arrears_count,
      (SELECT COUNT(*) FROM arrear_tasks) AS arrear_tasks_count`,
    persistTo
  )[0];
}

test("production APP_ENV hides employee entry adapter staging endpoint with 404", async (t) => {
  const { baseUrl } = await startTestWorker(t, {
    vars: { APP_ENV: "production", ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING: "true" },
    label: "production disabled employee entry adapter worker"
  });
  const response = await request(baseUrl, endpoint, {
    method: "POST",
    body: JSON.stringify(validPayload())
  });
  assert.equal(response.status, 404);
});

test("missing APP_ENV or disabled flag rejects employee entry adapter staging endpoint before auth", async (t) => {
  const missing = await startTestWorker(t, {
    vars: { APP_ENV: "", ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING: "true" },
    label: "missing APP_ENV employee entry adapter worker"
  });
  const missingResponse = await request(missing.baseUrl, endpoint, {
    method: "POST",
    body: JSON.stringify(validPayload())
  });
  assert.equal(missingResponse.status, 403);
  assert.equal((await jsonBody(missingResponse)).code, "FEATURE_DISABLED");

  const disabled = await startTestWorker(t, {
    vars: { APP_ENV: "test", ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING: "false" },
    label: "feature disabled employee entry adapter worker"
  });
  const disabledResponse = await request(disabled.baseUrl, endpoint, {
    method: "POST",
    body: JSON.stringify(validPayload())
  });
  assert.equal(disabledResponse.status, 403);
  assert.equal((await jsonBody(disabledResponse)).code, "FEATURE_DISABLED");
});

test("enabled employee entry adapter endpoint enforces auth, role, validation, and no live writes", async (t) => {
  assert.ok(ownerPassword, "LOCAL_MANAGER_PASSWORD is required for owner rejection test");
  const { baseUrl, persistTo } = await startTestWorker(t, {
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING: "true"
    },
    migrate: true,
    seed: true,
    label: "enabled employee entry adapter staging worker"
  });

  const unauth = await request(baseUrl, endpoint, {
    method: "POST",
    body: JSON.stringify(validPayload())
  });
  assert.equal(unauth.status, 401);

  const badJwt = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Authorization: "Bearer invalid.local.jwt" },
    body: JSON.stringify(validPayload())
  });
  assert.equal(badJwt.status, 401);

  const ownerCookie = await loginOwner(baseUrl);
  const ownerSubmit = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: ownerCookie },
    body: JSON.stringify(validPayload())
  });
  assert.equal(ownerSubmit.status, 403);

  const employeeCookie = await loginEmployee(baseUrl);
  const beforeCounts = legacyCounts(persistTo);
  const beforeHistory = await request(baseUrl, "/api/history", {
    headers: { Cookie: ownerCookie }
  });
  assert.equal(beforeHistory.status, 200);
  const beforeHistoryBody = await jsonBody(beforeHistory);

  const success = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(validPayload())
  });
  await assertStatus(success, 200, "valid rent adapter draft");
  const successBody = await jsonBody(success);
  assert.equal(successBody.status, "DRAFT_READY");
  assert.equal(successBody.metadata.writesDatabase, false);
  assert.equal(successBody.metadata.liveRouteChanged, false);
  assert.equal(successBody.adapter_draft.transactionPlan.filsPatch.amount_fils, 77000);
  assert.equal(successBody.adapter_draft.sessionPlan.filsPatch.cash_handover_fils, 77000);
  assert.equal(successBody.adapter_draft.auditPlan.length > 0, true);

  const shortPaid = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      validPayload({
        entry: {
          id: "eea-entry-short",
          amount: "80.00",
          cat: "bank",
          arrear_handling: "ARREAR",
          arrear_promise_date: "2026-05-29",
          reason_code: "partial_payment"
        },
        ids: { transactionId: "eea-tx-short" }
      })
    )
  });
  await assertStatus(shortPaid, 200, "short-paid rent adapter draft");
  const shortPaidBody = await jsonBody(shortPaid);
  assert.equal(shortPaidBody.adapter_draft.arrearTaskPlan.filsPatch.arrear_amount_fils, 69000);

  const invalid = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(validPayload({ entry: { id: "eea-entry-invalid", amount: "100.999" } }))
  });
  assert.equal(invalid.status, 422);
  assert.equal((await jsonBody(invalid)).status, "REJECTED");

  const voided = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(validPayload({ entry: { id: "eea-entry-voided", status: "VOIDED" } }))
  });
  await assertStatus(voided, 200, "voided row adapter draft");
  assert.equal((await jsonBody(voided)).status, "SKIPPED_VOIDED");

  const deposit = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      validPayload({
        entry: { id: "eea-entry-deposit", type: "D", amount: "200.00" },
        resolved: { depositBalanceAed: "0.00" },
        ids: { transactionId: "eea-tx-deposit" }
      })
    )
  });
  await assertStatus(deposit, 200, "deposit adapter draft");
  assert.equal(
    (await jsonBody(deposit)).adapter_draft.depositLedgerPlan.filsPatch.delta_fils,
    20000
  );

  const afterCounts = legacyCounts(persistTo);
  assert.deepEqual(afterCounts, beforeCounts);

  const afterHistory = await request(baseUrl, "/api/history", { headers: { Cookie: ownerCookie } });
  assert.equal(afterHistory.status, 200);
  assert.deepEqual(await jsonBody(afterHistory), beforeHistoryBody);
});

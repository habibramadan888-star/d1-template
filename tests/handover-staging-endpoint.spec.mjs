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
  readDevVars,
  removeDirWithRetries,
  runNodeScript,
  startWorker,
  stopProcessTree,
  waitForWorker
} from "../scripts/local-worker-utils.mjs";

const endpoint = "/api/staging/handover/commit";
const env = readDevVars(defaultEnvPath);
const employeeId = env.LOCAL_EMPLOYEE_ID || "abdul";
const employeePin = env.LOCAL_EMPLOYEE_PIN || "8888";
const ownerPassword = env.LOCAL_MANAGER_PASSWORD;
const workerRuns = [];

after(async () => {
  for (const run of workerRuns.reverse()) {
    await stopProcessTree(run.worker, { label: run.label });
    await removeDirWithRetries(run.persistTo, { label: `${run.label} D1` });
  }
});

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
  label = "handover staging endpoint worker"
}) {
  const actualPort = port || (await freePort());
  const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-handover-staging-"));
  if (migrate) await runLocalMigrations({ persistTo });
  if (seed) runLocalDevSeed({ persistTo });
  const worker = startWorker({ port: actualPort, persistTo, vars });
  worker.stdout.on("data", () => {});
  worker.stderr.on("data", () => {});
  workerRuns.push({ worker, persistTo, label });
  const baseUrl = `http://127.0.0.1:${actualPort}`;
  await waitForWorker(baseUrl, 45000);
  return { baseUrl, persistTo, worker };
}

async function request(baseUrl, pathName, options = {}) {
  try {
    return await fetch(`${baseUrl}${pathName}`, {
      ...options,
      headers: {
        Origin: baseUrl,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw new Error(`${options.method || "GET"} ${pathName} failed: ${error?.message || error}`);
  }
}

async function jsonBody(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
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
  const rows = overrides.rows || [
    {
      client_entry_id: "entry-rent-001",
      event_type: "R",
      payment_method: "C",
      amount: "100.00",
      bed: "144",
      tenant: "144 D200 0101"
    },
    {
      client_entry_id: "entry-deposit-001",
      event_type: "D",
      payment_method: "B",
      amount: "200.00",
      bed: "144",
      tenant: "144 D200 0101"
    }
  ];
  return {
    session_id: "hsc-session-001",
    idempotency_key: "hsc-key-001",
    employee_id: employeeId,
    property_id: "HL-TEST",
    submitted_at: "2026-05-24T00:00:00.000Z",
    rows,
    frontend_totals: {
      cash_handover: "100.00",
      bank_transfer_total: "200.00",
      bank_transfer_count: 1,
      gross_received: "300.00",
      session_total: "300.00"
    },
    ...overrides
  };
}

function d1Results(command, persistTo) {
  const parsed = JSON.parse(executeLocalD1Command(command, { persistTo, json: true }));
  return parsed?.[0]?.results || [];
}

test("production APP_ENV hides staging handover endpoint with 404", async () => {
  const { baseUrl } = await startIsolatedWorker({
    vars: { APP_ENV: "production", ENABLE_HANDOVER_ATOMIC_STAGING: "true" },
    label: "production disabled handover worker"
  });
  const response = await request(baseUrl, endpoint, {
    method: "POST",
    body: JSON.stringify(validPayload())
  });
  assert.equal(response.status, 404);
});

test("missing or disabled feature flag rejects before auth", async () => {
  const missing = await startIsolatedWorker({
    vars: { APP_ENV: "", ENABLE_HANDOVER_ATOMIC_STAGING: "true" },
    label: "missing APP_ENV handover worker"
  });
  const missingResponse = await request(missing.baseUrl, endpoint, {
    method: "POST",
    body: JSON.stringify(validPayload())
  });
  assert.equal(missingResponse.status, 403);
  assert.equal((await jsonBody(missingResponse)).code, "FEATURE_DISABLED");

  const disabled = await startIsolatedWorker({
    vars: { APP_ENV: "test", ENABLE_HANDOVER_ATOMIC_STAGING: "false" },
    label: "feature disabled handover worker"
  });
  const disabledResponse = await request(disabled.baseUrl, endpoint, {
    method: "POST",
    body: JSON.stringify(validPayload())
  });
  assert.equal(disabledResponse.status, 403);
  assert.equal((await jsonBody(disabledResponse)).code, "FEATURE_DISABLED");
});

test("enabled staging handover endpoint enforces auth, roles, idempotency, totals, and staging writes", async () => {
  assert.ok(ownerPassword, "LOCAL_MANAGER_PASSWORD is required for owner rejection test");
  const { baseUrl, persistTo, worker } = await startIsolatedWorker({
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_HANDOVER_ATOMIC_STAGING: "true"
    },
    migrate: true,
    seed: true,
    label: "enabled handover staging worker"
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
  const beforeHistory = await request(baseUrl, "/api/history", {
    headers: { Cookie: ownerCookie }
  });
  assert.equal(beforeHistory.status, 200);
  const beforeHistoryBody = await jsonBody(beforeHistory);

  const missingIdempotency = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify({ ...validPayload(), idempotency_key: "" })
  });
  assert.equal(missingIdempotency.status, 400);
  assert.equal((await jsonBody(missingIdempotency)).code, "MISSING_IDEMPOTENCY_KEY");

  const success = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(validPayload())
  });
  if (success.status !== 201) {
    assert.fail(
      `valid employee submit expected 201, got ${success.status}: ${await success.text()}`
    );
  }
  const successBody = await jsonBody(success);
  assert.equal(successBody.status, "ACCEPTED");
  assert.equal(successBody.backend_totals.cashHandoverFils, 10000);
  assert.equal(successBody.backend_totals.bankTransferTotalFils, 20000);
  assert.equal(successBody.backend_totals.grossReceivedFils, 30000);
  assert.equal(successBody.frontend_total_comparison.matches, true);

  const replay = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(validPayload())
  });
  assert.equal(replay.status, 200);
  assert.equal((await jsonBody(replay)).status, "IDEMPOTENT_REPLAY");

  const duplicate = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(validPayload({ idempotency_key: "hsc-key-duplicate" }))
  });
  assert.equal(duplicate.status, 409);
  assert.equal((await jsonBody(duplicate)).code, "DUPLICATE_HANDOVER_RISK");

  const tampered = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      validPayload({
        session_id: "hsc-session-tampered",
        idempotency_key: "hsc-key-tampered",
        frontend_totals: {
          cash_handover: "101.00",
          bank_transfer_total: "200.00",
          bank_transfer_count: 1,
          gross_received: "301.00",
          session_total: "301.00"
        }
      })
    )
  });
  assert.equal(tampered.status, 422);
  assert.equal((await jsonBody(tampered)).code, "FRONTEND_TOTALS_MISMATCH");

  const voided = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      validPayload({
        session_id: "hsc-session-voided",
        idempotency_key: "hsc-key-voided",
        rows: [{ ...validPayload().rows[0], status: "VOIDED" }],
        frontend_totals: {
          cash_handover: "100.00",
          bank_transfer_total: "0.00",
          bank_transfer_count: 0,
          gross_received: "100.00",
          session_total: "100.00"
        }
      })
    )
  });
  assert.equal(voided.status, 422);
  assert.equal((await jsonBody(voided)).code, "VOIDED_REJECTED");

  const invalidMoney = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      validPayload({
        session_id: "hsc-session-invalid",
        idempotency_key: "hsc-key-invalid",
        rows: [{ ...validPayload().rows[0], amount: "100.999" }]
      })
    )
  });
  assert.equal(invalidMoney.status, 422);
  assert.equal((await jsonBody(invalidMoney)).code, "INVALID_AMOUNT");

  const emptyAmount = await request(baseUrl, endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      validPayload({
        session_id: "hsc-session-empty",
        idempotency_key: "hsc-key-empty",
        rows: [{ ...validPayload().rows[0], amount: "" }]
      })
    )
  });
  assert.equal(emptyAmount.status, 422);
  assert.equal((await jsonBody(emptyAmount)).code, "INVALID_AMOUNT");

  const afterHistory = await request(baseUrl, "/api/history", { headers: { Cookie: ownerCookie } });
  assert.equal(afterHistory.status, 200);
  assert.deepEqual(await jsonBody(afterHistory), beforeHistoryBody);

  const smoke = await runNodeScript("scripts/smoke-worker.mjs", { SMOKE_BASE_URL: baseUrl });
  assert.equal(smoke.code, 0, smoke.output);

  await stopProcessTree(worker, { label: "enabled handover staging worker" });

  const commitRows = d1Results("SELECT * FROM handover_commits", persistTo);
  const rowRows = d1Results("SELECT * FROM handover_commit_rows", persistTo);
  const idempotencyRows = d1Results("SELECT * FROM handover_idempotency_keys", persistTo);
  const transactionRows = d1Results("SELECT * FROM transactions", persistTo);
  const depositRows = d1Results("SELECT * FROM deposit_ledger", persistTo);
  const arrearRows = d1Results("SELECT * FROM arrears", persistTo);
  const auditRows = d1Results(
    "SELECT * FROM audit_logs WHERE action LIKE 'handover.staging.%'",
    persistTo
  );
  const entryRows = d1Results(
    "SELECT * FROM entry_events WHERE event_type='handover_commit_accepted'",
    persistTo
  );

  assert.equal(commitRows.length, 1);
  assert.equal(rowRows.length, 2);
  assert.equal(idempotencyRows.length, 1);
  assert.equal(transactionRows.length, 0);
  assert.equal(depositRows.length, 0);
  assert.equal(arrearRows.length, 0);
  assert.ok(auditRows.length >= 1);
  assert.equal(entryRows.length, 1);
});

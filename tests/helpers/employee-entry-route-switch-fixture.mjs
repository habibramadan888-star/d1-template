import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  executeLocalD1Command,
  runLocalDevSeed,
  runLocalMigrations
} from "../../scripts/db-local-bootstrap-utils.mjs";
import {
  defaultEnvPath,
  fetchWithRetry,
  readDevVars,
  removeDirWithRetries,
  startWorker,
  stopProcessTree,
  waitForWorker
} from "../../scripts/local-worker-utils.mjs";

export const routeSwitchEnv = readDevVars(defaultEnvPath);
export const routeSwitchEmployeeId = routeSwitchEnv.LOCAL_EMPLOYEE_ID || "abdul";
export const routeSwitchEmployeePin = routeSwitchEnv.LOCAL_EMPLOYEE_PIN || "8888";
export const routeSwitchOwnerPassword = routeSwitchEnv.LOCAL_MANAGER_PASSWORD;
const workerDiagnosticsByBaseUrl = new Map();

export function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).join("; ");
}

export function freePort() {
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

export async function startEmployeeEntryWorker({
  vars,
  migrate = true,
  seed = true,
  label = "employee entry route switch worker"
}) {
  const port = await freePort();
  const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-entry-qa-"));
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
  try {
    await waitForWorker(baseUrl, Number(process.env.WORKER_READY_TIMEOUT_MS || 60000), diagnostics);
  } catch (error) {
    await stopProcessTree(worker, { label });
    await removeDirWithRetries(persistTo, { label: `${label} D1` });
    throw error;
  }
  workerDiagnosticsByBaseUrl.set(baseUrl, diagnostics);
  return { baseUrl, persistTo, worker, label, diagnostics };
}

export async function cleanupEmployeeEntryWorker(run) {
  if (!run) return;
  if (run.baseUrl) workerDiagnosticsByBaseUrl.delete(run.baseUrl);
  await stopProcessTree(run.worker, { label: run.label });
  await removeDirWithRetries(run.persistTo, { label: `${run.label} D1` });
}

export async function requestJson(baseUrl, pathName, options = {}) {
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

export async function jsonBody(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export async function loginEmployee(baseUrl) {
  const response = await requestJson(baseUrl, "/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({
      employee_id: routeSwitchEmployeeId,
      pin: routeSwitchEmployeePin
    })
  });
  assert.equal(response.status, 200, await response.text());
  return cookieHeader(response);
}

export async function loginOwner(baseUrl) {
  assert.ok(
    routeSwitchOwnerPassword,
    "LOCAL_MANAGER_PASSWORD is required for employee entry QA tests"
  );
  const response = await requestJson(baseUrl, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ password: routeSwitchOwnerPassword })
  });
  assert.equal(response.status, 200, await response.text());
  return cookieHeader(response);
}

export function d1Results(command, persistTo) {
  const parsed = JSON.parse(executeLocalD1Command(command, { persistTo, json: true }));
  return parsed?.[0]?.results || [];
}

export function employeeEntryCounts(persistTo) {
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

export async function ownerHistory(baseUrl, ownerCookie) {
  const response = await requestJson(baseUrl, "/api/history", {
    headers: { Cookie: ownerCookie }
  });
  if (response.status !== 200) {
    assert.fail(`owner history expected 200, got ${response.status}: ${await response.text()}`);
  }
  return jsonBody(response);
}

export function legacyRentPayload(id, overrides = {}) {
  const { session: sessionOverrides = {}, entry: entryOverrides = {}, ...rest } = overrides;
  return {
    ...rest,
    session: {
      id: `eelr-session-${id}`,
      date: "2026-06-01",
      entries: [`eelr-entry-${id}`],
      cash_handover: 770,
      bank_transfer_total: 0,
      bank_transfer_count: 0,
      gross_received: 770,
      handover_status: "REHEARSAL",
      export_text: "P0-001K local QA",
      ...sessionOverrides
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
      note: "P0-001K local QA",
      ...entryOverrides
    }
  };
}

export function adapterRentPayload(id, overrides = {}) {
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

export async function postEmployeeEntry(baseUrl, cookie, payload) {
  return requestJson(baseUrl, "/api/employee/entry", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify(payload)
  });
}

export function countDelta(before, after) {
  return Object.fromEntries(
    Object.keys(after).map((key) => [key, Number(after[key] || 0) - Number(before[key] || 0)])
  );
}

import {
  executeLocalD1Command,
  runLocalDevSeed,
  runLocalMigrations
} from "./db-local-bootstrap-utils.mjs";
import { defaultEnvPath, readDevVars, startWorker, waitForWorker } from "./local-worker-utils.mjs";

export const stagingHandoverEndpoint = "/api/staging/handover/commit";
export const devEnv = readDevVars(defaultEnvPath);
export const employeeId = devEnv.LOCAL_EMPLOYEE_ID || "abdul";
export const employeePin = devEnv.LOCAL_EMPLOYEE_PIN || "8888";
export const ownerPassword = devEnv.LOCAL_MANAGER_PASSWORD;

export function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).join("; ");
}

export async function request(baseUrl, pathName, options = {}) {
  const { timeoutMs = 15000, ...fetchOptions } = options;
  return fetch(`${baseUrl}${pathName}`, {
    ...fetchOptions,
    signal: options.signal || AbortSignal.timeout(timeoutMs),
    headers: {
      Origin: baseUrl,
      "Content-Type": "application/json",
      ...(fetchOptions.headers || {})
    }
  });
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
  const response = await request(baseUrl, "/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({ employee_id: employeeId, pin: employeePin })
  });
  if (response.status !== 200) throw new Error(`employee login failed ${response.status}`);
  return cookieHeader(response);
}

export async function loginOwner(baseUrl) {
  if (!ownerPassword) throw new Error("LOCAL_MANAGER_PASSWORD is required for owner login");
  const response = await request(baseUrl, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ password: ownerPassword })
  });
  if (response.status !== 200) throw new Error(`owner login failed ${response.status}`);
  return cookieHeader(response);
}

export function validHandoverPayload(overrides = {}) {
  const rows = overrides.rows || [
    {
      client_entry_id: "manual-rent-001",
      event_type: "R",
      payment_method: "C",
      amount: "100.00",
      bed: "144",
      tenant: "144 D200 0101"
    },
    {
      client_entry_id: "manual-bank-001",
      event_type: "D",
      payment_method: "B",
      amount: "200.00",
      bed: "144",
      tenant: "144 D200 0101"
    }
  ];
  return {
    session_id: "manual-hsc-session-001",
    idempotency_key: "manual-hsc-key-001",
    employee_id: employeeId,
    property_id: "HL-MANUAL",
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

export async function prepareLocalHandoverD1({ persistTo, seed = true } = {}) {
  await runLocalMigrations({ persistTo });
  if (seed) runLocalDevSeed({ persistTo });
}

export async function startHandoverWorker({ port, persistTo, vars, readyTimeoutMs = 45000 }) {
  const worker = startWorker({ port, persistTo, vars });
  worker.stdout.on("data", () => {});
  worker.stderr.on("data", () => {});
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForWorker(baseUrl, readyTimeoutMs);
  return { worker, baseUrl };
}

export function d1Results(command, persistTo) {
  const parsed = JSON.parse(executeLocalD1Command(command, { persistTo, json: true }));
  return parsed?.[0]?.results || [];
}

export function d1Count(table, persistTo, where = "") {
  const suffix = where ? ` WHERE ${where}` : "";
  return d1Results(`SELECT COUNT(*) AS c FROM ${table}${suffix}`, persistTo)[0]?.c || 0;
}

export function responseSummary(status, body) {
  return `${status} ${body?.status || body?.code || body?.error || ""}`.trim();
}

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export const baseUrl =
  process.env.TEST_BASE_URL || process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787";
export const envPath = process.env.TEST_ENV_FILE || process.env.SMOKE_ENV_FILE || "deploy-worker/.dev.vars";

export function parseDevVars(text) {
  const out = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export async function readTestEnv() {
  const fromFile = parseDevVars(await readFile(envPath, "utf8"));
  return {
    ...fromFile,
    LOCAL_MANAGER_PASSWORD:
      process.env.LOADTEST_LOGIN_PASSWORD ||
      process.env.TEST_MANAGER_PASSWORD ||
      fromFile.LOCAL_MANAGER_PASSWORD ||
      "Homelink123",
    LOCAL_EMPLOYEE_ID: process.env.TEST_EMPLOYEE_ID || fromFile.LOCAL_EMPLOYEE_ID || "abdul",
    LOCAL_EMPLOYEE_PIN: process.env.TEST_EMPLOYEE_PIN || fromFile.LOCAL_EMPLOYEE_PIN || "8888"
  };
}

export function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).join("; ");
}

export async function apiRequest(path, options = {}) {
  const headers = {
    Origin: baseUrl,
    ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
    ...(options.cookie ? { Cookie: options.cookie } : {}),
    ...(options.headers || {})
  };
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body:
      options.body === undefined || typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
  });
}

export async function readJson(response, label = "response") {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${label} did not return JSON: ${text.slice(0, 500)}`);
  }
}

export function assertStandardEnvelope(payload, label = "response") {
  assert.equal(typeof payload, "object", `${label} should be an object`);
  assert.equal(typeof payload.code, "number", `${label}.code should be a number`);
  assert.equal(typeof payload.message, "string", `${label}.message should be a string`);
}

export async function expectStandard(response, { label, status, code }) {
  if (status !== undefined) {
    const expected = Array.isArray(status) ? status : [status];
    assert.ok(
      expected.includes(response.status),
      `${label} expected status ${expected.join("/")}, got ${response.status}`
    );
  }
  const payload = await readJson(response, label);
  assertStandardEnvelope(payload, label);
  if (code !== undefined) {
    assert.equal(payload.code, code, `${label} expected code ${code}, got ${payload.code}`);
  }
  return payload;
}

export async function loginOwner() {
  const env = await readTestEnv();
  const response = await apiRequest("/auth/login", {
    method: "POST",
    body: { password: env.LOCAL_MANAGER_PASSWORD }
  });
  assert.equal(response.status, 200, `owner login expected 200, got ${response.status}`);
  const cookie = cookieHeader(response);
  assert.ok(cookie, "owner login should return a session cookie");
  return cookie;
}

export async function loginEmployee() {
  const env = await readTestEnv();
  const response = await apiRequest("/auth/employee-login", {
    method: "POST",
    body: {
      employee_id: env.LOCAL_EMPLOYEE_ID,
      pin: env.LOCAL_EMPLOYEE_PIN
    }
  });
  assert.equal(response.status, 200, `employee login expected 200, got ${response.status}`);
  const cookie = cookieHeader(response);
  assert.ok(cookie, "employee login should return a session cookie");
  return cookie;
}

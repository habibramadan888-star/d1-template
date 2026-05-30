import { readFile } from "node:fs/promises";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8793";
const envPath = process.env.SMOKE_ENV_FILE || "deploy-worker/.dev.vars";

function parseDevVars(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
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

function cookieHeader(response) {
  const headers = response.headers;
  const values =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).join("; ");
}

function unwrapStandardResponse(payload) {
  return payload && payload.code === 0 && payload.data ? payload.data : payload;
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Origin: baseUrl,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function expectStatus(name, response, expected) {
  if (response.status !== expected) {
    const text = await response.text().catch(() => "");
    throw new Error(`${name} expected ${expected}, got ${response.status}: ${text.slice(0, 400)}`);
  }
  console.log(`PASS ${name} ${response.status}`);
}

async function expectJson(name, response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${name} did not return JSON: ${text.slice(0, 400)}`);
  }
}

async function loginOwner(password) {
  const response = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ password })
  });
  await expectStatus("owner login", response, 200);
  const cookie = cookieHeader(response);
  if (!cookie) throw new Error("owner login did not return a session cookie");
  return cookie;
}

async function loginEmployee(employeeId, pin) {
  const response = await request("/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({ employee_id: employeeId, pin })
  });
  await expectStatus("employee login", response, 200);
  const cookie = cookieHeader(response);
  if (!cookie) throw new Error("employee login did not return a session cookie");
  return cookie;
}

async function checkOwnerRead(name, path, cookie, shape) {
  const response = await request(path, { headers: { Cookie: cookie } });
  await expectStatus(name, response, 200);
  const json = unwrapStandardResponse(await expectJson(name, response));
  if (shape === "array" && !Array.isArray(json)) {
    throw new Error(`${name} expected JSON array`);
  }
  if (shape === "object" && (!json || typeof json !== "object" || Array.isArray(json))) {
    throw new Error(`${name} expected JSON object`);
  }
  return json;
}

async function checkDenied(cookie, item) {
  const response = await request(item.path, {
    method: item.method || "GET",
    headers: { Cookie: cookie },
    body: item.body ? JSON.stringify(item.body) : undefined
  });
  await expectStatus(`employee denied ${item.method || "GET"} ${item.path}`, response, 403);
}

async function main() {
  const env = parseDevVars(await readFile(envPath, "utf8"));
  const managerPassword = env.LOCAL_MANAGER_PASSWORD;
  const employeeId = env.LOCAL_EMPLOYEE_ID || "abdul";
  const employeePin = env.LOCAL_EMPLOYEE_PIN || "8888";

  if (!managerPassword) {
    throw new Error(`LOCAL_MANAGER_PASSWORD missing from ${envPath}`);
  }

  const unauthMe = await request("/api/me");
  await expectStatus("unauthenticated /api/me", unauthMe, 401);

  const ownerCookie = await loginOwner(managerPassword);
  const ownerMe = await checkOwnerRead("owner /api/me", "/api/me", ownerCookie, "object");
  if (ownerMe.role !== "manager")
    throw new Error(`owner role expected manager, got ${ownerMe.role}`);
  await checkOwnerRead("owner /api/history", "/api/history", ownerCookie, "array");
  await checkOwnerRead("owner /api/arrears", "/api/arrears", ownerCookie, "array");

  const employeeCookie = await loginEmployee(employeeId, employeePin);
  const employeeMe = await checkOwnerRead("employee /api/me", "/api/me", employeeCookie, "object");
  if (employeeMe.role !== "staff") {
    throw new Error(`employee role expected staff, got ${employeeMe.role}`);
  }

  const rentConfig = await checkOwnerRead(
    "employee allowed /api/rent_config",
    "/api/rent_config",
    employeeCookie,
    "object"
  );
  if (!Object.hasOwn(rentConfig, "config")) {
    throw new Error("employee /api/rent_config response missing config");
  }

  const arrearTasks = await checkOwnerRead(
    "employee allowed /api/arrear_tasks",
    "/api/arrear_tasks",
    employeeCookie,
    "object"
  );
  if (!arrearTasks.success || !Array.isArray(arrearTasks.tasks)) {
    throw new Error("employee /api/arrear_tasks response missing success/tasks");
  }

  const deniedCases = [
    { path: "/api/history" },
    { path: "/api/arrears" },
    { path: "/api/customers" },
    { path: "/api/lock/cards" },
    { path: "/api/wifi/accounts" },
    { method: "POST", path: "/api/rent_config", body: { config: { SMOKE: 1 } } },
    { method: "POST", path: "/api/save_session", body: { session: { id: "SMOKE" } } },
    { method: "POST", path: "/api/delete_session", body: { id: "SMOKE" } },
    { method: "POST", path: "/api/clear_arrear", body: { id: "SMOKE" } },
    { method: "POST", path: "/api/wifi/accounts", body: { accounts: {} } },
    { method: "POST", path: "/api/customers", body: { customers: [] } },
    { method: "POST", path: "/api/security/revoke_sessions", body: {} }
  ];

  for (const item of deniedCases) {
    await checkDenied(employeeCookie, item);
  }
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});

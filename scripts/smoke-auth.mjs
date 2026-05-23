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
    throw new Error(`${name} expected ${expected}, got ${response.status}: ${text.slice(0, 300)}`);
  }
  console.log(`PASS ${name} ${response.status}`);
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

async function main() {
  const env = parseDevVars(await readFile(envPath, "utf8"));
  const managerPassword = env.LOCAL_MANAGER_PASSWORD;
  const employeeId = env.LOCAL_EMPLOYEE_ID || "abdul";
  const employeePin = env.LOCAL_EMPLOYEE_PIN || "8888";

  for (const key of ["JWT_SECRET", "PW_SALT", "MANAGER_PW_HASH"]) {
    if (!String(env[key] || "").trim()) throw new Error(`${key} missing from ${envPath}`);
  }
  if (!managerPassword) {
    throw new Error(`LOCAL_MANAGER_PASSWORD missing from ${envPath}`);
  }
  const appEnv = String(env.APP_ENV || "").toLowerCase();
  if (!["development", "dev", "local", "test"].includes(appEnv)) {
    throw new Error(
      `APP_ENV must be development/local/test for auth smoke, got ${env.APP_ENV || ""}`
    );
  }
  if (String(env.ALLOW_DEV_SEED || "").toLowerCase() !== "true") {
    throw new Error(`ALLOW_DEV_SEED must be true in ${envPath} for local employee auth smoke`);
  }

  const unauthMe = await request("/api/me");
  await expectStatus("unauthenticated /api/me rejected", unauthMe, 401);

  const badJwt = await request("/api/me", {
    headers: { Authorization: "Bearer invalid.local.jwt" }
  });
  await expectStatus("invalid jwt rejected", badJwt, 401);

  const ownerCookie = await loginOwner(managerPassword);
  const ownerMe = await request("/api/me", { headers: { Cookie: ownerCookie } });
  await expectStatus("owner /api/me", ownerMe, 200);
  const ownerPayload = await ownerMe.json();
  if (ownerPayload.role !== "manager") {
    throw new Error(`owner /api/me role expected manager, got ${ownerPayload.role}`);
  }
  console.log("PASS owner role manager");

  const ownerRentConfig = await request("/api/rent_config", {
    headers: { Cookie: ownerCookie }
  });
  await expectStatus("owner allowed /api/rent_config", ownerRentConfig, 200);

  const employeeCookie = await loginEmployee(employeeId, employeePin);
  const employeeMe = await request("/api/me", { headers: { Cookie: employeeCookie } });
  await expectStatus("employee /api/me", employeeMe, 200);
  const employeePayload = await employeeMe.json();
  if (employeePayload.role !== "staff") {
    throw new Error(`employee /api/me role expected staff, got ${employeePayload.role}`);
  }
  console.log("PASS employee role staff");

  const employeeHistory = await request("/api/history", {
    headers: { Cookie: employeeCookie }
  });
  await expectStatus("employee denied owner history", employeeHistory, 403);

  const employeeRentConfig = await request("/api/rent_config", {
    headers: { Cookie: employeeCookie }
  });
  await expectStatus("employee allowed rent config", employeeRentConfig, 200);
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});

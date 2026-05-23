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
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
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
    throw new Error(
      `${name} expected ${expected}, got ${response.status}: ${(await response.text()).slice(0, 300)}`
    );
  }
  console.log(`PASS ${name} ${response.status}`);
}

const env = parseDevVars(await readFile(envPath, "utf8"));
const employeeId = env.LOCAL_EMPLOYEE_ID || "abdul";
const employeePin = env.LOCAL_EMPLOYEE_PIN;
if (!employeePin) throw new Error(`LOCAL_EMPLOYEE_PIN missing from ${envPath}`);

const login = await request("/auth/employee-login", {
  method: "POST",
  body: JSON.stringify({ employee_id: employeeId, pin: employeePin })
});
await expectStatus("employee login", login, 200);
const cookie = cookieHeader(login);
if (!cookie) throw new Error("employee login did not return a session cookie");

const me = await request("/api/me", { headers: { Cookie: cookie } });
await expectStatus("employee /api/me", me, 200);
const payload = await me.json();
if (payload.role !== "staff") throw new Error(`employee role expected staff, got ${payload.role}`);
console.log("PASS employee role staff");

const ownerHistory = await request("/api/history", { headers: { Cookie: cookie } });
await expectStatus("employee denied owner /api/history", ownerHistory, 403);

const rentConfig = await request("/api/rent_config", { headers: { Cookie: cookie } });
await expectStatus("employee allowed /api/rent_config", rentConfig, 200);

const autocannon = require("autocannon");
const fs = require("node:fs");
const path = require("node:path");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: npm run loadtest

Environment variables:
  LOADTEST_URL          Target URL. Default: http://127.0.0.1:8787/api/me
  LOADTEST_CONNECTIONS  Concurrent connections. Default: 10
  LOADTEST_DURATION     Duration in seconds. Default: 10
  LOADTEST_METHOD       HTTP method. Default: GET
  LOADTEST_AUTH_TOKEN   Optional bearer token.
  LOADTEST_COOKIE       Optional Cookie header for session-authenticated endpoints.
  LOADTEST_LOGIN_URL    Optional login endpoint. Default: <target origin>/auth/login
  LOADTEST_LOGIN_PASSWORD Optional owner password used to obtain a session cookie.
`);
  process.exit(0);
}

const url = process.env.LOADTEST_URL || "http://127.0.0.1:8787/api/me";
const connections = Number(process.env.LOADTEST_CONNECTIONS || 10);
const duration = Number(process.env.LOADTEST_DURATION || 10);
const method = process.env.LOADTEST_METHOD || "GET";
const reportPath = path.join(__dirname, "../load-test-report.json");

const headers = {};
if (process.env.LOADTEST_AUTH_TOKEN) {
  headers.Authorization = `Bearer ${process.env.LOADTEST_AUTH_TOKEN}`;
}
if (process.env.LOADTEST_COOKIE) {
  headers.Cookie = process.env.LOADTEST_COOKIE;
}

async function getLoginCookie() {
  if (headers.Cookie || !process.env.LOADTEST_LOGIN_PASSWORD) return null;

  const targetOrigin = new URL(url).origin;
  const loginUrl = process.env.LOADTEST_LOGIN_URL || `${targetOrigin}/auth/login`;
  const response = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: targetOrigin
    },
    body: JSON.stringify({ password: process.env.LOADTEST_LOGIN_PASSWORD })
  });

  if (!response.ok) {
    throw new Error(
      `Login failed with ${response.status}: ${(await response.text()).slice(0, 300)}`
    );
  }

  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return cookies.map((value) => value.split(";")[0]).join("; ");
}

async function verifyStandardResponse() {
  const response = await fetch(url, { method, headers });
  const body = await response.json().catch(() => null);
  return {
    status: response.status,
    code: body?.code,
    ok: response.ok && body?.code === 0
  };
}

async function main() {
  const loginCookie = await getLoginCookie();
  if (loginCookie) headers.Cookie = loginCookie;

  const responseCheck = await verifyStandardResponse();

  const instance = autocannon(
    {
      url,
      connections,
      duration,
      method,
      headers
    },
    (error, result) => {
      const report = {
        timestamp: new Date().toISOString(),
        url,
        method,
        connections,
        duration,
        responseCheck,
        qps: result?.requests?.average || 0,
        p99: result?.latency?.p99 || 0,
        errors: result?.errors || 0,
        non2xx: result?.non2xx || 0,
        totalRequests: result?.requests?.total || 0,
        status: error ? "ERROR" : "COMPLETE",
        error: error?.message || null
      };

      fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
      console.log("Load test report written:", reportPath);
      console.table(report);

      if (error || !responseCheck.ok || report.errors > 0 || report.non2xx > 0) {
        process.exitCode = 1;
      }
    }
  );

  autocannon.track(instance);
}

main().catch((error) => {
  const report = {
    timestamp: new Date().toISOString(),
    url,
    method,
    connections,
    duration,
    qps: 0,
    p99: 0,
    errors: 0,
    non2xx: 0,
    totalRequests: 0,
    status: "ERROR",
    error: error?.message || String(error)
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
});

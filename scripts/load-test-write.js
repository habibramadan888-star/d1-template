const autocannon = require("autocannon");
const fs = require("node:fs");
const path = require("node:path");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: npm run loadtest:write

Environment variables:
  LOADTEST_WRITE_URL             Target write URL. Default: http://127.0.0.1:8787/api/rent_config
  LOADTEST_WRITE_CONNECTIONS     Concurrent connections. Default: 1
  LOADTEST_WRITE_DURATION        Duration in seconds. Default: 1
  LOADTEST_WRITE_AMOUNT          Maximum requests. Default: 10
  LOADTEST_WRITE_COOKIE          Optional Cookie header for session-authenticated endpoints.
  LOADTEST_WRITE_LOGIN_URL       Optional login endpoint. Default: <target origin>/auth/login
  LOADTEST_WRITE_LOGIN_PASSWORD  Owner password used to obtain a session cookie when cookie is not provided.
`);
  process.exit(0);
}

const url = process.env.LOADTEST_WRITE_URL || "http://127.0.0.1:8787/api/rent_config";
const connections = Number(process.env.LOADTEST_WRITE_CONNECTIONS || 1);
const duration = Number(process.env.LOADTEST_WRITE_DURATION || 1);
const amount = Number(process.env.LOADTEST_WRITE_AMOUNT || 10);
const reportPath = path.join(__dirname, "../load-test-write-report.json");
const targetOrigin = new URL(url).origin;
const statusCounts = {};

const headers = {
  "Content-Type": "application/json",
  Origin: targetOrigin
};
if (process.env.LOADTEST_WRITE_COOKIE) {
  headers.Cookie = process.env.LOADTEST_WRITE_COOKIE;
}

function buildBody() {
  return JSON.stringify({
    config: {
      "loadtest-room": 1234,
      "loadtest-room-2": 1567
    }
  });
}

async function getLoginCookie() {
  if (headers.Cookie) return null;
  if (!process.env.LOADTEST_WRITE_LOGIN_PASSWORD) {
    throw new Error("LOADTEST_WRITE_LOGIN_PASSWORD or LOADTEST_WRITE_COOKIE is required");
  }

  const loginUrl = process.env.LOADTEST_WRITE_LOGIN_URL || `${targetOrigin}/auth/login`;
  const response = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: targetOrigin
    },
    body: JSON.stringify({ password: process.env.LOADTEST_WRITE_LOGIN_PASSWORD })
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

async function verifyStandardWriteResponse() {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: buildBody()
  });
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

  const responseCheck = await verifyStandardWriteResponse();

  const instance = autocannon(
    {
      url,
      connections,
      duration,
      amount,
      method: "POST",
      reconnectRate: 1,
      headers,
      body: buildBody()
    },
    (error, result) => {
      const report = {
        timestamp: new Date().toISOString(),
        url,
        method: "POST",
        connections,
        duration,
        amount,
        responseCheck,
        qps: result?.requests?.average || 0,
        p99: result?.latency?.p99 || 0,
        errors: result?.errors || 0,
        non2xx: result?.non2xx || 0,
        statusCounts,
        totalRequests: result?.requests?.total || 0,
        status: error ? "ERROR" : "COMPLETE",
        error: error?.message || null
      };

      fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
      console.log("Write load test report written:", reportPath);
      console.table(report);

      if (error || !responseCheck.ok || report.errors > 0 || report.non2xx > 0) {
        process.exitCode = 1;
      }
    }
  );

  instance.on("response", (_client, statusCode) => {
    statusCounts[statusCode] = (statusCounts[statusCode] || 0) + 1;
  });

  autocannon.track(instance);
}

main().catch((error) => {
  const report = {
    timestamp: new Date().toISOString(),
    url,
    method: "POST",
    connections,
    duration,
    amount,
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

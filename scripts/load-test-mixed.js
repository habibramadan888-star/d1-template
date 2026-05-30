const autocannon = require("autocannon");
const fs = require("node:fs");
const path = require("node:path");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: npm run loadtest:mixed

Environment variables:
  LOADTEST_MIXED_BASE_URL          Worker origin. Default: http://127.0.0.1:8787
  LOADTEST_MIXED_CONNECTIONS       Concurrent connections. Default: 20
  LOADTEST_MIXED_DURATION          Duration in seconds. Default: 30
  LOADTEST_MIXED_COOKIE            Optional Cookie header.
  LOADTEST_MIXED_LOGIN_PASSWORD    Owner password used to obtain a session cookie.
  LOADTEST_MIXED_LOGIN_URL         Optional login endpoint. Default: <origin>/auth/login
`);
  process.exit(0);
}

const baseUrl = process.env.LOADTEST_MIXED_BASE_URL || "http://127.0.0.1:8787";
const connections = Number(process.env.LOADTEST_MIXED_CONNECTIONS || 20);
const duration = Number(process.env.LOADTEST_MIXED_DURATION || 30);
const reportPath = path.join(__dirname, "../load-test-mixed-report.json");
const statusCounts = {};

const headers = {
  "Content-Type": "application/json",
  Origin: baseUrl
};
if (process.env.LOADTEST_MIXED_COOKIE) {
  headers.Cookie = process.env.LOADTEST_MIXED_COOKIE;
}

function rentConfigBody() {
  return JSON.stringify({
    config: {
      "mixed-load-room": 1234,
      "mixed-load-room-2": 1567
    }
  });
}

async function getLoginCookie() {
  if (headers.Cookie) return null;
  if (!process.env.LOADTEST_MIXED_LOGIN_PASSWORD) {
    throw new Error("LOADTEST_MIXED_LOGIN_PASSWORD or LOADTEST_MIXED_COOKIE is required");
  }
  const loginUrl = process.env.LOADTEST_MIXED_LOGIN_URL || `${baseUrl}/auth/login`;
  const response = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl
    },
    body: JSON.stringify({ password: process.env.LOADTEST_MIXED_LOGIN_PASSWORD })
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

async function checkStandard(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => null);
  return {
    path: pathname,
    status: response.status,
    code: body?.code,
    ok: response.ok && body?.code === 0
  };
}

async function chooseSecondaryReadPath() {
  const receivables = await checkStandard("/api/receivables");
  if (receivables.ok) return { path: "/api/receivables", preflight: receivables };
  const rentConfig = await checkStandard("/api/rent_config");
  return { path: "/api/rent_config", preflight: rentConfig };
}

async function main() {
  const loginCookie = await getLoginCookie();
  if (loginCookie) headers.Cookie = loginCookie;

  const meCheck = await checkStandard("/api/me");
  const secondary = await chooseSecondaryReadPath();
  const writeCheck = await checkStandard("/api/rent_config", {
    method: "POST",
    body: rentConfigBody()
  });

  const responseCheck = {
    me: meCheck,
    secondaryRead: secondary.preflight,
    write: writeCheck
  };

  if (!meCheck.ok || !secondary.preflight.ok || !writeCheck.ok) {
    throw new Error(`Mixed load preflight failed: ${JSON.stringify(responseCheck)}`);
  }

  const requests = [
    { method: "GET", path: "/api/me" },
    { method: "GET", path: "/api/me" },
    { method: "GET", path: "/api/me" },
    { method: "GET", path: "/api/me" },
    { method: "GET", path: secondary.path },
    { method: "GET", path: secondary.path },
    { method: "GET", path: secondary.path },
    { method: "POST", path: "/api/rent_config", body: rentConfigBody() },
    { method: "POST", path: "/api/rent_config", body: rentConfigBody() },
    { method: "POST", path: "/api/rent_config", body: rentConfigBody() }
  ];

  const instance = autocannon(
    {
      url: baseUrl,
      connections,
      duration,
      reconnectRate: 1,
      headers,
      requests
    },
    (error, result) => {
      const report = {
        timestamp: new Date().toISOString(),
        baseUrl,
        connections,
        duration,
        mix: "70% read / 30% write",
        readPaths: ["/api/me", secondary.path],
        writePath: "/api/rent_config",
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
      console.log("Mixed load test report written:", reportPath);
      console.table(report);

      if (error || report.errors > 0 || report.non2xx > 0) {
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
    baseUrl,
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

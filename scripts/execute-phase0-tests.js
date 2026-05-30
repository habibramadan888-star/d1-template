const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const docsDir = path.join(rootDir, "docs");
const resultJsonPath = path.join(docsDir, "PHASE_0_TEST_RESULTS_FINAL.json");
const resultMarkdownPath = path.join(docsDir, "PHASE_0_TEST_RESULTS_FINAL.md");

const defaultPort = Number(process.env.PHASE0_WORKER_PORT || process.env.WORKER_PORT || 8801);
const defaultPersistTo = path.join(rootDir, "deploy-worker", ".wrangler", "p0-005-clean-d1");
const envPath = process.env.SMOKE_ENV_FILE || path.join(rootDir, "deploy-worker", ".dev.vars");

const plannedTests = [
  {
    id: 1,
    category: "Auth",
    name: "Employee Login",
    method: "POST",
    path: "/auth/employee-login",
    expected: [200],
    auth: "none",
    body: "employeeLogin",
    validate: "employeeRole"
  },
  {
    id: 2,
    category: "Auth",
    name: "Owner Login",
    method: "POST",
    path: "/auth/login",
    expected: [200],
    auth: "none",
    body: "ownerLogin",
    validate: "ownerRole"
  },
  {
    id: 3,
    category: "Auth",
    name: "Admin Login",
    method: "POST",
    path: "/auth/login",
    expected: [200],
    auth: "none",
    body: "adminLogin",
    validate: "adminRole"
  },
  {
    id: 4,
    category: "Auth",
    name: "Auth Route Closure",
    method: "GET",
    path: "/owner.html",
    expected: [301, 302],
    auth: "none",
    validate: "redirectsToOwner"
  },
  {
    id: 5,
    category: "Employee",
    name: "Property List",
    method: "GET",
    path: "/api/properties",
    expected: [200],
    auth: "employee"
  },
  {
    id: 6,
    category: "Employee",
    name: "Entries List",
    method: "GET",
    path: "/api/entries",
    expected: [200],
    auth: "employee"
  },
  {
    id: 7,
    category: "Employee",
    name: "Payments",
    method: "GET",
    path: "/api/payments",
    expected: [200],
    auth: "employee"
  },
  {
    id: 8,
    category: "Employee",
    name: "Customers",
    method: "GET",
    path: "/api/customers",
    expected: [200],
    auth: "employee"
  },
  {
    id: 9,
    category: "Employee",
    name: "Dashboard",
    method: "GET",
    path: "/api/dashboard",
    expected: [200],
    auth: "employee"
  },
  {
    id: 10,
    category: "Employee",
    name: "Dashboard Totals",
    method: "GET",
    path: "/api/dashboard/totals",
    expected: [200],
    auth: "employee"
  },
  {
    id: 11,
    category: "Employee",
    name: "Receivables",
    method: "GET",
    path: "/api/receivables",
    expected: [200],
    auth: "employee"
  },
  {
    id: 12,
    category: "Employee",
    name: "Arrears",
    method: "GET",
    path: "/api/arrears",
    expected: [200],
    auth: "employee"
  },
  {
    id: 13,
    category: "Owner",
    name: "Owner Dashboard",
    method: "GET",
    path: "/api/owner/dashboard",
    expected: [200],
    auth: "owner"
  },
  {
    id: 14,
    category: "Owner",
    name: "Owner Properties",
    method: "GET",
    path: "/api/owner/properties",
    expected: [200],
    auth: "owner"
  },
  {
    id: 15,
    category: "Owner",
    name: "Owner Totals",
    method: "GET",
    path: "/api/owner/totals",
    expected: [200],
    auth: "owner"
  },
  {
    id: 16,
    category: "Owner",
    name: "Owner History",
    method: "GET",
    path: "/api/owner/history",
    expected: [200],
    auth: "owner"
  },
  {
    id: 17,
    category: "Owner",
    name: "Owner Arrears",
    method: "GET",
    path: "/api/owner/arrears",
    expected: [200],
    auth: "owner"
  },
  {
    id: 18,
    category: "Owner",
    name: "Owner Reports",
    method: "GET",
    path: "/api/owner/reports",
    expected: [200],
    auth: "owner"
  },
  {
    id: 19,
    category: "Admin",
    name: "Admin Dashboard",
    method: "GET",
    path: "/api/admin/dashboard",
    expected: [200],
    auth: "admin"
  },
  {
    id: 20,
    category: "Admin",
    name: "Admin Entries (RO)",
    method: "GET",
    path: "/api/admin/entries",
    expected: [200],
    auth: "admin"
  },
  {
    id: 21,
    category: "Admin",
    name: "Admin Totals",
    method: "GET",
    path: "/api/admin/totals",
    expected: [200],
    auth: "admin"
  },
  {
    id: 22,
    category: "Admin",
    name: "Admin History",
    method: "GET",
    path: "/api/admin/history",
    expected: [200],
    auth: "admin"
  },
  {
    id: 23,
    category: "Admin",
    name: "Admin Audit Trail",
    method: "GET",
    path: "/api/admin/audit",
    expected: [200],
    auth: "admin"
  },
  {
    id: 24,
    category: "Admin",
    name: "Admin Permissions (403)",
    method: "POST",
    path: "/api/entry/add",
    expected: [403],
    auth: "admin",
    body: "emptyObject"
  },
  {
    id: 25,
    category: "Isolation",
    name: "Employee Cross-Property",
    method: "GET",
    path: "/api/entries?property=unauthorized",
    expected: [200],
    auth: "employee"
  },
  {
    id: 26,
    category: "Isolation",
    name: "Owner Cross-Tenant",
    method: "GET",
    path: "/api/entries?tenant=other",
    expected: [200],
    auth: "owner"
  },
  {
    id: 27,
    category: "Isolation",
    name: "Admin Full Access",
    method: "GET",
    path: "/api/entries",
    expected: [200],
    auth: "admin"
  },
  {
    id: 28,
    category: "Health",
    name: "System Uptime",
    method: "GET",
    path: "/api/health",
    expected: [200],
    auth: "owner"
  },
  {
    id: 29,
    category: "Health",
    name: "Error Rate",
    method: "GET",
    path: "/api/metrics/errors",
    expected: [200],
    auth: "owner"
  },
  {
    id: 30,
    category: "Health",
    name: "Database",
    method: "GET",
    path: "/api/health/db",
    expected: [200],
    auth: "owner"
  }
];

function parseEnvFile(file) {
  const output = {};
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    output[key] = value;
  }
  return output;
}

function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).join("; ");
}

function bodyFor(test, env) {
  if (test.body === "ownerLogin") {
    return JSON.stringify({ password: env.LOCAL_MANAGER_PASSWORD || "" });
  }
  if (test.body === "employeeLogin") {
    return JSON.stringify({
      employee_id: env.LOCAL_EMPLOYEE_ID || "abdul",
      pin: env.LOCAL_EMPLOYEE_PIN || ""
    });
  }
  if (test.body === "adminLogin") {
    return JSON.stringify({
      password: env.LOCAL_ADMIN_PASSWORD || env.LOCAL_MANAGER_PASSWORD || ""
    });
  }
  if (test.body === "emptyObject") {
    return JSON.stringify({});
  }
  return undefined;
}

function authCookieFor(test, session) {
  if (test.auth === "owner") return session.ownerCookie;
  if (test.auth === "employee") return session.employeeCookie;
  if (test.auth === "admin") return session.adminCookie;
  return "";
}

async function request(baseUrl, test, env, session) {
  const headers = {
    Origin: baseUrl,
    "content-type": "application/json"
  };
  const cookie = authCookieFor(test, session);
  if (cookie) headers.Cookie = cookie;

  return fetch(`${baseUrl}${test.path}`, {
    method: test.method,
    redirect: "manual",
    headers,
    body: ["GET", "HEAD"].includes(test.method) ? undefined : bodyFor(test, env)
  });
}

async function responseText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function validationFailure(test, response, text, session) {
  const payload = parseJson(text);
  if (test.validate === "ownerRole" && payload?.role !== "manager") {
    return `expected manager role, got ${payload?.role || "missing"}`;
  }
  if (test.validate === "employeeRole" && payload?.role !== "staff") {
    return `expected staff role, got ${payload?.role || "missing"}`;
  }
  if (test.validate === "adminRole") {
    const role = payload?.role || "";
    if (!["admin", "readonly_admin", "admin_readonly"].includes(role)) {
      return `readonly admin credential unavailable; got role ${role || "missing"}`;
    }
  }
  if (test.validate === "redirectsToOwner") {
    const location = response.headers.get("location") || "";
    if (!location.endsWith("/owner") && !location.includes("/owner?")) {
      return `expected redirect to /owner, got ${location || "missing location"}`;
    }
  }
  if (test.auth === "admin" && !session.adminCookie) {
    return "admin session unavailable";
  }
  return "";
}

function categorizeFailure(result) {
  if (result.failureDetail.includes("admin session unavailable")) return "ADMIN_AUTH_MISSING";
  if (result.actualStatus === 404) return "ROUTE_NOT_WIRED";
  if (result.actualStatus === 403) return "PERMISSION_DENIED";
  if (result.actualStatus === 401) return "UNAUTHORIZED";
  if (result.failureDetail.includes("readonly admin credential unavailable"))
    return "ADMIN_AUTH_MISSING";
  return "UNEXPECTED_RESULT";
}

function categoryStats(results) {
  const stats = {};
  for (const result of results) {
    stats[result.category] ||= { total: 0, passed: 0, failed: 0 };
    stats[result.category].total += 1;
    if (result.passed) stats[result.category].passed += 1;
    else stats[result.category].failed += 1;
  }
  return stats;
}

function markdownTable(results) {
  const lines = [
    "| # | Category | Test | Expected | Actual | Latency | Result | Notes |",
    "| ---: | --- | --- | --- | --- | ---: | --- | --- |"
  ];
  for (const result of results) {
    lines.push(
      `| ${result.id} | ${result.category} | ${result.name} | ${result.expected.join("/")} | ${result.actualStatus ?? "n/a"} | ${result.latencyMs}ms | ${result.passed ? "PASS" : "FAIL"} | ${result.failureDetail || result.note || ""} |`
    );
  }
  return lines.join("\n");
}

function markdownCategoryStats(stats) {
  const lines = [
    "| Category | Passed | Failed | Total | Pass Rate |",
    "| --- | ---: | ---: | ---: | ---: |"
  ];
  for (const [category, row] of Object.entries(stats)) {
    const rate = row.total ? `${((row.passed / row.total) * 100).toFixed(1)}%` : "0.0%";
    lines.push(`| ${category} | ${row.passed} | ${row.failed} | ${row.total} | ${rate} |`);
  }
  return lines.join("\n");
}

function failureSummary(results) {
  const summary = {};
  for (const result of results.filter((item) => !item.passed)) {
    const reason = categorizeFailure(result);
    summary[reason] = (summary[reason] || 0) + 1;
  }
  return summary;
}

function markdownFailureSummary(summary) {
  const lines = ["| Reason | Count |", "| --- | ---: |"];
  for (const [reason, count] of Object.entries(summary)) {
    lines.push(`| ${reason} | ${count} |`);
  }
  if (lines.length === 2) lines.push("| None | 0 |");
  return lines.join("\n");
}

function writeReports({ startedAt, finishedAt, baseUrl, results }) {
  fs.mkdirSync(docsDir, { recursive: true });
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const avgLatency = Math.round(
    results.reduce((sum, result) => sum + result.latencyMs, 0) / Math.max(results.length, 1)
  );
  const stats = categoryStats(results);
  const failures = failureSummary(results);
  const decision = passed === results.length ? "GO" : "NO-GO";

  const payload = {
    startedAt,
    finishedAt,
    baseUrl,
    totalTests: results.length,
    passed,
    failed,
    passRate: passed / results.length,
    avgLatencyMs: avgLatency,
    decision,
    categoryStats: stats,
    failureSummary: failures,
    results
  };
  fs.writeFileSync(resultJsonPath, `${JSON.stringify(payload, null, 2)}\n`);

  const markdown = `# Phase 0 Smoke Test Results

Generated: ${finishedAt}

Environment: Local Worker smoke against ${baseUrl}

Decision: ${decision}

## Summary

| Metric | Value | Target | Status |
| --- | ---: | ---: | --- |
| Tests run | ${results.length} | 30 | ${results.length === 30 ? "PASS" : "FAIL"} |
| Tests passed | ${passed} | 30 | ${passed === 30 ? "PASS" : "FAIL"} |
| Tests failed | ${failed} | 0 | ${failed === 0 ? "PASS" : "FAIL"} |
| Pass rate | ${(payload.passRate * 100).toFixed(1)}% | 100% | ${payload.passRate === 1 ? "PASS" : "FAIL"} |
| Average latency | ${avgLatency}ms | <100ms | ${avgLatency < 100 ? "PASS" : "WARN"} |

## Results By Category

${markdownCategoryStats(stats)}

## Failure Summary

${markdownFailureSummary(failures)}

## Detailed Results

${markdownTable(results)}

## Analysis

The Phase 0 smoke matrix did not pass. This is an execution result, not a simulated result.

Primary blockers:

- Planned /api/properties, /api/entries, /api/payments, /api/dashboard, /api/receivables, owner, admin, health, and metrics routes are not wired in the current Worker route table.
- /api/dashboard/totals has a candidate handler in deploy-worker/src/handlers/dashboard-totals.js, but the live route returns 404.
- Local readonly admin credentials are not configured, so admin portal API smoke cannot be validated.
- Existing live API surface is closer to the legacy Worker contract: /auth/login, /auth/employee-login, /api/me, /api/customers, /api/arrears, /api/history, and /api/rent_config.

## Recommendation

Do not mark Phase 0 as passed.

Required next actions:

1. Decide whether Phase 0 should validate the legacy Worker API or the future enterprise API matrix.
2. If validating the future matrix, wire the missing routes behind safe feature flags before rerunning this smoke suite.
3. Add a local readonly-admin credential or adjust the admin smoke cases to the actual auth model.
4. Rerun node scripts/execute-phase0-tests.js.

Production status remains PRODUCTION_NO_GO.
`;

  fs.writeFileSync(resultMarkdownPath, markdown);
  return payload;
}

async function main() {
  const env = parseEnvFile(envPath);
  const startWorker = process.env.PHASE0_START_WORKER !== "false";
  const port = Number(process.env.PHASE0_WORKER_PORT || defaultPort);
  const baseUrl = process.env.BASE_URL || process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`;
  const persistTo = process.env.WRANGLER_PERSIST_TO || defaultPersistTo;
  const startedAt = new Date().toISOString();
  const session = {};
  let worker;

  if (process.env.PHASE0_BOOTSTRAP_D1 === "true") {
    execFileSync(process.execPath, [path.join(rootDir, "scripts", "db-local-bootstrap.mjs")], {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env, WRANGLER_PERSIST_TO: persistTo }
    });
  }

  if (startWorker) {
    const utils = await import("./local-worker-utils.mjs");
    worker = utils.startWorker({ port, persistTo });
    let stdout = "";
    let stderr = "";
    worker.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    worker.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    await utils.waitForWorker(baseUrl, Number(process.env.PHASE0_READY_TIMEOUT_MS || 45000), {
      child: worker,
      label: "phase0-smoke",
      stdout,
      stderr
    });
  }

  try {
    const results = [];
    console.log("Phase 0 live smoke test");
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Tests: ${plannedTests.length}`);

    for (const test of plannedTests) {
      const started = Date.now();
      let actualStatus = null;
      let failureDetail = "";
      let note = "";

      try {
        if (test.auth === "admin" && !session.adminCookie) {
          throw new Error("admin session unavailable");
        }

        const response = await request(baseUrl, test, env, session);
        actualStatus = response.status;
        const text = await responseText(response);

        if (test.id === 1 && response.status === 200) {
          session.employeeCookie = cookieHeader(response);
        }
        if (test.id === 2 && response.status === 200) {
          session.ownerCookie = cookieHeader(response);
        }
        if (test.id === 3 && response.status === 200) {
          session.adminCookie = cookieHeader(response);
        }

        if (!test.expected.includes(response.status)) {
          failureDetail = `expected ${test.expected.join("/")}, got ${response.status}: ${text.slice(0, 120).replace(/\s+/g, " ")}`;
        } else {
          failureDetail = validationFailure(test, response, text, session);
        }
        if (!failureDetail && response.status >= 300 && response.status < 400) {
          note = response.headers.get("location") || "";
        }
      } catch (error) {
        failureDetail = error.message || String(error);
      }

      const latencyMs = Date.now() - started;
      const result = {
        id: test.id,
        category: test.category,
        name: test.name,
        method: test.method,
        path: test.path,
        expected: test.expected,
        actualStatus,
        latencyMs,
        passed: !failureDetail,
        failureDetail,
        note
      };
      results.push(result);
      console.log(
        `[${String(test.id).padStart(2, "0")}] ${result.passed ? "PASS" : "FAIL"} ${test.category.padEnd(10)} ${test.name.padEnd(28)} ${String(actualStatus ?? "n/a").padEnd(4)} ${latencyMs}ms ${failureDetail}`
      );
    }

    const finishedAt = new Date().toISOString();
    const payload = writeReports({ startedAt, finishedAt, baseUrl, results });
    console.log("");
    console.log(`Phase 0 decision: ${payload.decision}`);
    console.log(`Passed: ${payload.passed}/${payload.totalTests}`);
    console.log(`Results: ${path.relative(rootDir, resultMarkdownPath)}`);
    process.exitCode = payload.decision === "GO" ? 0 : 2;
  } finally {
    if (worker) {
      const utils = await import("./local-worker-utils.mjs");
      await utils.stopProcessTree(worker, { label: "phase0-smoke" });
    }
  }
}

main().catch((error) => {
  console.error(`Phase 0 smoke failed to execute: ${error.stack || error.message}`);
  process.exitCode = 1;
});

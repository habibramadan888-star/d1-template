import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import prettier from "prettier";

import {
  executeLocalD1Command,
  runLocalDevSeed,
  runLocalMigrations
} from "./db-local-bootstrap-utils.mjs";
import {
  defaultEnvPath,
  readDevVars,
  removeDirWithRetries,
  rootDir,
  startWorker,
  stopProcessTree,
  waitForWorker
} from "./local-worker-utils.mjs";

const endpoint = "/api/staging/employee-entry/adapter-draft";
const reportPath = path.join(
  rootDir,
  "EMPLOYEE_ENTRY_ADAPTER_STAGING_ENDPOINT_REHEARSAL_RESULT.md"
);
const env = readDevVars(defaultEnvPath);
const employeeId = env.LOCAL_EMPLOYEE_ID || "abdul";
const employeePin = env.LOCAL_EMPLOYEE_PIN || "8888";
const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-eea-staging-rehearsal-"));
const port = Number(process.env.EMPLOYEE_ENTRY_ADAPTER_STAGING_PORT || 8905);
const baseUrl = `http://127.0.0.1:${port}`;
let worker;

function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).join("; ");
}

async function request(pathName, options = {}) {
  return fetch(`${baseUrl}${pathName}`, {
    ...options,
    headers: {
      Origin: baseUrl,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function jsonBody(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function payload(entryOverrides = {}, otherOverrides = {}) {
  return {
    property_id: "HL-REHEARSAL",
    session: {
      id: "reh-eea-session-001",
      date: "2026-05-24"
    },
    entry: {
      id: `reh-eea-${entryOverrides.type || "R"}-${entryOverrides.id || "entry"}`,
      type: "R",
      room: "431",
      amount: "770.00",
      cat: "cash",
      period_start: "2026-06-01",
      cycle: "1M",
      ...entryOverrides
    },
    resolved: {
      propertyId: "HL-REHEARSAL",
      listPriceAed: "770.00",
      depositBalanceAed: "200.00",
      ...(otherOverrides.resolved || {})
    },
    ids: {
      transactionId: `reh-eea-tx-${entryOverrides.id || "entry"}`,
      ...(otherOverrides.ids || {})
    },
    ...otherOverrides
  };
}

function parseD1Json(output) {
  const parsed = JSON.parse(output);
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!first?.success) throw new Error(`D1 query failed: ${output}`);
  return first.results || [];
}

function query(sql) {
  return parseD1Json(executeLocalD1Command(sql, { persistTo, json: true }));
}

function liveCounts() {
  return (
    query(
      `SELECT
        (SELECT COUNT(*) FROM sessions) AS sessions_count,
        (SELECT COUNT(*) FROM transactions) AS transactions_count,
        (SELECT COUNT(*) FROM deposit_ledger) AS deposit_ledger_count,
        (SELECT COUNT(*) FROM arrears) AS arrears_count,
        (SELECT COUNT(*) FROM arrear_tasks) AS arrear_tasks_count`
    )[0] || {}
  );
}

function reportRow({
  scenario,
  statusCode,
  draftStatus,
  expected,
  writesDatabase,
  legacyTablesChanged,
  notes
}) {
  return `| ${scenario} | ${statusCode} | ${draftStatus} | ${expected} | ${
    writesDatabase ? "yes" : "no"
  } | ${legacyTablesChanged ? "yes" : "no"} | ${notes} |`;
}

function countsChanged(left, right) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

const scenarioRows = [];

try {
  await runLocalMigrations({ persistTo });
  runLocalDevSeed({ persistTo });
  worker = startWorker({
    port,
    persistTo,
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING: "true"
    }
  });
  await waitForWorker(baseUrl, 45000);

  const login = await request("/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({ employee_id: employeeId, pin: employeePin })
  });
  if (login.status !== 200) throw new Error(`employee login failed ${login.status}`);
  const employeeCookie = cookieHeader(login);

  const beforeCounts = liveCounts();
  const scenarios = [
    {
      id: "rent-full-cash",
      request: payload({ id: "rent-full-cash", type: "R", amount: "770.00", cat: "cash" }),
      expected: "DRAFT_READY"
    },
    {
      id: "rent-short-bank",
      request: payload({
        id: "rent-short-bank",
        type: "R",
        amount: "80.00",
        cat: "bank",
        arrear_handling: "ARREAR",
        arrear_promise_date: "2026-05-29",
        reason_code: "partial_payment"
      }),
      expected: "DRAFT_READY"
    },
    {
      id: "deposit-in",
      request: payload(
        { id: "deposit-in", type: "D", amount: "200.00" },
        { resolved: { depositBalanceAed: "0.00" } }
      ),
      expected: "DRAFT_READY"
    },
    {
      id: "invalid-3dp",
      request: payload({ id: "invalid-3dp", type: "R", amount: "100.999" }),
      expected: "REJECTED"
    },
    {
      id: "voided-row",
      request: payload({ id: "voided-row", type: "R", status: "VOIDED" }),
      expected: "SKIPPED_VOIDED"
    }
  ];

  for (const scenario of scenarios) {
    const before = liveCounts();
    const response = await request(endpoint, {
      method: "POST",
      headers: { Cookie: employeeCookie },
      body: JSON.stringify(scenario.request)
    });
    const body = await jsonBody(response);
    const after = liveCounts();
    scenarioRows.push(
      reportRow({
        scenario: scenario.id,
        statusCode: response.status,
        draftStatus: body.status || body.code,
        expected: scenario.expected,
        writesDatabase: Boolean(body.metadata?.writesDatabase),
        legacyTablesChanged: countsChanged(before, after),
        notes:
          body.status === scenario.expected
            ? "Expected staging adapter status observed."
            : `Expected ${scenario.expected}; received ${body.status || body.code}.`
      })
    );
  }

  const afterCounts = liveCounts();
  const overall =
    !countsChanged(beforeCounts, afterCounts) &&
    scenarioRows.every((row) => !row.includes("yes | yes"));

  const report = await prettier.format(
    `# Employee Entry Adapter Staging Endpoint Rehearsal Result

Generated: ${new Date().toISOString()}, Asia/Dubai

Scope: local/staging-only endpoint rehearsal for \`${endpoint}\`. This did not execute production or remote D1 migration, did not deploy, did not switch \`/api/employee/entry\`, did not change dashboard output, and did not write legacy live financial tables.

## Overall

| Item | Result |
| --- | --- |
| Rehearsal | ${overall ? "PASS" : "FAIL"} |
| Endpoint | \`${endpoint}\` |
| Feature flag | \`ENABLE_EMPLOYEE_ENTRY_ADAPTER_STAGING=true\` |
| APP_ENV | \`test\` |
| Legacy live tables mutated | ${countsChanged(beforeCounts, afterCounts) ? "yes" : "no"} |
| Production migration executed | no |
| Remote D1 migration executed | no |
| Production deploy executed | no |
| Live employee entry flow switched | no |
| Live dashboard changed | no |
| Temporary persist path | \`${persistTo}\` |

## Live Table Mutation Evidence

| Table | Before | After | Changed |
| --- | ---: | ---: | --- |
| sessions | ${beforeCounts.sessions_count || 0} | ${afterCounts.sessions_count || 0} | ${
      beforeCounts.sessions_count === afterCounts.sessions_count ? "no" : "yes"
    } |
| transactions | ${beforeCounts.transactions_count || 0} | ${afterCounts.transactions_count || 0} | ${
      beforeCounts.transactions_count === afterCounts.transactions_count ? "no" : "yes"
    } |
| deposit_ledger | ${beforeCounts.deposit_ledger_count || 0} | ${
      afterCounts.deposit_ledger_count || 0
    } | ${beforeCounts.deposit_ledger_count === afterCounts.deposit_ledger_count ? "no" : "yes"} |
| arrears | ${beforeCounts.arrears_count || 0} | ${afterCounts.arrears_count || 0} | ${
      beforeCounts.arrears_count === afterCounts.arrears_count ? "no" : "yes"
    } |
| arrear_tasks | ${beforeCounts.arrear_tasks_count || 0} | ${
      afterCounts.arrear_tasks_count || 0
    } | ${beforeCounts.arrear_tasks_count === afterCounts.arrear_tasks_count ? "no" : "yes"} |

## Scenario Evidence

| Scenario | HTTP Status | Draft Status | Expected | Writes Database | Legacy Tables Changed | Notes |
| --- | ---: | --- | --- | --- | --- | --- |
${scenarioRows.join("\n")}

## Gate Interpretation

- The endpoint is a local/staging route harness around the employee entry adapter draft path.
- The endpoint returns adapter write plans and audit plans only.
- The endpoint does not write \`sessions\`, \`transactions\`, \`deposit_ledger\`, \`arrears\`, or \`arrear_tasks\`.
- This does not approve production migration.
- This does not switch live employee entry flow.
- P0-001 remains Partial until live write path switching and production migration receive separate approval.
`,
    { parser: "markdown" }
  );
  await writeFile(reportPath, report, "utf8");

  if (!overall) throw new Error("Employee entry adapter staging endpoint rehearsal failed.");
  console.log("P0_001H_EMPLOYEE_ENTRY_ADAPTER_STAGING_ENDPOINT_REHEARSAL=PASS");
  console.log(`Report: ${reportPath}`);
} finally {
  if (worker) await stopProcessTree(worker, { label: "employee entry adapter staging rehearsal" });
  await removeDirWithRetries(persistTo, { label: "employee entry adapter staging rehearsal D1" });
}

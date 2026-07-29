import { writeFile } from "node:fs/promises";
import {
  cleanupEmployeeEntryWorker,
  adapterRentPayload,
  employeeEntryCounts,
  jsonBody,
  legacyRentPayload,
  loginEmployee,
  loginOwner,
  postEmployeeEntry,
  startEmployeeEntryWorker
} from "../tests/helpers/employee-entry-route-switch-fixture.mjs";

const scenarios = [
  {
    name: "missing APP_ENV flag true legacy lock",
    vars: { APP_ENV: "", ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true" },
    submitter: "owner",
    payload: "legacy"
  },
  {
    name: "production flag true legacy lock",
    vars: { APP_ENV: "production", ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true" },
    submitter: "owner",
    payload: "legacy"
  },
  {
    name: "test flag true adapter prevalidation",
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true"
    },
    submitter: "employee",
    payload: "adapter"
  }
];

const rows = [];

for (const [index, scenario] of scenarios.entries()) {
  let run;
  const started = Date.now();
  try {
    run = await startEmployeeEntryWorker({
      vars: scenario.vars,
      label: `econnreset repro ${scenario.name}`
    });
    const cookie =
      scenario.submitter === "employee"
        ? await loginEmployee(run.baseUrl)
        : await loginOwner(run.baseUrl);
    const before = employeeEntryCounts(run.persistTo);
    const payload =
      scenario.payload === "adapter"
        ? adapterRentPayload(`econnreset-${index}-${Date.now()}`)
        : legacyRentPayload(`econnreset-${index}-${Date.now()}`);
    const response = await postEmployeeEntry(run.baseUrl, cookie, payload);
    const body = await jsonBody(response);
    const after = employeeEntryCounts(run.persistTo);
    const ok =
      response.status === 200 &&
      Number(after.transactions_count) >= Number(before.transactions_count);
    rows.push({
      run: index + 1,
      scenario: scenario.name,
      result: ok ? "PASS" : "FAIL",
      port: run.diagnostics?.port || "unknown",
      notes: `status=${response.status}; body.success=${body.success ?? "n/a"}; elapsed_ms=${
        Date.now() - started
      }`
    });
    if (!ok) {
      throw new Error(`Unexpected employee-entry repro response for ${scenario.name}`);
    }
  } finally {
    if (run) await cleanupEmployeeEntryWorker(run);
  }
}

const generated = new Date().toISOString();
const markdown = [
  "# TEST-STABILITY-002 Repro Result",
  "",
  `Generated: ${generated}`,
  "",
  "Scope: local Worker ECONNRESET reproduction only. No deploy, no migration, no staging D1 write, and no feature flag change was executed.",
  "",
  "| Run | Command | Result | Port | Notes |",
  "|---:|---|---|---:|---|",
  ...rows.map(
    (row) =>
      `| ${row.run} | npm run reproduce:employee-entry-econnreset (${row.scenario}) | ${row.result} | ${row.port} | ${row.notes} |`
  ),
  "",
  "Conclusion: ECONNRESET reproduction loop completed without socket reset."
].join("\n");

await writeFile("TEST_STABILITY_002_REPRO_RESULT.md", `${markdown}\n`, "utf8");
console.log("TEST_STABILITY_002_REPRO_RESULT.md written");

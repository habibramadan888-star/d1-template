import { writeFile } from "node:fs/promises";
import {
  adapterRentPayload,
  cleanupEmployeeEntryWorker,
  countDelta,
  employeeEntryCounts,
  jsonBody,
  legacyRentPayload,
  loginEmployee,
  loginOwner,
  ownerHistory,
  postEmployeeEntry,
  startEmployeeEntryWorker
} from "../tests/helpers/employee-entry-route-switch-fixture.mjs";

const reportPath = "EMPLOYEE_ENTRY_ROLLBACK_DRILL_RESULT.md";

async function runSubmit({ vars, payload, label }) {
  const run = await startEmployeeEntryWorker({ vars, label });
  try {
    const employeeCookie = await loginEmployee(run.baseUrl);
    const ownerCookie = await loginOwner(run.baseUrl);
    const beforeCounts = employeeEntryCounts(run.persistTo);
    const beforeHistory = await ownerHistory(run.baseUrl, ownerCookie);
    const response = await postEmployeeEntry(run.baseUrl, employeeCookie, payload);
    const body = await jsonBody(response);
    const afterCounts = employeeEntryCounts(run.persistTo);
    const afterHistory = await ownerHistory(run.baseUrl, ownerCookie);
    return {
      status: response.status,
      body,
      countDelta: countDelta(beforeCounts, afterCounts),
      historyChanged: JSON.stringify(beforeHistory) !== JSON.stringify(afterHistory)
    };
  } finally {
    await cleanupEmployeeEntryWorker(run);
  }
}

function passFail(condition) {
  return condition ? "PASS" : "FAIL";
}

async function main() {
  const stamp = Date.now();
  const flagOn = await runSubmit({
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true"
    },
    payload: adapterRentPayload(`rollback-on-${stamp}`),
    label: "rollback flag on adapter worker"
  });
  const flagOff = await runSubmit({
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "false"
    },
    payload: legacyRentPayload(`rollback-off-${stamp}`),
    label: "rollback flag off legacy worker"
  });
  const flagOffInvalid = await runSubmit({
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "false"
    },
    payload: legacyRentPayload(`rollback-invalid-${stamp}`, {
      entry: { amount: "100.999" }
    }),
    label: "rollback flag off invalid legacy worker"
  });

  const checks = [
    {
      name: "flag on adapter works",
      result:
        flagOn.status === 200 &&
        flagOn.body.adapter_live_route_rehearsal?.status === "DRAFT_READY" &&
        flagOn.countDelta.transactions_count === 1
    },
    {
      name: "flag off returns legacy",
      result:
        flagOff.status === 200 &&
        !flagOff.body.adapter_live_route_rehearsal &&
        flagOff.countDelta.transactions_count === 1
    },
    {
      name: "adapter-only invalid check does not run with flag off",
      result:
        flagOffInvalid.status !== 422 ||
        flagOffInvalid.body.code !== "EMPLOYEE_ENTRY_ADAPTER_REJECTED"
    },
    {
      name: "invalid flag-off request does not change dashboard/history",
      result:
        flagOffInvalid.historyChanged === false &&
        flagOffInvalid.countDelta.transactions_count === 0
    }
  ];
  const allPass = checks.every((check) => check.result);
  const markdown = `# Employee Entry Rollback Drill Result

Generated: ${new Date().toISOString()}

Scope: P0-001K local-only rollback drill. This command uses disposable local D1 Workers only. It does not deploy, run production or remote migrations, change production config, or write secrets.

## Result

| Check | Result |
| --- | --- |
${checks.map((check) => `| ${check.name} | ${passFail(check.result)} |`).join("\n")}

## Evidence

| Phase | Status | Adapter Metadata | Transaction Delta | History Changed | Notes |
| --- | ---: | --- | ---: | --- | --- |
| Flag on valid adapter | ${flagOn.status} | ${flagOn.body.adapter_live_route_rehearsal?.status || "none"} | ${flagOn.countDelta.transactions_count} | ${flagOn.historyChanged} | Valid adapter rehearsal intentionally continues to legacy write. |
| Flag off valid legacy | ${flagOff.status} | ${flagOff.body.adapter_live_route_rehearsal?.status || "none"} | ${flagOff.countDelta.transactions_count} | ${flagOff.historyChanged} | Rollback path keeps current legacy behavior. |
| Flag off invalid legacy | ${flagOffInvalid.status} | ${flagOffInvalid.body.adapter_live_route_rehearsal?.status || "none"} | ${flagOffInvalid.countDelta.transactions_count} | ${flagOffInvalid.historyChanged} | Adapter-only rejection is disabled when flag is off. |

## Conclusion

${allPass ? "PASS. Closing `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` returns `/api/employee/entry` to legacy behavior." : "FAIL. Do not proceed to staging QA until rollback behavior is reviewed."}
`;
  await writeFile(reportPath, markdown);
  console.log(`EMPLOYEE_ENTRY_ROLLBACK_DRILL=${allPass ? "PASS" : "FAIL"}`);
  console.log(`Wrote ${reportPath}`);
  if (!allPass) process.exit(1);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});

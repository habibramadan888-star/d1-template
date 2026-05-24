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

const reportPath = "EMPLOYEE_ENTRY_LEGACY_VS_ADAPTER_COMPARISON.md";

function summarizeBody(body) {
  return {
    success: body.success,
    skipped: body.skipped,
    code: body.code,
    duplicate: body.duplicate,
    adapterStatus: body.adapter_live_route_rehearsal?.status || null,
    adapterOk: body.adapter_live_route_rehearsal?.ok ?? null,
    legacyWriteContinued: body.adapter_live_route_rehearsal?.legacy_write_continued ?? null,
    frontendTotalsAuthority: body.adapter_live_route_rehearsal?.frontend_totals_authority ?? null
  };
}

async function runRouteCase({ name, vars, payload, actor = "employee" }) {
  const run = await startEmployeeEntryWorker({
    vars,
    label: `${name} employee entry comparison worker`
  });
  try {
    const ownerCookie = await loginOwner(run.baseUrl);
    const submitCookie = actor === "owner" ? ownerCookie : await loginEmployee(run.baseUrl);
    const beforeCounts = employeeEntryCounts(run.persistTo);
    const beforeHistory = await ownerHistory(run.baseUrl, ownerCookie);
    const response = await postEmployeeEntry(run.baseUrl, submitCookie, payload);
    const body = await jsonBody(response);
    const afterCounts = employeeEntryCounts(run.persistTo);
    const afterHistory = await ownerHistory(run.baseUrl, ownerCookie);
    return {
      status: response.status,
      body: summarizeBody(body),
      countDelta: countDelta(beforeCounts, afterCounts),
      historyChanged: JSON.stringify(beforeHistory) !== JSON.stringify(afterHistory)
    };
  } finally {
    await cleanupEmployeeEntryWorker(run);
  }
}

function classifyScenario(name, legacy, adapter) {
  if (name === "valid normal entry") {
    const ok =
      legacy.status === 200 &&
      adapter.status === 200 &&
      legacy.countDelta.transactions_count === 1 &&
      adapter.countDelta.transactions_count === 1 &&
      adapter.body.adapterStatus === "DRAFT_READY";
    return ok ? "EXPECTED_DIFFERENCE" : "UNEXPECTED_DIFFERENCE";
  }
  if (name === "feature flag off rollback") {
    const ok = legacy.status === 200 && !legacy.body.adapterStatus;
    return ok ? "MATCH" : "UNEXPECTED_DIFFERENCE";
  }
  if (["invalid 3 decimals", "empty amount"].includes(name)) {
    const ok =
      legacy.countDelta.transactions_count === 0 &&
      adapter.countDelta.transactions_count === 0 &&
      adapter.status === 422;
    return ok ? "EXPECTED_DIFFERENCE" : "UNEXPECTED_DIFFERENCE";
  }
  if (name === "owner/admin submit") {
    const ok = legacy.status === 200 && adapter.status === 403;
    return ok ? "EXPECTED_DIFFERENCE" : "UNEXPECTED_DIFFERENCE";
  }
  if (name === "voided row/session") {
    const ok =
      legacy.status === 200 &&
      legacy.countDelta.transactions_count === 1 &&
      adapter.status === 200 &&
      adapter.body.skipped === true &&
      adapter.countDelta.transactions_count === 0;
    return ok ? "EXPECTED_DIFFERENCE" : "UNEXPECTED_DIFFERENCE";
  }
  return "MANUAL_REQUIRED";
}

function formatResult(result) {
  return `status=${result.status}; body=${JSON.stringify(result.body)}; delta=${JSON.stringify(
    result.countDelta
  )}; historyChanged=${result.historyChanged}`;
}

function scenarioRow({ name, legacy, adapter, expected, status }) {
  const unexpected = status === "UNEXPECTED_DIFFERENCE" ? "Review required" : "";
  return `| ${name} | ${formatResult(legacy)} | ${formatResult(adapter)} | ${expected} | ${unexpected} | ${status} |`;
}

async function main() {
  const stamp = Date.now();
  const legacyVars = {
    APP_ENV: "test",
    ALLOW_DEV_SEED: "true",
    ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "false"
  };
  const adapterVars = {
    APP_ENV: "test",
    ALLOW_DEV_SEED: "true",
    ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE: "true"
  };
  const scenarios = [
    {
      name: "valid normal entry",
      legacyPayload: legacyRentPayload(`cmp-valid-${stamp}`),
      adapterPayload: adapterRentPayload(`cmp-valid-${stamp}`),
      expected:
        "Both write one legacy transaction; adapter adds pre-validation metadata and audit evidence."
    },
    {
      name: "invalid 3 decimals",
      legacyPayload: legacyRentPayload(`cmp-3dp-${stamp}`, { entry: { amount: "100.999" } }),
      adapterPayload: adapterRentPayload(`cmp-3dp-${stamp}`, { entry: { amount: "100.999" } }),
      expected: "Both avoid writes; adapter returns structured money rejection."
    },
    {
      name: "empty amount",
      legacyPayload: legacyRentPayload(`cmp-empty-${stamp}`, { entry: { amount: "" } }),
      adapterPayload: adapterRentPayload(`cmp-empty-${stamp}`, { entry: { amount: "" } }),
      expected: "Both avoid writes; adapter returns structured money rejection."
    },
    {
      name: "owner/admin submit",
      actor: "owner",
      legacyPayload: legacyRentPayload(`cmp-owner-${stamp}`),
      adapterPayload: adapterRentPayload(`cmp-owner-${stamp}`),
      expected:
        "Legacy path keeps current owner behavior; adapter rehearsal denies owner/admin submit."
    },
    {
      name: "voided row/session",
      legacyPayload: legacyRentPayload(`cmp-void-${stamp}`, { entry: { status: "VOIDED" } }),
      adapterPayload: adapterRentPayload(`cmp-void-${stamp}`, { entry: { status: "VOIDED" } }),
      expected: "Legacy writes current row status; adapter excludes voided row before legacy write."
    },
    {
      name: "feature flag off rollback",
      legacyPayload: legacyRentPayload(`cmp-rollback-${stamp}`),
      adapterPayload: legacyRentPayload(`cmp-rollback-${stamp}`),
      expected: "Flag off remains legacy with no adapter metadata."
    },
    {
      name: "frontend total tamper",
      legacyPayload: legacyRentPayload(`cmp-tamper-${stamp}`),
      adapterPayload: adapterRentPayload(`cmp-tamper-${stamp}`),
      expected:
        "MANUAL_REQUIRED: employee entry legacy route does not yet expose a handover-style frontend-total comparison contract."
    },
    {
      name: "duplicate / retry",
      legacyPayload: legacyRentPayload(`cmp-duplicate-${stamp}`),
      adapterPayload: adapterRentPayload(`cmp-duplicate-${stamp}`),
      expected:
        "MANUAL_REQUIRED: existing idempotency is transaction-id based; production cutover needs explicit retry policy review."
    }
  ];

  const rows = [];
  for (const scenario of scenarios) {
    if (["frontend total tamper", "duplicate / retry"].includes(scenario.name)) {
      rows.push({
        ...scenario,
        legacy: {
          status: "MANUAL_REQUIRED",
          body: {},
          countDelta: {},
          historyChanged: "not-run"
        },
        adapter: {
          status: "MANUAL_REQUIRED",
          body: {},
          countDelta: {},
          historyChanged: "not-run"
        },
        status: "MANUAL_REQUIRED"
      });
      continue;
    }
    const legacy = await runRouteCase({
      name: `${scenario.name} legacy`,
      vars: legacyVars,
      payload: scenario.legacyPayload,
      actor: scenario.actor || "employee"
    });
    const adapter = await runRouteCase({
      name: `${scenario.name} adapter`,
      vars: scenario.name === "feature flag off rollback" ? legacyVars : adapterVars,
      payload: scenario.adapterPayload,
      actor: scenario.actor || "employee"
    });
    rows.push({
      ...scenario,
      legacy,
      adapter,
      status: classifyScenario(scenario.name, legacy, adapter)
    });
  }

  const markdown = `# Employee Entry Legacy vs Adapter Comparison

Generated: ${new Date().toISOString()}

Scope: P0-001K local-only comparison. This command uses disposable local D1 Workers only. It does not execute production deploy, staging deploy, production D1 migration, remote D1 migration, production config changes, or secret writes.

| Scenario | Legacy Result | Adapter Result | Expected Difference | Unexpected Difference | Status |
| --- | --- | --- | --- | --- | --- |
${rows.map(scenarioRow).join("\n")}

## Interpretation

- MATCH means the same legacy behavior was expected and observed.
- EXPECTED_DIFFERENCE means adapter rehearsal intentionally differs from legacy, such as structured rejection or audit metadata.
- UNEXPECTED_DIFFERENCE must block production cutover.
- MANUAL_REQUIRED means the behavior needs a human decision before production cutover.
`;
  await writeFile(reportPath, markdown);
  const unexpected = rows.filter((row) => row.status === "UNEXPECTED_DIFFERENCE");
  console.log(`EMPLOYEE_ENTRY_ROUTE_COMPARISON_UNEXPECTED=${unexpected.length}`);
  console.log(`Wrote ${reportPath}`);
  if (unexpected.length) process.exit(1);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});

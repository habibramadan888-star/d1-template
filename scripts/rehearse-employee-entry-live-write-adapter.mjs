import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import prettier from "prettier";

import { createEmployeeEntryLiveWriteAdapterDraft } from "../modules/worker/employee-entry-live-write-adapter.mjs";
import {
  executeLocalD1Command,
  runLocalDevSeed,
  runLocalMigrations
} from "./db-local-bootstrap-utils.mjs";
import { removeDirWithRetries, rootDir } from "./local-worker-utils.mjs";

function baseInput(entryOverrides = {}, otherOverrides = {}) {
  return {
    auth: {
      companyId: "local-dev-company",
      propertyId: "prop-001",
      operatorId: "employee-abdul"
    },
    body: {
      session: {
        id: "p0-001g-session-1",
        date: "2026-05-24"
      },
      entry: {
        id: `p0-001g-${entryOverrides.type || "R"}-${entryOverrides.id || "entry"}`,
        type: "R",
        room: "431",
        amount: "770.00",
        cat: "cash",
        period_start: "2026-06-01",
        cycle: "1M",
        ...entryOverrides
      }
    },
    resolved: {
      propertyId: "prop-001",
      listPriceAed: "770.00",
      depositBalanceAed: "200.00"
    },
    ids: {
      transactionId: `p0-001g-tx-${entryOverrides.id || "entry"}`
    },
    ...otherOverrides,
    auth: {
      companyId: "local-dev-company",
      propertyId: "prop-001",
      operatorId: "employee-abdul",
      ...(otherOverrides.auth || {})
    },
    resolved: {
      propertyId: "prop-001",
      listPriceAed: "770.00",
      depositBalanceAed: "200.00",
      ...(otherOverrides.resolved || {})
    }
  };
}

const SCENARIOS = [
  {
    id: "rent-full-cash",
    expectedStatus: "DRAFT_READY",
    input: baseInput({ id: "rent-full-cash", type: "R", amount: "770.00", cat: "cash" })
  },
  {
    id: "rent-short-bank",
    expectedStatus: "DRAFT_READY",
    input: baseInput({
      id: "rent-short-bank",
      type: "R",
      amount: "80.00",
      cat: "bank",
      arrear_handling: "ARREAR",
      arrear_promise_date: "2026-05-29",
      reason_code: "partial_payment"
    })
  },
  {
    id: "deposit-in",
    expectedStatus: "DRAFT_READY",
    input: baseInput(
      { id: "deposit-in", type: "D", amount: "200.00" },
      { resolved: { depositBalanceAed: "0.00" } }
    )
  },
  {
    id: "deposit-refund",
    expectedStatus: "DRAFT_READY",
    input: baseInput({ id: "deposit-refund", type: "DR", amount: "100.00" })
  },
  {
    id: "checkout-deduction",
    expectedStatus: "DRAFT_READY",
    input: baseInput({
      id: "checkout-deduction",
      type: "CO",
      amount: "0.00",
      deposit_deduction: "40.00"
    })
  },
  {
    id: "arrears-payment",
    expectedStatus: "DRAFT_READY",
    input: baseInput({
      id: "arrears-payment",
      type: "AP",
      amount: "100.00",
      linked_task_id: "p0-001g-task-1"
    })
  },
  {
    id: "invalid-3dp",
    expectedStatus: "REJECTED",
    input: baseInput({ id: "invalid-3dp", type: "R", amount: "100.999" })
  },
  {
    id: "voided-row",
    expectedStatus: "SKIPPED_VOIDED",
    input: baseInput({ id: "voided-row", type: "R", status: "VOIDED" })
  }
];

function parseD1Json(output) {
  const parsed = JSON.parse(output);
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!first?.success) throw new Error(`D1 query failed: ${output}`);
  return first.results || [];
}

function executeJson(sql, persistTo) {
  return parseD1Json(executeLocalD1Command(sql, { persistTo, json: true }));
}

function liveTableCounts(persistTo) {
  const rows = executeJson(
    `SELECT
      (SELECT COUNT(*) FROM sessions) AS sessions_count,
      (SELECT COUNT(*) FROM transactions) AS transactions_count,
      (SELECT COUNT(*) FROM deposit_ledger) AS deposit_ledger_count,
      (SELECT COUNT(*) FROM arrears) AS arrears_count,
      (SELECT COUNT(*) FROM arrear_tasks) AS arrear_tasks_count`,
    persistTo
  );
  return rows[0] || {};
}

function sameCounts(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function runScenarios() {
  return SCENARIOS.map((scenario) => {
    const result = createEmployeeEntryLiveWriteAdapterDraft(scenario.input);
    const passed = result.status === scenario.expectedStatus;
    return {
      id: scenario.id,
      expected_status: scenario.expectedStatus,
      actual_status: result.status,
      ok: result.ok,
      passed,
      transaction_patch_fields: Object.keys(result.transactionPlan?.filsPatch || {}),
      session_patch_fields: Object.keys(result.sessionPlan?.filsPatch || {}),
      deposit_patch_fields: Object.keys(result.depositLedgerPlan?.filsPatch || {}),
      arrear_patch_fields: Object.keys(result.arrearTaskPlan?.filsPatch || {}),
      warning_codes: result.warnings.map((warning) => warning.code),
      error_codes: result.errors.map((error) => error.code)
    };
  });
}

function renderScenarioRows(rows) {
  return rows
    .map(
      (row) =>
        `| \`${row.id}\` | ${row.expected_status} | ${row.actual_status} | ${
          row.ok ? "yes" : "no"
        } | ${row.passed ? "PASS" : "FAIL"} | ${
          row.transaction_patch_fields.join(", ") || "-"
        } | ${row.session_patch_fields.join(", ") || "-"} | ${
          row.deposit_patch_fields.join(", ") || "-"
        } | ${row.arrear_patch_fields.join(", ") || "-"} | ${
          row.warning_codes.join(", ") || "-"
        } | ${row.error_codes.join(", ") || "-"} |`
    )
    .join("\n");
}

async function writeReport({ outputPath, persistTo, beforeCounts, afterCounts, scenarioRows }) {
  const failed = scenarioRows.filter((row) => !row.passed);
  const dbCountsUnchanged = sameCounts(beforeCounts, afterCounts);
  const report = await prettier.format(
    `# P0-001G Employee Entry Live Write Adapter Rehearsal Result

Generated: ${new Date().toISOString()}, Asia/Dubai

Scope: local/staging-only rehearsal. This run used an isolated local D1 directory for evidence only. The adapter generated write plans and \`*_fils\` patches, but it did not write D1, did not execute production migration, did not execute remote D1 migration, did not deploy, did not switch live dashboard results, and did not switch the live employee handover flow.

## Overall

| Item | Result |
| --- | --- |
| Adapter rehearsal | ${failed.length || !dbCountsUnchanged ? "FAIL" : "PASS"} |
| Isolated local D1 | yes |
| D1 rows mutated by adapter | ${dbCountsUnchanged ? "no" : "yes"} |
| Production migration executed | no |
| Remote D1 migration executed | no |
| Live route wired | no |
| Live dashboard changed | no |
| Live handover flow changed | no |
| Legacy decimal fields deleted | no |
| Temporary persist path | \`${persistTo}\` |

## Live Table Mutation Evidence

| Table | Before | After | Changed |
| --- | ---: | ---: | --- |
| sessions | ${beforeCounts.sessions_count || 0} | ${afterCounts.sessions_count || 0} | ${
      beforeCounts.sessions_count === afterCounts.sessions_count ? "no" : "yes"
    } |
| transactions | ${beforeCounts.transactions_count || 0} | ${
      afterCounts.transactions_count || 0
    } | ${beforeCounts.transactions_count === afterCounts.transactions_count ? "no" : "yes"} |
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

| Scenario | Expected Status | Actual Status | Result OK | Scenario Result | Transaction Patch Fields | Session Patch Fields | Deposit Patch Fields | Arrear Patch Fields | Warnings | Errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${renderScenarioRows(scenarioRows)}

## Gate Interpretation

- This proves the employee entry live write adapter can produce minor-unit write patches for rent, deposit collection, deposit refund, checkout deduction, arrears payment, invalid money, and voided-row exclusion.
- This does not approve production migration.
- This does not wire the adapter into \`/api/employee/entry\`.
- This does not switch dashboard or handover live accounting behavior.
- P0-001 remains Partial until local/staging live route wiring, reconciliation, and human review are completed in later tasks.
`,
    { parser: "markdown" }
  );
  await writeFile(outputPath, report, "utf8");
}

export async function runEmployeeEntryLiveWriteAdapterRehearsal() {
  const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-p0-001g-entry-adapter-"));
  const outputPath = path.join(rootDir, "P0_001G_LIVE_WRITE_ADAPTER_REHEARSAL_RESULT.md");

  try {
    await runLocalMigrations({ persistTo });
    runLocalDevSeed({ persistTo });
    const beforeCounts = liveTableCounts(persistTo);
    const scenarioRows = runScenarios();
    const afterCounts = liveTableCounts(persistTo);
    await writeReport({ outputPath, persistTo, beforeCounts, afterCounts, scenarioRows });

    const failed = scenarioRows.filter((row) => !row.passed);
    const dbCountsUnchanged = sameCounts(beforeCounts, afterCounts);
    const cleanup = await removeDirWithRetries(persistTo, {
      label: "P0-001G temp local D1"
    });
    const cleanupResult = cleanup.ok ? "PASS" : "WARNING";

    if (failed.length || !dbCountsUnchanged) {
      throw new Error(
        `P0-001G rehearsal failed: failed_scenarios=${failed.length}, db_counts_unchanged=${dbCountsUnchanged}`
      );
    }

    console.log("P0_001G_ENTRY_ADAPTER_REHEARSAL=PASS");
    console.log(`P0_001G_SCENARIOS=${scenarioRows.length}`);
    console.log(`P0_001G_DB_MUTATIONS=0`);
    console.log(`P0_001G_CLEANUP=${cleanupResult}`);
    console.log(`P0_001G_REPORT=${path.relative(rootDir, outputPath)}`);
    return { outputPath, scenarioRows, beforeCounts, afterCounts, cleanupResult };
  } catch (error) {
    await removeDirWithRetries(persistTo, { label: "P0-001G temp local D1 after failure" });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runEmployeeEntryLiveWriteAdapterRehearsal().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

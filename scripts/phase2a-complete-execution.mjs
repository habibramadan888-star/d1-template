import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "docs");
const schedulePath = path.join(docsDir, "PHASE_2A_DETAILED_SCHEDULE.md");
const resultJsonPath = path.join(docsDir, "PHASE_2A_FEATURE_FLAG_RESULTS.json");
const resultMarkdownPath = path.join(docsDir, "PHASE_2A_FEATURE_FLAG_RESULTS.md");

const days = [
  {
    day: 0,
    title: "Preflight: feature flag infrastructure and production locks",
    flags: ["FF_BACKEND_TOTALS", "FF_RECEIVABLES_STATE", "FF_TENANT_ISOLATION", "FF_AUDIT_TRAIL"],
    purpose:
      "Verify feature flag config defaults are safe and production-only paths remain locked.",
    files: [
      "tests/integration/impl-007-feature-flags-and-migration.test.mjs",
      "tests/feature-flag-production-lock-matrix.spec.mjs"
    ]
  },
  {
    day: 1,
    title: "Backend totals authority staging switch",
    flags: ["ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING"],
    purpose:
      "Validate backend totals staging flag on/off behavior, approved candidate switching, rollback, and production disablement.",
    files: [
      "tests/backend-totals-authority.spec.mjs",
      "tests/backend-totals-shadow.spec.mjs",
      "tests/backend-totals-staging-switch-gate.spec.mjs",
      "tests/backend-totals-staging-switch-rehearsal.spec.mjs"
    ]
  },
  {
    day: 2,
    title: "Receivables shadow and authority staging switches",
    flags: ["ENABLE_RECEIVABLES_SHADOW_STAGING", "ENABLE_RECEIVABLES_AUTHORITY_STAGING"],
    purpose:
      "Validate receivables shadow mode, authority gate candidates, rollback/off behavior, and production disablement.",
    files: [
      "tests/finance-receivables.spec.mjs",
      "tests/receivables.spec.mjs",
      "tests/receivables-staging-shadow-gate.spec.mjs",
      "tests/receivables-staging-shadow-rehearsal.spec.mjs",
      "tests/receivables-staging-authority-switch-gate.spec.mjs",
      "tests/receivables-staging-authority-switch-rehearsal.spec.mjs"
    ]
  },
  {
    day: 3,
    title: "Tenant/property isolation staging switches",
    flags: [
      "ENABLE_TENANT_SCOPE_SHADOW_STAGING",
      "ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING",
      "ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING"
    ],
    purpose:
      "Validate tenant shadow mode, route enforcement, dashboard/history query filtering, combined wiring, rollback/off behavior, and production disablement.",
    files: [
      "tests/tenant-scope-staging-shadow-gate.spec.mjs",
      "tests/tenant-scope-staging-route-enforcement-gate.spec.mjs",
      "tests/tenant-scope-staging-dashboard-history-query-gate.spec.mjs",
      "tests/tenant-scope-staging-wiring-gate.spec.mjs",
      "tests/tenant-scope-staging-wiring-rehearsal.spec.mjs",
      "tests/tenant-scope-staging-access-matrix-rehearsal.spec.mjs"
    ]
  },
  {
    day: 4,
    title: "Audit trail evidence and scoped audit visibility",
    flags: ["FF_AUDIT_TRAIL", "existing audit_logs / entry_events evidence"],
    purpose:
      "Validate audit trail configuration, scoped audit evidence, entry event coverage, and staging handover audit writes.",
    files: [
      "tests/tenant-scope-audit-entry-events.spec.mjs",
      "tests/tenant-scope-access-matrix.spec.mjs",
      "tests/handover-staging-endpoint.spec.mjs",
      "tests/employee-entry-route-switch-rehearsal.spec.mjs"
    ]
  },
  {
    day: 5,
    title: "All staging flags integration and rollback rehearsal",
    flags: [
      "ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING",
      "ENABLE_RECEIVABLES_AUTHORITY_STAGING",
      "ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING",
      "ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING"
    ],
    purpose:
      "Validate combined flag behavior with representative staging gates, rollback/off mode, and no production mutation.",
    files: [
      "tests/backend-totals-staging-switch-rehearsal.spec.mjs",
      "tests/receivables-staging-authority-switch-rehearsal.spec.mjs",
      "tests/tenant-scope-staging-wiring-rehearsal.spec.mjs",
      "tests/handover-staging-endpoint.spec.mjs"
    ]
  }
];

function parseTap(output) {
  const readNumber = (label) => {
    const match = output.match(new RegExp(`# ${label}\\s+(\\d+)`));
    return match ? Number(match[1]) : 0;
  };
  const durationMatch = output.match(/# duration_ms\s+([0-9.]+)/);
  return {
    tests: readNumber("tests"),
    pass: readNumber("pass"),
    fail: readNumber("fail"),
    cancelled: readNumber("cancelled"),
    skipped: readNumber("skipped"),
    todo: readNumber("todo"),
    durationMs: durationMatch ? Number(durationMatch[1]) : 0
  };
}

function runDay(day) {
  console.log(`\n[Day ${day.day}] ${day.title}`);
  console.log(`Flags: ${day.flags.join(", ")}`);
  const args = ["--test", "--test-concurrency=1", "--test-reporter=tap", ...day.files];
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  const finishedAt = new Date().toISOString();
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const parsed = parseTap(output);
  const passed = result.status === 0 && parsed.fail === 0 && parsed.cancelled === 0;
  const elapsedMs = Date.now() - startedMs;

  console.log(
    `${passed ? "PASS" : "FAIL"} tests=${parsed.tests} pass=${parsed.pass} fail=${parsed.fail} duration=${Math.round(
      elapsedMs / 1000
    )}s`
  );

  return {
    ...day,
    startedAt,
    finishedAt,
    command: `${process.execPath} ${args.join(" ")}`,
    exitCode: result.status,
    passed,
    ...parsed,
    elapsedMs,
    outputTail: output.slice(-12000)
  };
}

function writeSchedule() {
  const daySections = days
    .filter((day) => day.day > 0)
    .map(
      (day) => `## Day ${day.day}: ${day.title}

**Flags:** ${day.flags.map((flag) => `\`${flag}\``).join(", ")}

**Purpose:** ${day.purpose}

### Morning

- [ ] Confirm prior day rollback/off state is clean.
- [ ] Confirm target flags are disabled before starting.
- [ ] Review expected metrics: error rate, latency, audit/entry-event counts, and rollback behavior.

### Enablement Window

- [ ] Enable target flag(s) in staging/local-staging only.
- [ ] Run the listed automated validation files.
- [ ] Record before/during/after flag states.
- [ ] Confirm production mode remains disabled even if the flag is set.

### Validation Files

${day.files.map((file) => `- \`${file}\``).join("\n")}

### Exit Criteria

- [ ] All listed validations pass.
- [ ] Rollback/off behavior is verified.
- [ ] No production deploy, remote D1 write, or production migration occurred.
- [ ] Results are attached to the Phase 2A evidence packet.
`
    )
    .join("\n");

  return `# Phase 2A Detailed Feature Flag Schedule

Generated: ${new Date().toISOString()}

Environment: local/staging validation only.

Production status: \`PRODUCTION_NO_GO\`.

## Flag Mapping

| Business Flag | Current Repository Flag(s) | Notes |
| --- | --- | --- |
| Backend totals authority | \`ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING\` | Staging switch candidate only; production disabled by tests. |
| Receivables state machine | \`ENABLE_RECEIVABLES_SHADOW_STAGING\`, \`ENABLE_RECEIVABLES_AUTHORITY_STAGING\` | Shadow mode first, authority switch rehearsal after approved candidates. |
| Tenant/property isolation | \`ENABLE_TENANT_SCOPE_SHADOW_STAGING\`, \`ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING\`, \`ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING\` | Split across shadow, route enforcement, and query filtering. |
| Audit trail | \`FF_AUDIT_TRAIL\` plus current \`audit_logs\` / \`entry_events\` evidence | Config flag exists; current automated evidence validates scoped audit rows and staging writes. |

## Preflight

- [ ] Verify all flags default to safe/off.
- [ ] Verify production remains disabled even if staging flags are true.
- [ ] Verify rollback/off behavior is part of every switch rehearsal.

${daySections}
`;
}

function markdownReport(payload) {
  const rows = payload.results
    .map(
      (result) =>
        `| ${result.day} | ${result.title} | ${result.passed ? "PASS" : "FAIL"} | ${result.pass}/${result.tests} | ${result.fail} | ${Math.round(
          result.elapsedMs / 1000
        )}s |`
    )
    .join("\n");
  const failedDetails = payload.results
    .filter((result) => !result.passed)
    .map(
      (result) => `### Day ${result.day}: ${result.title}

\`\`\`text
${result.outputTail}
\`\`\``
    )
    .join("\n\n");

  return `# Phase 2A Feature Flag Enablement Results

Generated: ${payload.finishedAt}

Environment: local/staging automated feature-flag validation.

Decision: ${payload.decision}

## Summary

| Metric | Value |
| --- | ---: |
| Validation windows | ${payload.results.length} |
| Windows passed | ${payload.windowsPassed} |
| Assertions run | ${payload.tests} |
| Assertions passed | ${payload.pass} |
| Assertions failed | ${payload.fail} |
| Cancelled | ${payload.cancelled} |
| Skipped | ${payload.skipped} |
| Duration | ${Math.round(payload.elapsedMs / 1000)}s |

## Results By Day / Window

| Day | Window | Status | Assertions | Failures | Duration |
| ---: | --- | --- | ---: | ---: | ---: |
${rows}

## Validated Behavior

- Safe default/off behavior for declared feature flags.
- Staging flag on behavior for backend totals, receivables, and tenant-scope candidates.
- Rollback/off behavior for staging switch rehearsals.
- Production disabled behavior even when staging flags are set.
- Audit trail evidence through scoped \`audit_logs\`, \`entry_events\`, and handover staging writes.

## Important Constraint

This report proves automated local/staging flag behavior. It does not mean production flags have been enabled or that production is ready for launch. Production remains \`PRODUCTION_NO_GO\`.

${failedDetails ? `## Failure Details\n\n${failedDetails}\n\n` : ""}## Recommendation

${payload.decision === "GO" ? "Proceed with the 5-day Phase 2A staging schedule, using the generated schedule as the daily runbook." : "Do not proceed until failed flag windows are fixed and rerun."}
`;
}

async function main() {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  console.log("PHASE 2A FEATURE FLAG ENABLEMENT VALIDATION");
  console.log(`Started: ${startedAt}`);

  mkdirSync(docsDir, { recursive: true });
  writeFileSync(schedulePath, writeSchedule());

  const results = days.map(runDay);
  const finishedAt = new Date().toISOString();
  const summary = results.reduce(
    (acc, result) => {
      acc.tests += result.tests;
      acc.pass += result.pass;
      acc.fail += result.fail;
      acc.cancelled += result.cancelled;
      acc.skipped += result.skipped;
      acc.todo += result.todo;
      if (result.passed) acc.windowsPassed += 1;
      return acc;
    },
    { tests: 0, pass: 0, fail: 0, cancelled: 0, skipped: 0, todo: 0, windowsPassed: 0 }
  );
  const decision = results.every((result) => result.passed) ? "GO" : "NO-GO";
  const payload = {
    startedAt,
    finishedAt,
    decision,
    ...summary,
    results,
    elapsedMs: Date.now() - startedMs
  };

  writeFileSync(resultJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(resultMarkdownPath, markdownReport(payload));

  console.log("\nSUMMARY");
  console.log(`Decision: ${decision}`);
  console.log(`Windows: ${summary.windowsPassed}/${days.length}`);
  console.log(`Assertions: ${summary.pass}/${summary.tests} pass, ${summary.fail} fail`);
  console.log(`Schedule: ${path.relative(rootDir, schedulePath)}`);
  console.log(`Report: ${path.relative(rootDir, resultMarkdownPath)}`);

  if (decision !== "GO") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

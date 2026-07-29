import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "docs");
const jsonPath = path.join(docsDir, "PHASE_1_COMPLETE_RESULTS.json");
const markdownPath = path.join(docsDir, "PHASE_1_COMPLETE_RESULTS.md");

const sections = [
  {
    id: "entry-write-paths",
    title: "Entry Write Path Validation",
    scope:
      "Validates employee entry draft creation, commercial write plans, live-write adapter behavior, staging endpoint gating, route switch rehearsal, and production lock behavior.",
    files: [
      "tests/employee-entry-draft.spec.mjs",
      "tests/employee-entry-commercial-adapter.spec.mjs",
      "tests/employee-entry-commercial-handler.spec.mjs",
      "tests/employee-entry-live-write-adapter.spec.mjs",
      "tests/employee-entry-route-switch-rehearsal.spec.mjs",
      "tests/employee-entry-adapter-staging-endpoint.spec.mjs",
      "tests/employee-entry-production-behavior-lock.spec.mjs"
    ]
  },
  {
    id: "payment-and-backend-totals",
    title: "Payment, Handover, and Backend Totals",
    scope:
      "Validates payment/handover classification, backend totals authority, shadow totals, staging switch gates, and integer backend aggregation.",
    files: [
      "tests/finance-handover.spec.mjs",
      "tests/backend-totals-authority.spec.mjs",
      "tests/backend-totals-shadow.spec.mjs",
      "tests/backend-totals-staging-switch-gate.spec.mjs",
      "tests/backend-totals-staging-switch-rehearsal.spec.mjs"
    ]
  },
  {
    id: "receivables-state",
    title: "Receivables State and Authority",
    scope:
      "Validates receivable settlement behavior, staging shadow comparison, authority switch gates, rollback behavior, and dashboard non-mutation.",
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
    id: "money-precision",
    title: "Money Precision",
    scope:
      "Validates AED-to-fils conversion, integer-only arithmetic, shadow money comparisons, dual-write safety, and local/staging reconciliation behavior.",
    files: [
      "tests/finance-money.spec.mjs",
      "tests/money.spec.mjs",
      "tests/money-shadow.spec.mjs",
      "tests/money-dual-write.spec.mjs",
      "tests/money-dual-write-local-staging.spec.mjs"
    ]
  },
  {
    id: "atomicity-audit-and-isolation",
    title: "Atomicity, Audit, and Isolation",
    scope:
      "Validates handover atomic request rules, staging handover endpoint idempotency/rollback evidence, audit event scope, and tenant access matrix behavior.",
    files: [
      "tests/handover-atomic.design.spec.mjs",
      "tests/handover-atomic-rehearsal.spec.mjs",
      "tests/handover-staging-endpoint.spec.mjs",
      "tests/tenant-scope-audit-entry-events.spec.mjs",
      "tests/tenant-scope-access-matrix.spec.mjs"
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

function runSection(section) {
  console.log(`\n[${section.title}]`);
  console.log(section.scope);
  const args = ["--test", "--test-concurrency=1", "--test-reporter=tap", ...section.files];
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
    ...section,
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

function markdownReport(payload) {
  const sectionRows = payload.sections
    .map(
      (section) =>
        `| ${section.title} | ${section.passed ? "PASS" : "FAIL"} | ${section.pass}/${section.tests} | ${section.fail} | ${Math.round(
          section.elapsedMs / 1000
        )}s |`
    )
    .join("\n");
  const fileList = payload.sections
    .flatMap((section) => section.files.map((file) => `- ${section.title}: \`${file}\``))
    .join("\n");
  const failedDetails = payload.sections
    .filter((section) => !section.passed)
    .map(
      (section) => `### ${section.title}

\`\`\`text
${section.outputTail}
\`\`\``
    )
    .join("\n\n");

  return `# Phase 1 Complete Write Operations Validation

Generated: ${payload.finishedAt}

Environment: Local test/rehearsal suite. No deploy, no remote D1 write, no production migration.

Decision: ${payload.decision}

## Summary

| Metric | Value |
| --- | ---: |
| Sections | ${payload.sections.length} |
| Sections passed | ${payload.sectionsPassed} |
| Test assertions run | ${payload.tests} |
| Test assertions passed | ${payload.pass} |
| Test assertions failed | ${payload.fail} |
| Cancelled | ${payload.cancelled} |
| Skipped | ${payload.skipped} |
| Duration | ${Math.round(payload.elapsedMs / 1000)}s |

## Results By Section

| Section | Status | Assertions | Failures | Duration |
| --- | --- | ---: | ---: | ---: |
${sectionRows}

## Scope Validated

- Entry write paths: draft generation, commercial adapter, live-write adapter, route switch rehearsal, staging endpoint gate, and production lock.
- Payment and backend totals: handover classification, backend totals authority, shadow totals, staging switch gates, and integer aggregation.
- Receivables: settlement scenarios, shadow comparison, authority switch gates, rollback behavior, and dashboard non-mutation.
- Money precision: AED/fils parsing, integer-only arithmetic, dual-write safety, and local/staging reconciliation.
- Atomicity/audit/isolation: handover idempotency and rejection behavior, audit event scope, and tenant access matrix.

## Files Executed

${fileList}

## Important Constraint

This is not a claim that arbitrary production write endpoints are live. The current validation covers the repository's supported local/staging write paths and rehearsals. Production remains \`PRODUCTION_NO_GO\`.

${failedDetails ? `## Failure Details\n\n${failedDetails}\n\n` : ""}## Recommendation

${payload.decision === "GO" ? "Proceed to Phase 2a feature flag enablement planning, keeping production switches disabled." : "Do not proceed to Phase 2a until the failed Phase 1 sections are fixed and rerun."}
`;
}

async function main() {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  console.log("PHASE 1 COMPLETE WRITE OPERATIONS VALIDATION");
  console.log(`Started: ${startedAt}`);

  const results = sections.map(runSection);
  const finishedAt = new Date().toISOString();
  const summary = results.reduce(
    (acc, section) => {
      acc.tests += section.tests;
      acc.pass += section.pass;
      acc.fail += section.fail;
      acc.cancelled += section.cancelled;
      acc.skipped += section.skipped;
      acc.todo += section.todo;
      if (section.passed) acc.sectionsPassed += 1;
      return acc;
    },
    { tests: 0, pass: 0, fail: 0, cancelled: 0, skipped: 0, todo: 0, sectionsPassed: 0 }
  );
  const decision = results.every((section) => section.passed) ? "GO" : "NO-GO";
  const payload = {
    startedAt,
    finishedAt,
    decision,
    ...summary,
    sections: results,
    elapsedMs: Date.now() - startedMs
  };

  mkdirSync(docsDir, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(markdownPath, markdownReport(payload));

  console.log("\nSUMMARY");
  console.log(`Decision: ${decision}`);
  console.log(`Sections: ${summary.sectionsPassed}/${sections.length}`);
  console.log(`Assertions: ${summary.pass}/${summary.tests} pass, ${summary.fail} fail`);
  console.log(`Report: ${path.relative(rootDir, markdownPath)}`);

  if (decision !== "GO") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

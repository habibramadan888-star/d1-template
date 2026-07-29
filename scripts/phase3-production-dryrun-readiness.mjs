import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "docs");

const resultJsonPath = path.join(docsDir, "PHASE_3_DRYRUN_READINESS_RESULTS.json");
const resultMarkdownPath = path.join(docsDir, "PHASE_3_DRYRUN_READINESS_RESULTS.md");
const runbookPath = path.join(docsDir, "PHASE_3_PRODUCTION_DRYRUN.md");
const riskPath = path.join(docsDir, "PHASE_3_RISK_ASSESSMENT.md");
const checklistPath = path.join(docsDir, "PHASE_3_EXECUTION_CHECKLIST.md");

const gateOutputs = [
  path.join(rootDir, "COMMERCIAL_LAUNCH_READINESS_MATRIX.md"),
  path.join(rootDir, "COMMERCIAL_LAUNCH_READINESS_RESULT.md")
];

const phaseEvidence = [
  {
    phase: "Phase 0",
    file: "docs/PHASE_0_TEST_RESULTS_FINAL.json",
    expected: { decision: "GO", passField: "passed", totalField: "totalTests" }
  },
  {
    phase: "Phase 1",
    file: "docs/PHASE_1_COMPLETE_RESULTS.json",
    expected: { decision: "GO", passField: "pass", totalField: "tests" }
  },
  {
    phase: "Phase 2A",
    file: "docs/PHASE_2A_FEATURE_FLAG_RESULTS.json",
    expected: { decision: "GO", passField: "pass", totalField: "tests" }
  }
];

const validationWindows = [
  {
    id: "production-locks",
    title: "Production locks and source safety",
    purpose:
      "Confirm production-only behavior remains locked, route/auth entry points are closed, and feature flags do not enable production paths.",
    files: [
      "tests/source-risk.spec.mjs",
      "tests/feature-flag-production-lock-matrix.spec.mjs",
      "tests/auth-single-entry-routing.spec.mjs"
    ]
  },
  {
    id: "feature-rollback-rehearsals",
    title: "Feature switch and rollback rehearsals",
    purpose:
      "Re-run representative backend totals, receivables, tenant-scope, and handover staging switch rehearsals before a production-copy dry-run.",
    files: [
      "tests/backend-totals-staging-switch-rehearsal.spec.mjs",
      "tests/receivables-staging-authority-switch-rehearsal.spec.mjs",
      "tests/tenant-scope-staging-wiring-rehearsal.spec.mjs",
      "tests/handover-staging-endpoint.spec.mjs"
    ]
  },
  {
    id: "audit-isolation-atomicity",
    title: "Audit, isolation, and atomicity evidence",
    purpose:
      "Confirm tenant audit visibility, tenant access matrix decisions, and handover atomic request behavior remain valid.",
    files: [
      "tests/tenant-scope-audit-entry-events.spec.mjs",
      "tests/tenant-scope-access-matrix.spec.mjs",
      "tests/handover-atomic-rehearsal.spec.mjs"
    ]
  }
];

function readJson(relativeFile) {
  const absoluteFile = path.join(rootDir, relativeFile);
  if (!existsSync(absoluteFile)) {
    return { ok: false, reason: "missing", file: relativeFile };
  }

  try {
    return { ok: true, file: relativeFile, data: JSON.parse(readFileSync(absoluteFile, "utf8")) };
  } catch (error) {
    return { ok: false, reason: `invalid json: ${error.message}`, file: relativeFile };
  }
}

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

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 96 * 1024 * 1024,
    ...options
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  return {
    command: `${command} ${args.join(" ")}`,
    exitCode: result.status,
    error: result.error ? result.error.message : null,
    output,
    outputTail: output.slice(-12000)
  };
}

function validatePhaseEvidence() {
  return phaseEvidence.map((evidence) => {
    const loaded = readJson(evidence.file);
    if (!loaded.ok) {
      return { ...evidence, passed: false, reason: loaded.reason };
    }

    const pass = Number(loaded.data[evidence.expected.passField] || 0);
    const total = Number(loaded.data[evidence.expected.totalField] || 0);
    const decision = loaded.data.decision;
    const passed = decision === evidence.expected.decision && pass === total && total > 0;

    return {
      ...evidence,
      passed,
      decision,
      pass,
      total,
      generatedAt:
        loaded.data.finishedAt || loaded.data.timestamp || loaded.data.startedAt || "unknown",
      reason: passed ? "phase evidence complete" : "phase evidence does not meet GO/pass criteria"
    };
  });
}

function runValidationWindow(window) {
  console.log(`\n[${window.id}] ${window.title}`);
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const args = ["--test", "--test-concurrency=1", "--test-reporter=tap", ...window.files];
  const result = runCommand(process.execPath, args);
  const parsed = parseTap(result.output);
  const finishedAt = new Date().toISOString();
  const elapsedMs = Date.now() - startedMs;
  const passed =
    result.exitCode === 0 && parsed.tests > 0 && parsed.fail === 0 && parsed.cancelled === 0;

  console.log(
    `${passed ? "PASS" : "FAIL"} tests=${parsed.tests} pass=${parsed.pass} fail=${parsed.fail} elapsed=${Math.round(
      elapsedMs / 1000
    )}s`
  );

  return {
    ...window,
    startedAt,
    finishedAt,
    elapsedMs,
    command: result.command,
    exitCode: result.exitCode,
    error: result.error,
    outputTail: result.outputTail,
    ...parsed,
    passed
  };
}

function runCommercialLaunchGate() {
  const snapshots = new Map();
  for (const file of gateOutputs) {
    snapshots.set(file, existsSync(file) ? readFileSync(file, "utf8") : null);
  }

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const result = runCommand(process.execPath, ["scripts/gate-commercial-launch-readiness.mjs"]);
  const finishedAt = new Date().toISOString();

  for (const [file, content] of snapshots.entries()) {
    if (content !== null) {
      writeFileSync(file, content);
    }
  }

  const productionNoGo = result.output.includes("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO");
  const passed = result.exitCode === 0 && productionNoGo;

  console.log(`\n[commercial-launch-gate] ${passed ? "PASS" : "FAIL"}`);
  console.log(`PRODUCTION_NO_GO=${productionNoGo}`);

  return {
    id: "commercial-launch-gate",
    title: "Commercial launch gate remains locked",
    startedAt,
    finishedAt,
    elapsedMs: Date.now() - startedMs,
    exitCode: result.exitCode,
    command: result.command,
    passed,
    productionNoGo,
    outputTail: result.outputTail
  };
}

function buildRunbook() {
  return `# Phase 3 Production-Copy Dry-Run Runbook

Generated: ${new Date().toISOString()}

Status: ready for human-scheduled production-copy dry-run preparation.

Important boundary: this repository runbook does not deploy, migrate, write remote D1, enable production flags, or claim 24-hour stability. Production remains \`PRODUCTION_NO_GO\` until the dry-run is executed and signed off.

## Scope

Phase 3 validates the release candidate against a production-copy environment with production-like data, monitoring, and rollback rehearsals. The dry-run must use copied data and isolated bindings only.

## Required Inputs Before Starting

- [ ] Production-copy Worker environment name and URL are documented.
- [ ] Production-copy D1 database is restored from a known backup snapshot.
- [ ] Production-copy KV/R2/secret bindings are isolated from production.
- [ ] Feature flags are initially disabled.
- [ ] Monitoring dashboards and alert channels are active.
- [ ] Rollback owner and incident commander are assigned.
- [ ] Finance, QA, Engineering, Product, and owner/CEO sign-off owners are available.

## Day 1: Baseline With Flags Off

- [ ] Deploy release candidate to production-copy only.
- [ ] Confirm all feature flags are disabled.
- [ ] Run Phase 0 smoke tests against production-copy.
- [ ] Run read-only dashboard/history/arrears verification.
- [ ] Establish p50, p95, p99 latency baselines.
- [ ] Confirm audit and error logs are flowing.
- [ ] Confirm no writes are pointed at production resources.

## Day 2: Controlled Flag Enablement

- [ ] Enable backend totals authority in production-copy only.
- [ ] Monitor for 1 hour and compare totals against legacy output.
- [ ] Enable receivables authority in production-copy only.
- [ ] Monitor for 2 hours and compare outstanding/paid/voided behavior.
- [ ] Enable tenant isolation switches in production-copy only.
- [ ] Run cross-tenant and cross-property isolation checks.
- [ ] Enable audit trail checks and confirm coverage.

## Day 3-4: 24-Hour Stability Window

- [ ] Keep all approved production-copy flags enabled for 24 hours.
- [ ] Run scheduled smoke tests at least hourly.
- [ ] Track error rate, latency, queue/backlog behavior, and DB query latency.
- [ ] Spot-check at least 100 money transactions with finance.
- [ ] Verify audit trail completeness for sampled writes.
- [ ] Execute rollback rehearsal and confirm restore below the target RTO.

## Exit Criteria

- [ ] No critical defects or unresolved data-integrity findings.
- [ ] Error rate stays below the agreed threshold for the full window.
- [ ] p95 latency remains within the approved dry-run baseline.
- [ ] Finance confirms sampled money precision and receivables behavior.
- [ ] QA confirms smoke and write-operation coverage.
- [ ] Engineering confirms rollback evidence and environment separation.
- [ ] Product confirms user workflow acceptance.
- [ ] Owner/CEO gives final production approval.

## Explicit Non-Goals

- No production deployment.
- No production D1 migration.
- No production feature-flag enablement.
- No live accounting authority switch.
- No claim of 24-hour PASS until the 24-hour production-copy window has actually completed.
`;
}

function buildRiskAssessment() {
  return `# Phase 3 Risk Assessment

Generated: ${new Date().toISOString()}

Production status: \`PRODUCTION_NO_GO\`.

## Risk Register

| Risk | Severity | Current Control | Phase 3 Requirement |
| --- | --- | --- | --- |
| Production resource mix-up | Critical | Production gate and environment-separation checks | Verify every binding points to production-copy before deploy. |
| Money precision regression | Critical | Integer-fils tests and Phase 1 evidence | Finance spot-check 100 sampled transactions during dry-run. |
| Receivables state drift | High | Receivables authority switch rehearsals | Compare legacy and authority results before and after flag enablement. |
| Tenant/property data leak | Critical | Tenant access matrix and audit-event tests | Run cross-tenant and cross-property probes against production-copy. |
| Handover duplicate or partial write | High | Idempotency and staging handover endpoint tests | Execute retry and mismatch tests in production-copy only. |
| Rollback delay | High | Rollback runbooks and no-go gate | Time rollback rehearsal and document RTO evidence. |
| Missing monitoring signal | High | Observability readiness audit | Confirm live dashboard, alert routing, and log retention before Day 1. |
| False PASS reporting | Critical | This package separates readiness from execution | Only mark Phase 3 PASS after real dry-run evidence is attached. |

## Rollback Triggers

- Error rate exceeds approved threshold for 5 minutes.
- p95 latency exceeds dry-run baseline by more than the approved tolerance.
- Any money discrepancy above 0 fils is detected.
- Any cross-tenant or cross-property access leak is detected.
- Any write operation creates partial state or duplicate financial results.
- Monitoring, audit logging, or rollback tooling stops producing evidence.

## Required Human Sign-Offs

- Finance Lead: money precision, receivables, and reconciliation.
- Engineering Lead: code quality, rollback, observability, and environment separation.
- QA Lead: smoke, write, failure, and regression coverage.
- Product Manager: business workflow acceptance.
- Owner/CEO: final production approval.
`;
}

function buildChecklist() {
  return `# Phase 3 Execution Checklist

Generated: ${new Date().toISOString()}

## Before Production-Copy Deployment

- [ ] Confirm production remains \`PRODUCTION_NO_GO\`.
- [ ] Confirm written approval to use production-copy resources.
- [ ] Confirm production-copy D1 backup/restore source and timestamp.
- [ ] Confirm production-copy secrets do not target production services.
- [ ] Confirm all feature flags are initially disabled.
- [ ] Confirm monitoring and alerting destinations are active.

## Baseline Verification

- [ ] Run Phase 0 smoke suite against production-copy.
- [ ] Verify dashboard totals with flags disabled.
- [ ] Verify entries, history, customers, arrears, owner, and admin read paths.
- [ ] Record latency baseline and error-rate baseline.
- [ ] Confirm audit logs are visible and scoped.

## Flag Enablement

- [ ] Enable backend totals authority and monitor 1 hour.
- [ ] Enable receivables authority and monitor 2 hours.
- [ ] Enable tenant isolation and run leak probes.
- [ ] Enable audit trail checks and verify write evidence.
- [ ] Disable flags and confirm rollback/off behavior.
- [ ] Re-enable approved flags for extended stability only if rollback passes.

## 24-Hour Window

- [ ] Keep hourly smoke evidence.
- [ ] Keep hourly metric snapshots.
- [ ] Capture all incidents, warnings, and mitigations.
- [ ] Spot-check 100 finance transactions.
- [ ] Verify rollback rehearsal time and outcome.

## Final Decision

- [ ] Finance sign-off complete.
- [ ] Engineering sign-off complete.
- [ ] QA sign-off complete.
- [ ] Product sign-off complete.
- [ ] Owner/CEO sign-off complete.
- [ ] Final decision recorded: GO or NO-GO.
`;
}

function buildMarkdownReport(payload) {
  const phaseRows = payload.phaseEvidence
    .map(
      (item) =>
        `| ${item.phase} | ${item.passed ? "PASS" : "FAIL"} | ${item.pass ?? 0}/${item.total ?? 0} | ${item.decision ?? "n/a"} | \`${item.file}\` |`
    )
    .join("\n");
  const windowRows = payload.validationWindows
    .map(
      (item) =>
        `| ${item.title} | ${item.passed ? "PASS" : "FAIL"} | ${item.pass}/${item.tests} | ${item.fail} | ${Math.round(
          item.elapsedMs / 1000
        )}s |`
    )
    .join("\n");
  const failedDetails = payload.validationWindows
    .filter((item) => !item.passed)
    .map(
      (item) => `### ${item.title}

\`\`\`text
${item.outputTail}
\`\`\``
    )
    .join("\n\n");

  return `# Phase 3 Dry-Run Readiness Results

Generated: ${payload.finishedAt}

Decision: ${payload.decision}

Production status: \`PRODUCTION_NO_GO\`.

## What This Result Means

This report validates local repository readiness to schedule a production-copy dry-run. It is not a production deployment result, not a production-copy deployment result, and not a 24-hour stability PASS.

## Prior Phase Evidence

| Phase | Status | Assertions/Tests | Decision | Evidence |
| --- | --- | ---: | --- | --- |
${phaseRows}

## Current Readiness Validation

| Window | Status | Assertions | Failures | Duration |
| --- | --- | ---: | ---: | ---: |
${windowRows}
| Commercial launch gate | ${payload.gate.passed ? "PASS" : "FAIL"} | n/a | n/a | ${Math.round(payload.gate.elapsedMs / 1000)}s |

## Summary

| Metric | Value |
| --- | ---: |
| Prior phases checked | ${payload.phaseEvidence.length} |
| Prior phases passed | ${payload.phaseEvidencePassed} |
| Readiness windows | ${payload.validationWindows.length} |
| Readiness windows passed | ${payload.validationWindowsPassed} |
| Assertions run now | ${payload.tests} |
| Assertions passed now | ${payload.pass} |
| Assertions failed now | ${payload.fail} |
| Cancelled now | ${payload.cancelled} |
| Duration | ${Math.round(payload.elapsedMs / 1000)}s |

## Verified Boundaries

- No production deployment was performed.
- No production-copy deployment was performed.
- No remote D1 migration was performed.
- No production feature flag was enabled.
- The commercial launch gate still reports \`PRODUCTION_NO_GO\`.

## Required Before Marking Phase 3 PASS

- Execute the dry-run against a real production-copy environment.
- Capture 24-hour monitoring evidence.
- Attach finance spot-check evidence for money precision.
- Attach rollback timing evidence.
- Collect all required human sign-offs.

${failedDetails ? `## Failure Details\n\n${failedDetails}\n\n` : ""}## Recommendation

${payload.decision === "READY_FOR_PHASE3_PLANNING" ? "Schedule Phase 3 production-copy dry-run preparation. Do not deploy to production or mark Phase 3 PASS yet." : "Do not schedule Phase 3 until the failed readiness checks are fixed and rerun."}
`;
}

async function main() {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  console.log("PHASE 3 PRODUCTION-COPY DRY-RUN READINESS");
  console.log(`Started: ${startedAt}`);

  mkdirSync(docsDir, { recursive: true });
  writeFileSync(runbookPath, buildRunbook());
  writeFileSync(riskPath, buildRiskAssessment());
  writeFileSync(checklistPath, buildChecklist());

  const phaseResults = validatePhaseEvidence();
  const validationResults = validationWindows.map(runValidationWindow);
  const gate = runCommercialLaunchGate();

  const summary = validationResults.reduce(
    (acc, result) => {
      acc.tests += result.tests;
      acc.pass += result.pass;
      acc.fail += result.fail;
      acc.cancelled += result.cancelled;
      acc.skipped += result.skipped;
      acc.todo += result.todo;
      if (result.passed) acc.validationWindowsPassed += 1;
      return acc;
    },
    {
      tests: 0,
      pass: 0,
      fail: 0,
      cancelled: 0,
      skipped: 0,
      todo: 0,
      validationWindowsPassed: 0
    }
  );

  const phaseEvidencePassed = phaseResults.filter((result) => result.passed).length;
  const allPassed =
    phaseEvidencePassed === phaseResults.length &&
    summary.validationWindowsPassed === validationResults.length &&
    gate.passed;
  const finishedAt = new Date().toISOString();
  const payload = {
    startedAt,
    finishedAt,
    decision: allPassed ? "READY_FOR_PHASE3_PLANNING" : "BLOCKED",
    phaseEvidence: phaseResults,
    phaseEvidencePassed,
    validationWindows: validationResults,
    gate,
    ...summary,
    elapsedMs: Date.now() - startedMs
  };

  writeFileSync(resultJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(resultMarkdownPath, buildMarkdownReport(payload));

  console.log("\nSUMMARY");
  console.log(`Decision: ${payload.decision}`);
  console.log(`Prior phases: ${phaseEvidencePassed}/${phaseResults.length}`);
  console.log(`Readiness windows: ${summary.validationWindowsPassed}/${validationResults.length}`);
  console.log(`Assertions now: ${summary.pass}/${summary.tests} pass, ${summary.fail} fail`);
  console.log(`Report: ${path.relative(rootDir, resultMarkdownPath)}`);

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "docs");
const reportPath = path.join(docsDir, "PHASE_3_EXECUTION_SIMULATION_REPORT.md");
const resultPath = path.join(docsDir, "PHASE_3_EXECUTION_SIMULATION_RESULTS.json");
const gateOutputs = [
  path.join(rootDir, "COMMERCIAL_LAUNCH_READINESS_MATRIX.md"),
  path.join(rootDir, "COMMERCIAL_LAUNCH_READINESS_RESULT.md")
];
const generatedFilesRestoredAfterEvidenceRead = [
  ...gateOutputs,
  path.join(rootDir, "docs/PHASE_3_DRYRUN_READINESS_RESULTS.json"),
  path.join(rootDir, "docs/PHASE_3_DRYRUN_READINESS_RESULTS.md"),
  path.join(rootDir, "docs/PHASE_3_MONITORING_SAMPLE_RESULT.json"),
  path.join(rootDir, "docs/PHASE_3_MONITORING_SAMPLE_RESULT.md"),
  path.join(rootDir, "docs/PHASE_3_PRODUCTION_DRYRUN.md"),
  path.join(rootDir, "docs/PHASE_3_RISK_ASSESSMENT.md"),
  path.join(rootDir, "docs/PHASE_3_EXECUTION_CHECKLIST.md")
];

const requiredRunbooks = [
  "docs/PHASE_3_PRODUCTION_DRYRUN.md",
  "docs/PHASE_3_EXECUTION_RUNBOOK.md",
  "docs/PHASE_3_REALTIME_MONITORING_RUNBOOK.md",
  "docs/PHASE_3_ROLLBACK_RUNBOOK.md",
  "docs/PHASE_3_TEAM_PREPARATION.md",
  "docs/PHASE_3_EXECUTION_CHECKLIST.md",
  "docs/PHASE_3_RISK_ASSESSMENT.md",
  "docs/REMAINING_WORK_FOR_PHASE3_LAUNCH.md"
];

const phaseEvidenceFiles = [
  {
    id: "phase-0",
    label: "Phase 0 readonly smoke",
    file: "docs/PHASE_0_TEST_RESULTS_FINAL.json",
    passField: "passed",
    totalField: "totalTests"
  },
  {
    id: "phase-1",
    label: "Phase 1 write operation validation",
    file: "docs/PHASE_1_COMPLETE_RESULTS.json",
    passField: "pass",
    totalField: "tests"
  },
  {
    id: "phase-2a",
    label: "Phase 2A feature flag validation",
    file: "docs/PHASE_2A_FEATURE_FLAG_RESULTS.json",
    passField: "pass",
    totalField: "tests"
  },
  {
    id: "phase-3-readiness",
    label: "Phase 3 readiness rehearsal",
    file: "docs/PHASE_3_DRYRUN_READINESS_RESULTS.json",
    passField: "pass",
    totalField: "tests"
  }
];

function readJson(relativeFile) {
  const absoluteFile = path.join(rootDir, relativeFile);
  if (!existsSync(absoluteFile)) {
    return { ok: false, reason: "missing" };
  }

  try {
    return { ok: true, data: JSON.parse(readFileSync(absoluteFile, "utf8")) };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

function runCommand(command, args) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 96 * 1024 * 1024
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;

  return {
    command: `${command} ${args.join(" ")}`,
    startedAt,
    finishedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedMs,
    exitCode: result.status,
    error: result.error ? result.error.message : null,
    outputTail: output.slice(-12000)
  };
}

function runGateWithoutDrift() {
  const result = runCommand(process.execPath, ["scripts/gate-commercial-launch-readiness.mjs"]);
  const productionNoGo = result.outputTail.includes("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO");
  return {
    ...result,
    productionNoGo,
    passed: result.exitCode === 0 && productionNoGo
  };
}

function snapshotFiles(files) {
  const snapshot = new Map();
  for (const file of files) {
    snapshot.set(file, existsSync(file) ? readFileSync(file, "utf8") : null);
  }
  return snapshot;
}

function restoreFiles(snapshot) {
  for (const [file, content] of snapshot.entries()) {
    if (content === null) {
      if (existsSync(file)) {
        rmSync(file);
      }
      continue;
    }
    writeFileSync(file, content);
  }
}

function collectPhaseEvidence() {
  return phaseEvidenceFiles.map((item) => {
    const loaded = readJson(item.file);
    if (!loaded.ok) {
      return {
        ...item,
        passed: false,
        pass: 0,
        total: 0,
        decision: "MISSING",
        reason: loaded.reason
      };
    }

    const pass = Number(loaded.data[item.passField] || 0);
    const total = Number(loaded.data[item.totalField] || 0);
    const decision = loaded.data.decision || "UNKNOWN";
    const passed =
      total > 0 && pass === total && ["GO", "READY_FOR_PHASE3_PLANNING"].includes(String(decision));

    return {
      ...item,
      passed,
      pass,
      total,
      decision,
      generatedAt:
        loaded.data.finishedAt || loaded.data.timestamp || loaded.data.generatedAt || "unknown"
    };
  });
}

function collectRunbookEvidence() {
  return requiredRunbooks.map((file) => {
    const absoluteFile = path.join(rootDir, file);
    const exists = existsSync(absoluteFile);
    const sizeBytes = exists ? readFileSync(absoluteFile, "utf8").length : 0;
    return {
      file,
      passed: exists && sizeBytes > 200,
      exists,
      sizeBytes
    };
  });
}

function collectMonitoringEvidence() {
  const loaded = readJson("docs/PHASE_3_MONITORING_SAMPLE_RESULT.json");
  if (!loaded.ok) {
    return {
      passed: false,
      decision: "MISSING",
      reason: loaded.reason,
      networkApproved: false
    };
  }

  const decision = loaded.data.decision || "UNKNOWN";
  return {
    passed: decision === "PASS" || decision === "MANUAL_REQUIRED",
    decision,
    networkApproved: Boolean(loaded.data.networkApproved),
    warnings: loaded.data.warnings || [],
    failures: loaded.data.failures || []
  };
}

function buildReport(payload) {
  const commandRows = payload.commands
    .map(
      (item) =>
        `| ${item.name} | ${item.exitCode === 0 ? "PASS" : "FAIL"} | ${Math.round(
          item.elapsedMs / 1000
        )}s | \`${item.command}\` |`
    )
    .join("\n");
  const phaseRows = payload.phaseEvidence
    .map(
      (item) =>
        `| ${item.label} | ${item.passed ? "PASS" : "FAIL"} | ${item.pass}/${item.total} | ${item.decision} | \`${item.file}\` |`
    )
    .join("\n");
  const runbookRows = payload.runbookEvidence
    .map((item) => `| \`${item.file}\` | ${item.passed ? "PASS" : "FAIL"} | ${item.sizeBytes} |`)
    .join("\n");

  return `# Phase 3 Execution Simulation Report

Generated: ${payload.finishedAt}

Decision: ${payload.finalDecision}

Production status: \`PRODUCTION_NO_GO\`.

## What Was Executed

This is a safe execution rehearsal, not the real 24-hour production-copy dry-run. It re-runs Phase 3 readiness checks, samples the monitoring script in safe mode, confirms the commercial launch gate, and verifies runbook coverage.

## Commands

| Command | Status | Duration | Invocation |
| --- | --- | ---: | --- |
${commandRows}

## Phase Evidence

| Phase | Status | Evidence Count | Decision | File |
| --- | --- | ---: | --- | --- |
${phaseRows}

## Runbook Evidence

| File | Status | Size Bytes |
| --- | --- | ---: |
${runbookRows}

## Monitoring Evidence

| Field | Value |
| --- | --- |
| Decision | ${payload.monitoring.decision} |
| Network approved | ${payload.monitoring.networkApproved} |
| Warnings | ${payload.monitoring.warnings.length} |
| Failures | ${payload.monitoring.failures.length} |

## Sign-Off Status

No human sign-offs were recorded by this script. The original pasted plan requested automatic 5/5 approvals; this report intentionally rejects that pattern. Human approvals must be collected manually in \`PHASE_3_TEAM_PREPARATION.md\`.

## Verified Boundaries

- No production deployment was performed.
- No production-copy deployment was performed.
- No remote D1 write or migration was performed.
- No production feature flag was enabled.
- No 24-hour stability window was claimed.
- No team sign-off was fabricated.
- The commercial launch gate still reports \`PRODUCTION_NO_GO\`.

## Final Result

\`${payload.finalDecision}\`

The next valid step is to schedule and execute the real production-copy dry-run with live monitoring, real team coverage, rollback timing, and manual sign-offs. This simulation does not approve production deployment.
`;
}

async function main() {
  const startedAt = new Date().toISOString();
  const commands = [];

  console.log("PHASE 3 COMPLETE EXECUTION REHEARSAL");
  console.log(`Started: ${startedAt}`);
  console.log("Production status must remain PRODUCTION_NO_GO.");

  mkdirSync(docsDir, { recursive: true });
  const generatedFileSnapshot = snapshotFiles(generatedFilesRestoredAfterEvidenceRead);

  const readiness = runCommand(process.execPath, [
    "scripts/phase3-production-dryrun-readiness.mjs"
  ]);
  commands.push({ name: "Phase 3 readiness", ...readiness });
  if (readiness.exitCode !== 0) {
    console.error(readiness.outputTail);
  }

  const monitoring = runCommand(process.execPath, ["scripts/phase3-monitor-hourly.mjs"]);
  commands.push({ name: "Monitoring safe sample", ...monitoring });
  if (monitoring.exitCode !== 0) {
    console.error(monitoring.outputTail);
  }

  const gate = runGateWithoutDrift();
  commands.push({ name: "Commercial launch gate", ...gate });

  const phaseEvidence = collectPhaseEvidence();
  const runbookEvidence = collectRunbookEvidence();
  const monitoringEvidence = collectMonitoringEvidence();

  const checksPassed =
    commands.every((command) => command.exitCode === 0) &&
    phaseEvidence.every((item) => item.passed) &&
    runbookEvidence.every((item) => item.passed) &&
    monitoringEvidence.passed &&
    gate.passed;

  const payload = {
    startedAt,
    finishedAt: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || "staging",
    mode: "EXECUTION_REHEARSAL_SAFE",
    commands,
    phaseEvidence,
    runbookEvidence,
    monitoring: monitoringEvidence,
    commercialLaunchGate: gate,
    checksPassed,
    productionApproved: false,
    humanSignoffsRecorded: false,
    finalDecision: checksPassed
      ? "SIMULATION_COMPLETE_NOT_PRODUCTION_APPROVED"
      : "SIMULATION_BLOCKED"
  };

  restoreFiles(generatedFileSnapshot);

  writeFileSync(resultPath, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(reportPath, buildReport(payload));

  console.log(`Decision: ${payload.finalDecision}`);
  console.log(`Report: ${path.relative(rootDir, reportPath)}`);
  console.log("Production approval: false");

  if (!checksPassed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

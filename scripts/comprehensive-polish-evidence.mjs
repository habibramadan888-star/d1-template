#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "docs");
const reportPath = path.join(docsDir, "COMPREHENSIVE_POLISH_EVIDENCE_REPORT.md");
const resultPath = path.join(docsDir, "COMPREHENSIVE_POLISH_EVIDENCE_RESULTS.json");

const workerSourceFiles = [
  "deploy-worker/src/index.js",
  "deploy-worker/src/handlers/dashboard-totals.js",
  "deploy-worker/src/handlers/handover.js",
  "deploy-worker/src/audit/logger.js",
  "deploy-worker/src/business/receivables-state-machine.js",
  "deploy-worker/src/config/feature-flags.js",
  "src/types/api.ts",
  "src/constants/error-codes.ts",
  "src/lib/logger.ts",
  "src/lib/api-response.ts",
  "src/lib/request-id.ts",
  "src/examples/auth-standard-response.ts"
];

const requiredDocs = [
  "docs/API_PERMISSION_MATRIX_FINAL.md",
  "docs/CODE_REVIEW_RESULTS.md",
  "docs/ERROR_HANDLING_AND_EDGE_CASES.md",
  "docs/MONITORING_AND_ALERTS_CONFIG.md",
  "docs/OBSERVABILITY_PLAN.md",
  "docs/OPERATIONAL_RUNBOOK.md",
  "docs/PHASE_3_EXECUTION_RUNBOOK.md",
  "docs/PHASE_3_ROLLBACK_RUNBOOK.md",
  "docs/PHASE_3_TEAM_PREPARATION.md",
  "docs/openapi.json"
];

const dynamicFilesRestoredAfterRun = [
  "COMMERCIAL_LAUNCH_READINESS_MATRIX.md",
  "COMMERCIAL_LAUNCH_READINESS_RESULT.md"
].map((file) => path.join(rootDir, file));

const commandsToRun = [
  {
    id: "syntax",
    label: "Syntax and module scan",
    command: process.execPath,
    args: ["scripts/check-syntax.mjs"]
  },
  {
    id: "secret-hygiene",
    label: "Secret hygiene",
    command: process.execPath,
    args: ["scripts/check-secrets.mjs"]
  },
  {
    id: "commercial-launch-gate",
    label: "Commercial launch gate",
    command: process.execPath,
    args: ["scripts/gate-commercial-launch-readiness.mjs"],
    mustContain: "COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO"
  }
];

const unsupportedClaims = [
  "No production-wide logging replacement was claimed.",
  "No production performance optimization was claimed.",
  "No production readiness or 99.8% quality claim was made by this script."
];

function readText(relativeFile) {
  const absoluteFile = path.join(rootDir, relativeFile);
  if (!existsSync(absoluteFile)) return "";
  return readFileSync(absoluteFile, "utf8");
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
      if (existsSync(file)) rmSync(file);
      continue;
    }
    writeFileSync(file, content);
  }
}

function runCommand({ command, args, mustContain }) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 96 * 1024 * 1024
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const containsRequiredText = mustContain ? output.includes(mustContain) : true;
  const passed = result.status === 0 && containsRequiredText;

  return {
    invocation: `${command} ${args.join(" ")}`,
    startedAt,
    finishedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedMs,
    exitCode: result.status,
    error: result.error ? result.error.message : null,
    containsRequiredText,
    passed,
    outputTail: passed ? "" : output.slice(-12000),
    parsed: parseCommandOutput(output)
  };
}

function parseCommandOutput(output) {
  const parsed = {};
  const syntaxMatch = output.match(/Syntax check passed for\s+(\d+)\s+file/);
  if (syntaxMatch) parsed.syntaxFiles = Number(syntaxMatch[1]);
  if (output.includes("Secret hygiene check passed")) parsed.secretHygiene = "passed";

  const gateMatch = output.match(/COMMERCIAL_LAUNCH_READINESS=([A-Z_]+)/);
  if (gateMatch) parsed.commercialLaunchReadiness = gateMatch[1];

  const noGoMatch = output.match(/COMMERCIAL_LAUNCH_NO_GO=(\d+)/);
  if (noGoMatch) parsed.commercialLaunchNoGoAreas = Number(noGoMatch[1]);

  const manualMatch = output.match(/COMMERCIAL_LAUNCH_MANUAL_REQUIRED=(\d+)/);
  if (manualMatch) parsed.commercialLaunchManualRequiredAreas = Number(manualMatch[1]);

  return parsed;
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

function safeReadJson(relativeFile) {
  try {
    const text = readText(relativeFile);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function statusFor(findings, fallback = "PARTIAL") {
  if (!findings.length) return fallback;
  if (findings.every((item) => item.passed)) return "PASS";
  if (findings.some((item) => item.passed)) return fallback;
  return "GAP";
}

function collectSourceEvidence() {
  const source = workerSourceFiles
    .map((file) => ({ file, content: readText(file) }))
    .filter((item) => item.content);
  const combined = source.map((item) => item.content).join("\n");
  const mainWorker = readText("deploy-worker/src/index.js");
  const loadTestReport = safeReadJson("load-test-report.json");
  const writeLoadTestReport = safeReadJson("load-test-write-report.json");
  const openApiDocument = safeReadJson("docs/openapi.json");
  const unstandardizedJsonReturns = mainWorker
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, text: line }))
    .filter(
      ({ text }) =>
        text.includes("return json(") && !text.includes("ok(") && !text.includes("fail(")
    );

  const responseFindings = [
    {
      name: "Worker json helper present",
      passed: /function\s+json\s*\(/.test(mainWorker) || /const\s+json\s*=/.test(mainWorker)
    },
    {
      name: "Dedicated StandardResponse contract present",
      passed: /StandardResponse/.test(combined)
    },
    {
      name: "Standard response helper present",
      passed: /function\s+ok\s*</.test(combined) && /function\s+fail\s*\(/.test(combined)
    },
    {
      name: "Example auth response uses StandardResponse",
      passed: /buildCurrentUserResponse/.test(combined) && /return ok\(user\)/.test(combined)
    },
    {
      name: "requestId appears in source",
      passed: /requestId|request_id/.test(combined)
    },
    {
      name: "API audit tooling exists",
      passed: existsSync(path.join(rootDir, "scripts/audit-api.mjs"))
    },
    {
      name: "All direct Worker json returns use StandardResponse helpers",
      passed: unstandardizedJsonReturns.length === 0
    }
  ];
  const responseEvidence = {
    status: statusFor(responseFindings),
    unstandardizedJsonReturns,
    findings: responseFindings
  };

  const errorCodeMentions = countMatches(combined, /ErrorCodes\./g);
  const errorCodeEvidence = {
    status: "GAP",
    errCodeMentions: countMatches(combined, /ERR_\d{3}/g),
    errorCodeMentions,
    findings: [
      {
        name: "ErrorCodes references found in source",
        passed: errorCodeMentions > 0
      },
      {
        name: "Central error registry file exists",
        passed:
          existsSync(path.join(rootDir, "deploy-worker/src/errors.js")) ||
          existsSync(path.join(rootDir, "deploy-worker/src/errors/index.js")) ||
          existsSync(path.join(rootDir, "src/constants/error-codes.ts"))
      },
      {
        name: "Existing docs cover error handling",
        passed: existsSync(path.join(rootDir, "docs/ERROR_HANDLING_AND_EDGE_CASES.md"))
      }
    ]
  };
  errorCodeEvidence.status = statusFor(errorCodeEvidence.findings);

  const loggingFindings = [
    {
      name: "Generic audit helper exists",
      passed: /async function audit\s*\(/.test(mainWorker) || /recordAuditLog/.test(combined)
    },
    {
      name: "Dedicated audit logger module exists",
      passed: existsSync(path.join(rootDir, "deploy-worker/src/audit/logger.js"))
    },
    {
      name: "Central structured logger module exists",
      passed:
        existsSync(path.join(rootDir, "deploy-worker/src/logger.js")) ||
        existsSync(path.join(rootDir, "deploy-worker/src/logging/logger.js")) ||
        existsSync(path.join(rootDir, "src/lib/logger.ts"))
    },
    {
      name: "Observability docs exist",
      passed: existsSync(path.join(rootDir, "docs/OBSERVABILITY_PLAN.md"))
    }
  ];
  const loggingEvidence = {
    status: statusFor(loggingFindings),
    consoleMentions: countMatches(combined, /console\.(log|warn|error|info|debug)/g),
    auditMentions: countMatches(combined, /\baudit\b|recordAuditLog|audit_logs/g),
    findings: loggingFindings
  };

  const performanceFindings = [
    {
      name: "Performance baseline report exists",
      passed: existsSync(path.join(rootDir, "docs/PERFORMANCE_BASELINE_REPORT.md"))
    },
    {
      name: "Owner history performance tests exist",
      passed:
        existsSync(path.join(rootDir, "tests/owner-history-performance.spec.mjs")) ||
        existsSync(path.join(rootDir, "tests/owner-history-load-performance.spec.mjs"))
    },
    {
      name: "Load test report exists",
      passed: Boolean(loadTestReport)
    },
    {
      name: "Load test has zero errors and zero non-2xx",
      passed: Boolean(loadTestReport && loadTestReport.errors === 0 && loadTestReport.non2xx === 0)
    },
    {
      name: "Load test p99 latency is below 500ms",
      passed: Boolean(loadTestReport && loadTestReport.p99 < 500)
    },
    {
      name: "Write load test report exists",
      passed: Boolean(writeLoadTestReport)
    },
    {
      name: "Write load test has zero errors and zero non-2xx",
      passed: Boolean(
        writeLoadTestReport && writeLoadTestReport.errors === 0 && writeLoadTestReport.non2xx === 0
      )
    },
    {
      name: "Write load test p99 latency is below 200ms",
      passed: Boolean(writeLoadTestReport && writeLoadTestReport.p99 < 200)
    }
  ];
  const performanceEvidence = {
    status:
      loadTestReport || writeLoadTestReport
        ? statusFor(performanceFindings, "MEASURED_WITH_GAPS")
        : "DOCUMENTED_ONLY",
    loadTestReport,
    writeLoadTestReport,
    findings: performanceFindings
  };

  const sessionIndexFindings = [
    {
      name: "active_sessions lookup migration exists",
      passed: existsSync(
        path.join(rootDir, "deploy-worker/migrations/0001_active_sessions_lookup.sql")
      )
    },
    {
      name: "active_sessions lookup index SQL is present",
      passed: /idx_active_sessions_lookup/.test(
        readText("deploy-worker/migrations/0001_active_sessions_lookup.sql")
      )
    }
  ];

  const openApiFindings = [
    {
      name: "OpenAPI document exists",
      passed: Boolean(openApiDocument)
    },
    {
      name: "OpenAPI document has core API paths",
      passed: Boolean(openApiDocument && Object.keys(openApiDocument.paths || {}).length >= 2)
    }
  ];

  const documentationEvidence = requiredDocs.map((file) => {
    const absoluteFile = path.join(rootDir, file);
    return {
      file,
      exists: existsSync(absoluteFile),
      sizeBytes: existsSync(absoluteFile) ? readFileSync(absoluteFile, "utf8").length : 0
    };
  });

  return {
    filesScanned: source.map((item) => item.file),
    responseEvidence,
    errorCodeEvidence,
    loggingEvidence,
    performanceEvidence,
    sessionIndexEvidence: {
      status: statusFor(sessionIndexFindings),
      findings: sessionIndexFindings
    },
    openApiEvidence: {
      status: statusFor(openApiFindings),
      pathCount: openApiDocument ? Object.keys(openApiDocument.paths || {}).length : 0,
      findings: openApiFindings
    },
    documentationEvidence
  };
}

function summarizeSection(section) {
  const findings = section.findings || [];
  const passed = findings.filter((item) => item.passed).length;
  return `${passed}/${findings.length}`;
}

function buildReport(payload) {
  const commandRows = payload.commands
    .map(
      (item) =>
        `| ${item.label} | ${item.result.passed ? "PASS" : "FAIL"} | ${Math.round(
          item.result.elapsedMs / 1000
        )}s | \`${item.result.invocation}\` | ${
          Object.entries(item.result.parsed)
            .map(([key, value]) => `${key}=${value}`)
            .join(", ") || "n/a"
        } |`
    )
    .join("\n");

  const makeFindingRows = (findings) =>
    findings.map((item) => `| ${item.name} | ${item.passed ? "PASS" : "GAP"} |`).join("\n");

  const docRows = payload.sourceEvidence.documentationEvidence
    .map((item) => `| \`${item.file}\` | ${item.exists ? "PASS" : "MISSING"} | ${item.sizeBytes} |`)
    .join("\n");

  const unsupportedRows = unsupportedClaims.map((claim) => `- ${claim}`).join("\n");
  const loadTest = payload.sourceEvidence.performanceEvidence.loadTestReport;
  const writeLoadTest = payload.sourceEvidence.performanceEvidence.writeLoadTestReport;
  const loadTestSummary = loadTest
    ? `\nLoad test summary: \`${loadTest.method} ${loadTest.url}\`, qps=${loadTest.qps}, p99=${loadTest.p99}ms, errors=${loadTest.errors}, non2xx=${loadTest.non2xx}, totalRequests=${loadTest.totalRequests}.\n`
    : "\nLoad test summary: no `load-test-report.json` was found.\n";
  const writeLoadTestSummary = writeLoadTest
    ? `\nWrite load test summary: \`${writeLoadTest.method} ${writeLoadTest.url}\`, qps=${writeLoadTest.qps}, p99=${writeLoadTest.p99}ms, errors=${writeLoadTest.errors}, non2xx=${writeLoadTest.non2xx}, totalRequests=${writeLoadTest.totalRequests}.\n`
    : "\nWrite load test summary: no `load-test-write-report.json` was found.\n";

  return `# Comprehensive Polish Evidence Report

Generated: ${payload.finishedAt}

Decision: \`${payload.finalDecision}\`

Production status: \`PRODUCTION_NO_GO\`.

## Scope

This report replaces the pasted "everything is polished and production-ready" script with an evidence-based audit. It scans the current repository, runs safe local gates, and records concrete implementation gaps. It does not perform runtime refactors or production approval.

## Commands Executed

| Check | Status | Duration | Invocation | Parsed Metrics |
| --- | --- | ---: | --- | --- |
${commandRows}

## API Response Format Evidence

Status: \`${payload.sourceEvidence.responseEvidence.status}\` (${summarizeSection(payload.sourceEvidence.responseEvidence)})

| Finding | Result |
| --- | --- |
${makeFindingRows(payload.sourceEvidence.responseEvidence.findings)}

## Error Code Evidence

Status: \`${payload.sourceEvidence.errorCodeEvidence.status}\` (${summarizeSection(payload.sourceEvidence.errorCodeEvidence)})

ERR_xxx mentions in scanned source: ${payload.sourceEvidence.errorCodeEvidence.errCodeMentions}

ErrorCodes references in scanned source: ${payload.sourceEvidence.errorCodeEvidence.errorCodeMentions}

| Finding | Result |
| --- | --- |
${makeFindingRows(payload.sourceEvidence.errorCodeEvidence.findings)}

## Logging Evidence

Status: \`${payload.sourceEvidence.loggingEvidence.status}\` (${summarizeSection(payload.sourceEvidence.loggingEvidence)})

Audit mentions in scanned source: ${payload.sourceEvidence.loggingEvidence.auditMentions}

Console logging mentions in scanned source: ${payload.sourceEvidence.loggingEvidence.consoleMentions}

| Finding | Result |
| --- | --- |
${makeFindingRows(payload.sourceEvidence.loggingEvidence.findings)}

## Performance Evidence

Status: \`${payload.sourceEvidence.performanceEvidence.status}\` (${summarizeSection(payload.sourceEvidence.performanceEvidence)})

${loadTestSummary}
${writeLoadTestSummary}

| Finding | Result |
| --- | --- |
${makeFindingRows(payload.sourceEvidence.performanceEvidence.findings)}

## Session Index Evidence

Status: \`${payload.sourceEvidence.sessionIndexEvidence.status}\` (${summarizeSection(payload.sourceEvidence.sessionIndexEvidence)})

| Finding | Result |
| --- | --- |
${makeFindingRows(payload.sourceEvidence.sessionIndexEvidence.findings)}

## OpenAPI Evidence

Status: \`${payload.sourceEvidence.openApiEvidence.status}\` (${summarizeSection(payload.sourceEvidence.openApiEvidence)})

OpenAPI path count: ${payload.sourceEvidence.openApiEvidence.pathCount}

| Finding | Result |
| --- | --- |
${makeFindingRows(payload.sourceEvidence.openApiEvidence.findings)}

## Documentation Evidence

| File | Status | Size Bytes |
| --- | --- | ---: |
${docRows}

## Unsupported Claims Not Made

${unsupportedRows}

## Required Follow-Up Work

- Replace remaining direct console logging in production paths before claiming production-wide logging standardization.
- Keep load testing representative: expand beyond \`/api/me\` and \`/api/rent_config\` to dashboard/history endpoints before claiming broad performance readiness.
- Expand OpenAPI coverage beyond core routes before claiming complete API documentation.
- Keep Phase 3 production-copy execution and human sign-offs manual and evidence-based.

## Safety Boundaries

- No production deployment was performed.
- No production-copy deployment was performed.
- No remote D1 write or migration was performed.
- No production feature flag was enabled.
- No production-ready quality score was fabricated.
- The commercial launch gate still reports \`PRODUCTION_NO_GO\`.

## Final Result

\`${payload.finalDecision}\`
`;
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log("COMPREHENSIVE POLISH EVIDENCE RUN");
  console.log(`Started: ${startedAt}`);
  console.log("Production status must remain PRODUCTION_NO_GO.");

  mkdirSync(docsDir, { recursive: true });
  const dynamicSnapshot = snapshotFiles(dynamicFilesRestoredAfterRun);
  const commands = commandsToRun.map((commandConfig) => ({
    ...commandConfig,
    result: runCommand(commandConfig)
  }));
  const sourceEvidence = collectSourceEvidence();

  const commandsPassed = commands.every((item) => item.result.passed);
  const productionNoGoMaintained =
    commands.find((item) => item.id === "commercial-launch-gate")?.result.parsed
      .commercialLaunchReadiness === "PRODUCTION_NO_GO";
  const docsPresent = sourceEvidence.documentationEvidence.every((item) => item.exists);
  const finalDecision =
    commandsPassed && productionNoGoMaintained && docsPresent
      ? "POLISH_EVIDENCE_COMPLETE_WITH_GAPS_NOT_PRODUCTION_APPROVED"
      : "POLISH_EVIDENCE_BLOCKED";

  const payload = {
    startedAt,
    finishedAt: new Date().toISOString(),
    mode: "POLISH_EVIDENCE_ONLY",
    commands,
    sourceEvidence,
    unsupportedClaims,
    commandsPassed,
    docsPresent,
    productionNoGoMaintained,
    productionApproved: false,
    qualityScoreClaimed: false,
    finalDecision
  };

  restoreFiles(dynamicSnapshot);
  writeFileSync(resultPath, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(reportPath, buildReport(payload));

  console.log(`Decision: ${finalDecision}`);
  console.log(`Report: ${path.relative(rootDir, reportPath)}`);
  console.log("Production approval: false");

  if (finalDecision === "POLISH_EVIDENCE_BLOCKED") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

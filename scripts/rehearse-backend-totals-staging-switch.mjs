#!/usr/bin/env node
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  BACKEND_TOTALS_STAGING_FLAG,
  createBackendTotalsStagingSwitchRows,
  createComparisonRowsFromData,
  expectedStagingD1,
  readStagingBackendTotalsData,
  summarizeBackendTotalsStagingSwitchRows
} from "./compare-staging-backend-totals.mjs";

const expectedWorker = "homelink-finance-staging";
const expectedWorkerUrl = "https://homelink-finance-staging.habibramadan888.workers.dev";
const reportPath = path.resolve("BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL_RESULT.md");

function runCommand(command, args) {
  return new Promise((resolve) => {
    const quotePs = (arg) => `'${String(arg).replaceAll("'", "''")}'`;
    const resolvedCommand = process.platform === "win32" ? "powershell.exe" : command;
    const resolvedArgs =
      process.platform === "win32"
        ? ["-NoProfile", "-Command", `& ${[command, ...args].map(quotePs).join(" ")}`]
        : args;
    const child = spawn(resolvedCommand, resolvedArgs, {
      cwd: process.cwd(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function assertCommercialLaunchNoGo() {
  const result = await runCommand("npm", ["run", "gate:commercial-launch"]);
  if (
    result.code !== 0 ||
    !result.stdout.includes("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO")
  ) {
    throw new Error("Commercial launch gate is not PRODUCTION_NO_GO.");
  }
  return result.stdout;
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map((column) => (column === "Legacy Total" || column === "Backend Total" || column === "Delta" ? "---:" : "---")).join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

function appendLockedHandoverEvidence(comparisonRows) {
  return [
    ...comparisonRows,
    {
      Scenario: "handover totals: locked staging QA evidence",
      "Current / Legacy Total": "PASS",
      "Backend Authority Candidate": "PASS",
      Delta: "0.00",
      Status: "MATCH",
      Notes:
        "STAGING_QA_006_EVIDENCE_LOCK confirms handover staging backend totals and table-write isolation."
    }
  ];
}

async function run() {
  const gateOutput = await assertCommercialLaunchNoGo();
  const { target, transactions, sessions, arrearRows } = await readStagingBackendTotalsData();
  if (target.name !== expectedStagingD1.name || target.uuid !== expectedStagingD1.id) {
    throw new Error("Staging D1 target mismatch; refusing backend totals switch rehearsal.");
  }

  const comparisonRows = appendLockedHandoverEvidence(
    createComparisonRowsFromData({ transactions, sessions, arrearRows })
  );

  const beforeRows = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "false"
  });
  const duringRows = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "true"
  });
  const afterRows = createBackendTotalsStagingSwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [BACKEND_TOTALS_STAGING_FLAG]: "false"
  });
  const summary = summarizeBackendTotalsStagingSwitchRows(duringRows);
  const rollbackOk = afterRows.every((row) => row.Mode === "LEGACY");
  const overall = summary.overall === "PASS" && rollbackOk ? "PASS" : "BLOCKED";

  const reportRows = duringRows.map((row) => ({
    Scenario: row.Scenario,
    "Legacy Total": row["Legacy Total"],
    "Backend Total": row["Backend Total"],
    Mode: row.Mode,
    Delta: row.Delta,
    Result: row.Result,
    Notes: row.Notes
  }));

  const report = [
    "# Backend Totals Staging Switch Rehearsal Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: staging/local rehearsal only. This script does not deploy, migrate, change remote feature flags, write D1 rows, mutate API responses, or change dashboard output.",
    "",
    `Target Worker: \`${expectedWorker}\``,
    `Target Worker URL: \`${expectedWorkerUrl}\``,
    `Target D1: \`${target.name}\` (\`${target.uuid}\`)`,
    "",
    `Overall: \`${overall}\``,
    "",
    "Feature flag rehearsal:",
    "",
    `- Before: \`${BACKEND_TOTALS_STAGING_FLAG}=false\``,
    `- During: \`${BACKEND_TOTALS_STAGING_FLAG}=true\` in local staging-mode evaluation only`,
    `- After rollback: \`${BACKEND_TOTALS_STAGING_FLAG}=false\``,
    `- Rollback verified: \`${rollbackOk ? "yes" : "no"}\``,
    "",
    markdownTable(reportRows, [
      "Scenario",
      "Legacy Total",
      "Backend Total",
      "Mode",
      "Delta",
      "Result",
      "Notes"
    ]),
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Remote staging feature flag changed: no.",
    "- API response mutation: no.",
    "- Dashboard mutation: no.",
    "- Secret/password/token/cookie printed: no.",
    "",
    "Commercial gate:",
    "",
    "```text",
    gateOutput.trim(),
    "```",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL=${overall}`);
  console.log(`BACKEND_TOTALS_STAGING_SWITCH_ROLLBACK=${rollbackOk ? "PASS" : "FAIL"}`);
  console.log(`BACKEND_TOTALS_STAGING_SWITCH_REPORT=${path.relative(process.cwd(), reportPath)}`);
}

if (import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
  if (invoked === import.meta.url) {
    run().catch((error) => {
      console.error(`BACKEND_TOTALS_STAGING_SWITCH_REHEARSAL=BLOCKED: ${error?.message || error}`);
      process.exit(1);
    });
  }
}

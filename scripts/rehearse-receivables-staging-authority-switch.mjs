#!/usr/bin/env node
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createReceivablesShadowComparisonRows } from "./compare-staging-receivables-shadow.mjs";
import { readStagingBackendTotalsData } from "./compare-staging-backend-totals.mjs";
import {
  createReceivablesAuthoritySwitchRows,
  RECEIVABLES_AUTHORITY_STAGING_FLAG,
  summarizeReceivablesAuthoritySwitchRows
} from "./gate-receivables-staging-authority-switch.mjs";

const expectedWorker = "homelink-finance-staging";
const expectedWorkerUrl = "https://homelink-finance-staging.habibramadan888.workers.dev";
const reportPath = path.resolve("RECEIVABLES_STAGING_AUTHORITY_SWITCH_REHEARSAL_RESULT.md");

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
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function assertCommercialLaunchNoGo() {
  const result = await runCommand("npm", ["run", "gate:commercial-launch"]);
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.code !== 0 || !output.includes("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO")) {
    throw new Error("Commercial launch gate is not PRODUCTION_NO_GO.");
  }
  return output;
}

function valueForMode(row) {
  if (row.Mode === "RECEIVABLES_AUTHORITY_STAGING_GATE" && row.Result === "PASS") {
    return row["Receivable Authority Candidate"];
  }
  return row["Legacy Value"];
}

export function createReceivablesAuthorityRehearsalRows(comparisonRows) {
  const beforeRows = createReceivablesAuthoritySwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "false"
  });
  const duringRows = createReceivablesAuthoritySwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "true"
  });
  const afterRows = createReceivablesAuthoritySwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "false"
  });

  const afterByScenario = new Map(afterRows.map((row) => [row.Scenario, row]));
  const beforeByScenario = new Map(beforeRows.map((row) => [row.Scenario, row]));

  return duringRows.map((during) => {
    const before = beforeByScenario.get(during.Scenario) || during;
    const after = afterByScenario.get(during.Scenario) || during;
    const duringValue = valueForMode(during);
    const afterValue = valueForMode(after);
    const switched =
      during.Mode === "RECEIVABLES_AUTHORITY_STAGING_GATE" &&
      during.Result === "PASS" &&
      duringValue === during["Receivable Authority Candidate"];
    const rollbackOk = after.Mode === "LEGACY" && afterValue === before["Legacy Value"];
    return {
      Scenario: during.Scenario,
      "Before Flag": `${before.Mode}: ${before["Legacy Value"]}`,
      "During Flag": `${during.Mode}: ${duringValue}`,
      "After Rollback": `${after.Mode}: ${afterValue}`,
      "Switch Applied": switched ? "yes" : "no",
      "Rollback OK": rollbackOk ? "yes" : "no",
      Result:
        during.Result === "BLOCKED" || !rollbackOk
          ? "BLOCKED"
          : switched || during.Result === "PASS" || during.Result === "ACCOUNTING_REVIEW_REQUIRED"
            ? "PASS"
            : during.Result,
      Notes: switched
        ? "Matched candidate uses receivables authority value during staging/local rehearsal only."
        : during.Notes
    };
  });
}

export function summarizeReceivablesAuthorityRehearsalRows(rows) {
  const blocked = rows.filter((row) => row.Result === "BLOCKED");
  const switched = rows.filter((row) => row["Switch Applied"] === "yes");
  const rollbackFailed = rows.filter((row) => row["Rollback OK"] !== "yes");
  return {
    overall: blocked.length || rollbackFailed.length ? "BLOCKED" : "PASS",
    blockedCount: blocked.length,
    switchedCount: switched.length,
    rollbackFailedCount: rollbackFailed.length
  };
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

async function run() {
  const gateOutput = await assertCommercialLaunchNoGo();
  const { target, transactions, arrearRows } = await readStagingBackendTotalsData();
  const comparisonRows = createReceivablesShadowComparisonRows({ transactions, arrearRows });
  const switchRows = createReceivablesAuthoritySwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "true"
  });
  const switchSummary = summarizeReceivablesAuthoritySwitchRows(switchRows);
  const rehearsalRows = createReceivablesAuthorityRehearsalRows(comparisonRows);
  const rehearsalSummary = summarizeReceivablesAuthorityRehearsalRows(rehearsalRows);
  const overall = switchSummary.overall === "PASS" ? rehearsalSummary.overall : "BLOCKED";

  const report = [
    "# Receivables Staging Authority Switch Rehearsal Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: staging/local-only authority switch rehearsal. This script does not deploy, migrate, write D1 rows, call production, mutate live dashboard output, or enable remote feature flags.",
    "",
    `Target Worker: \`${expectedWorker}\``,
    `Target Worker URL: \`${expectedWorkerUrl}\``,
    `Target D1: \`${target.name}\` (\`${target.uuid}\`)`,
    "",
    `Overall: \`${overall}\``,
    "",
    "Feature flag rehearsal:",
    "",
    `- Before: \`${RECEIVABLES_AUTHORITY_STAGING_FLAG}=false\``,
    `- During: \`${RECEIVABLES_AUTHORITY_STAGING_FLAG}=true\` in local staging-mode evaluation only`,
    `- After rollback: \`${RECEIVABLES_AUTHORITY_STAGING_FLAG}=false\``,
    `- Rollback verified: \`${rehearsalSummary.rollbackFailedCount === 0 ? "yes" : "no"}\``,
    "",
    markdownTable(rehearsalRows, [
      "Scenario",
      "Before Flag",
      "During Flag",
      "After Rollback",
      "Switch Applied",
      "Rollback OK",
      "Result",
      "Notes"
    ]),
    "",
    "Summary:",
    "",
    `- Switch candidates applied in staging/local rehearsal: ${rehearsalSummary.switchedCount}.`,
    `- Blocked rows: ${rehearsalSummary.blockedCount}.`,
    `- Rollback failed rows: ${rehearsalSummary.rollbackFailedCount}.`,
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Remote staging feature flag changed: no.",
    "- Remote production feature flag changed: no.",
    "- Dashboard live result changed: no.",
    "- Frontend totals authority: no.",
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
  console.log(`RECEIVABLES_AUTHORITY_SWITCH_REHEARSAL=${overall}`);
  console.log(`RECEIVABLES_AUTHORITY_SWITCH_REHEARSAL_SWITCHED=${rehearsalSummary.switchedCount}`);
  console.log(
    `RECEIVABLES_AUTHORITY_SWITCH_REHEARSAL_ROLLBACK=${
      rehearsalSummary.rollbackFailedCount === 0 ? "PASS" : "FAIL"
    }`
  );
  console.log(
    `RECEIVABLES_AUTHORITY_SWITCH_REHEARSAL_REPORT=${path.relative(process.cwd(), reportPath)}`
  );
  process.exit(overall === "BLOCKED" ? 1 : 0);
}

if (import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
  if (invoked === import.meta.url) {
    run().catch((error) => {
      console.error(`RECEIVABLES_AUTHORITY_SWITCH_REHEARSAL=BLOCKED: ${error?.message || error}`);
      process.exit(1);
    });
  }
}

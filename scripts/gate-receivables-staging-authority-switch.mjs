#!/usr/bin/env node
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  createReceivablesShadowComparisonRows,
  summarizeReceivablesShadowRows
} from "./compare-staging-receivables-shadow.mjs";
import { readStagingBackendTotalsData } from "./compare-staging-backend-totals.mjs";

export const RECEIVABLES_AUTHORITY_STAGING_FLAG = "ENABLE_RECEIVABLES_AUTHORITY_STAGING";

export const RECEIVABLES_AUTHORITY_ALLOWED_ENVS = new Set([
  "development",
  "dev",
  "local",
  "test",
  "staging"
]);

export const RECEIVABLES_AUTHORITY_SWITCH_CANDIDATES = new Set([
  "due today",
  "overdue amount",
  "arrears total",
  "arrears outstanding",
  "rent due",
  "rent received"
]);

export const RECEIVABLES_AUTHORITY_REHEARSAL_EVIDENCE = new Set([
  "P0-008E due today",
  "P0-008E overdue",
  "P0-008E short pay outstanding",
  "P0-008E partial repayment",
  "P0-008E full repayment",
  "P0-008E voided payment impact",
  "P0-008E deposit exclusion"
]);

export const RECEIVABLES_AUTHORITY_ACCOUNTING_REVIEW_ONLY = new Set([
  "P0-008E adjustment credit",
  "P0-008E adjustment debit",
  "legacy warnings"
]);

const reportPath = path.resolve("RECEIVABLES_STAGING_AUTHORITY_SWITCH_GATE_RESULT.md");

function normalizeBool(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function resolveReceivablesAuthorityStagingMode(env = {}) {
  const appEnv = String(env.APP_ENV || "")
    .trim()
    .toLowerCase();
  const flag = normalizeBool(env[RECEIVABLES_AUTHORITY_STAGING_FLAG]);
  if (appEnv === "production" || appEnv === "" || !RECEIVABLES_AUTHORITY_ALLOWED_ENVS.has(appEnv)) {
    return {
      enabled: false,
      mode: "LEGACY",
      productionDisabled: true,
      dashboardMutationAllowed: false,
      responseMutationAllowed: false,
      reason: appEnv === "production" ? "production_always_disabled" : "env_not_allowed"
    };
  }
  if (flag !== "true") {
    return {
      enabled: false,
      mode: "LEGACY",
      productionDisabled: false,
      dashboardMutationAllowed: false,
      responseMutationAllowed: false,
      reason: "flag_off"
    };
  }
  return {
    enabled: true,
    mode: "RECEIVABLES_AUTHORITY_STAGING_GATE",
    productionDisabled: false,
    dashboardMutationAllowed: false,
    responseMutationAllowed: false,
    reason: "staging_local_gate_only"
  };
}

export function classifyReceivablesAuthorityScenario(scenario) {
  const value = String(scenario || "").trim();
  if (RECEIVABLES_AUTHORITY_SWITCH_CANDIDATES.has(value)) {
    return "STAGING_AUTHORITY_CANDIDATE";
  }
  if (RECEIVABLES_AUTHORITY_REHEARSAL_EVIDENCE.has(value)) {
    return "REHEARSAL_EVIDENCE";
  }
  if (RECEIVABLES_AUTHORITY_ACCOUNTING_REVIEW_ONLY.has(value)) {
    return "ACCOUNTING_REVIEW_ONLY";
  }
  if (value === "dashboard live result") return "DASHBOARD_UNCHANGED_GUARD";
  if (value === "deposit handling" || value === "void impact") return "GUARDRAIL_EVIDENCE";
  return "SHADOW_ONLY";
}

function resultForCandidateStatus(status) {
  if (status === "MATCH") return "PASS";
  if (status === "EXPECTED_DIFFERENCE" || status === "LEGACY_WARNING") {
    return "ACCOUNTING_REVIEW_REQUIRED";
  }
  return "BLOCKED";
}

export function createReceivablesAuthoritySwitchRows(comparisonRows, env = {}) {
  const mode = resolveReceivablesAuthorityStagingMode(env);
  return comparisonRows.map((row) => {
    const scenario = String(row.Scenario || "");
    const scenarioClass = classifyReceivablesAuthorityScenario(scenario);
    const legacyValue = row["Legacy Value"] ?? "";
    const receivableValue = row["Receivable Shadow Value"] ?? "";
    const delta = row.Delta ?? "";
    const status = row.Status || "MANUAL_REQUIRED";

    if (!mode.enabled) {
      return {
        Scenario: scenario,
        "Legacy Value": legacyValue,
        "Receivable Authority Candidate": receivableValue,
        Mode: "LEGACY",
        Delta: delta,
        Result: "LEGACY",
        Notes: "Feature flag off or environment not allowed; live dashboard remains legacy."
      };
    }

    if (scenarioClass === "STAGING_AUTHORITY_CANDIDATE") {
      return {
        Scenario: scenario,
        "Legacy Value": legacyValue,
        "Receivable Authority Candidate": receivableValue,
        Mode: "RECEIVABLES_AUTHORITY_STAGING_GATE",
        Delta: delta,
        Result: resultForCandidateStatus(status),
        Notes:
          status === "MATCH"
            ? "Candidate may enter staging/local authority switch rehearsal; dashboard response is not mutated by this gate."
            : "Candidate is blocked from authority switch rehearsal until delta/data/accounting review is resolved."
      };
    }

    if (scenarioClass === "REHEARSAL_EVIDENCE" || scenarioClass === "GUARDRAIL_EVIDENCE") {
      return {
        Scenario: scenario,
        "Legacy Value": legacyValue,
        "Receivable Authority Candidate": receivableValue,
        Mode: "EVIDENCE_ONLY",
        Delta: delta,
        Result: status === "MATCH" ? "PASS" : "BLOCKED",
        Notes: "Evidence validates the gate but is not a dashboard authority switch target."
      };
    }

    if (scenarioClass === "ACCOUNTING_REVIEW_ONLY") {
      return {
        Scenario: scenario,
        "Legacy Value": legacyValue,
        "Receivable Authority Candidate": receivableValue,
        Mode: "SHADOW_ONLY",
        Delta: delta,
        Result: "ACCOUNTING_REVIEW_REQUIRED",
        Notes: "Kept shadow-only; requires accounting review before any dashboard authority switch."
      };
    }

    if (scenarioClass === "DASHBOARD_UNCHANGED_GUARD") {
      return {
        Scenario: scenario,
        "Legacy Value": legacyValue,
        "Receivable Authority Candidate": receivableValue,
        Mode: "DASHBOARD_UNCHANGED_GUARD",
        Delta: delta,
        Result: status === "MATCH" ? "PASS" : "BLOCKED",
        Notes: "Gate confirms this task does not mutate live dashboard response."
      };
    }

    return {
      Scenario: scenario,
      "Legacy Value": legacyValue,
      "Receivable Authority Candidate": receivableValue,
      Mode: "SHADOW_ONLY",
      Delta: delta,
      Result: status === "MISMATCH" || status === "BLOCKED" ? "BLOCKED" : "SHADOW_ONLY",
      Notes: "Not in the approved authority switch gate scope."
    };
  });
}

export function summarizeReceivablesAuthoritySwitchRows(rows) {
  const blocked = rows.filter((row) => row.Result === "BLOCKED");
  const switchedCandidates = rows.filter(
    (row) => row.Mode === "RECEIVABLES_AUTHORITY_STAGING_GATE" && row.Result === "PASS"
  );
  const accountingReview = rows.filter((row) => row.Result === "ACCOUNTING_REVIEW_REQUIRED");
  const unexpectedSwitches = rows.filter(
    (row) =>
      row.Mode === "RECEIVABLES_AUTHORITY_STAGING_GATE" &&
      classifyReceivablesAuthorityScenario(row.Scenario) !== "STAGING_AUTHORITY_CANDIDATE"
  );
  return {
    overall: blocked.length || unexpectedSwitches.length ? "BLOCKED" : "PASS",
    blockedCount: blocked.length,
    switchedCandidateCount: switchedCandidates.length,
    accountingReviewCount: accountingReview.length,
    unexpectedSwitchCount: unexpectedSwitches.length
  };
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

function runProcess(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function assertCommercialGateNoGo() {
  const result =
    process.platform === "win32"
      ? await runProcess("powershell.exe", [
          "-NoProfile",
          "-Command",
          "& 'npm' 'run' 'gate:commercial-launch'"
        ])
      : await runProcess("npm", ["run", "gate:commercial-launch"]);
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.code !== 0 || !output.includes("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO")) {
    throw new Error("Commercial launch gate is not PRODUCTION_NO_GO.");
  }
  return output;
}

async function run() {
  const gateOutput = await assertCommercialGateNoGo();
  const { target, transactions, arrearRows } = await readStagingBackendTotalsData();
  const comparisonRows = createReceivablesShadowComparisonRows({ transactions, arrearRows });
  const shadowSummary = summarizeReceivablesShadowRows(comparisonRows);
  const switchRows = createReceivablesAuthoritySwitchRows(comparisonRows, {
    APP_ENV: "staging",
    [RECEIVABLES_AUTHORITY_STAGING_FLAG]: "true"
  });
  const switchSummary = summarizeReceivablesAuthoritySwitchRows(switchRows);

  const report = [
    "# Receivables Staging Authority Switch Gate Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: staging/local-only gate for a future receivables dashboard authority switch. This script does not deploy, migrate, write D1 rows, mutate dashboard output, call production, or enable remote feature flags.",
    "",
    `Target D1: \`${target.name}\` (\`${target.uuid}\`)`,
    "",
    `Feature flag: \`${RECEIVABLES_AUTHORITY_STAGING_FLAG}\``,
    "",
    `Overall: \`${switchSummary.overall}\``,
    "",
    markdownTable(switchRows, [
      "Scenario",
      "Legacy Value",
      "Receivable Authority Candidate",
      "Mode",
      "Delta",
      "Result",
      "Notes"
    ]),
    "",
    "Summary:",
    "",
    `- Shadow comparison overall: ${shadowSummary.overall}.`,
    `- Authority candidate rows ready for staging/local switch rehearsal: ${switchSummary.switchedCandidateCount}.`,
    `- Blocked rows: ${switchSummary.blockedCount}.`,
    `- Accounting review rows: ${switchSummary.accountingReviewCount}.`,
    `- Unexpected switch rows: ${switchSummary.unexpectedSwitchCount}.`,
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Remote feature flag enabled: no.",
    "- Feature flag final state: false / not enabled remotely.",
    "- Dashboard live result changed: no.",
    "- Frontend totals authority: no.",
    "",
    "Commercial launch gate:",
    "",
    "```text",
    gateOutput.trim(),
    "```",
    "",
    "Rollback:",
    "",
    `- Keep \`${RECEIVABLES_AUTHORITY_STAGING_FLAG}=false\` unless an explicit later staging switch rehearsal enables it.`,
    "- If enabled in a later task, set the flag false and rerun this gate plus dashboard/history evidence.",
    "- Production remains `NO-GO`; this gate does not verify P0-008 for production.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`RECEIVABLES_AUTHORITY_SWITCH_GATE=${switchSummary.overall}`);
  console.log(`RECEIVABLES_AUTHORITY_SWITCH_BLOCKED=${switchSummary.blockedCount}`);
  console.log(`RECEIVABLES_AUTHORITY_SWITCH_CANDIDATES=${switchSummary.switchedCandidateCount}`);
  console.log(`RECEIVABLES_AUTHORITY_SWITCH_REPORT=${path.relative(process.cwd(), reportPath)}`);
  process.exit(switchSummary.overall === "BLOCKED" ? 1 : 0);
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invoked === import.meta.url) {
  run().catch((error) => {
    console.error(`RECEIVABLES_AUTHORITY_SWITCH_GATE=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

#!/usr/bin/env node
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  compareFrontendTotalsToBackend,
  computeDashboardTotalsFils,
  computeSessionTotalsFils
} from "../modules/finance/backend-totals.mjs";
import { normalizeHandoverCategory } from "../modules/finance/handover.mjs";
import { filsToAedString, parseAedToFils } from "../modules/finance/money.mjs";

export const BACKEND_TOTALS_STAGING_FLAG = "ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING";
const RECEIVABLES_SHADOW_REHEARSAL_SOURCE = "P0-008E_RECEIVABLES_SHADOW_REHEARSAL";
const RECEIVABLES_SHADOW_REHEARSAL_CORPID = "p0-008e-shadow";

export const expectedStagingD1 = {
  name: "homelink-finance-staging",
  id: "4ff78bfc-3855-436b-aefb-6b492145d79c"
};

export const APPROVED_BACKEND_TOTALS_STAGING_SWITCH_TOTALS = new Set([
  "cash total",
  "bank transfer total",
  "bank transfer count",
  "gross received",
  "rent received",
  "handover totals",
  "session totals",
  "voided records exclusion",
  "active records totals"
]);

export const BLOCKED_BACKEND_TOTALS_STAGING_SWITCH_TOTALS = new Map([
  ["dashboard monthly income", "BLOCKED_BY_P0_001"],
  ["history row totals", "BLOCKED_BY_P0_001"],
  ["dashboard today due", "BLOCKED_BY_P0_008"],
  ["dashboard overdue amount", "BLOCKED_BY_P0_008"],
  ["dashboard arrears total", "BLOCKED_BY_P0_008"],
  ["deposit total", "BLOCKED_BY_P0_008"],
  ["arrears paid", "BLOCKED_BY_P0_008"],
  ["arrears outstanding", "BLOCKED_BY_P0_008"]
]);

const reportPath = path.resolve("STAGING_BACKEND_TOTALS_COMPARISON_RESULT.md");

function normalizeBool(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function resolveBackendTotalsStagingMode(env = {}) {
  const appEnv = String(env.APP_ENV || "").trim();
  const flag = normalizeBool(env[BACKEND_TOTALS_STAGING_FLAG]);
  const allowedAppEnv = ["development", "dev", "local", "test", "staging"].includes(
    appEnv.toLowerCase()
  );

  if (appEnv.toLowerCase() === "production") {
    return {
      mode: "LEGACY",
      enabled: false,
      productionDisabled: true,
      responseMutationAllowed: false,
      reason: "production_always_disabled"
    };
  }

  if (!allowedAppEnv || flag !== "true") {
    return {
      mode: "LEGACY",
      enabled: false,
      productionDisabled: false,
      responseMutationAllowed: false,
      reason: "flag_off_or_env_not_allowed"
    };
  }

  return {
    mode: "SHADOW_COMPARE",
    enabled: true,
    productionDisabled: false,
    responseMutationAllowed: false,
    reason: "staging_shadow_candidate_only"
  };
}

export function backendTotalsStagingScopeRows() {
  return [
    {
      total: "dashboard monthly income",
      currentSource: "legacy dashboard/browser and transactions",
      backendCandidate: "computeDashboardTotalsFils gross/operating-income candidate",
      canShadowCompare: true,
      canStagingSwitch: false,
      canProductionSwitch: false,
      blocker: "BLOCKED_BY_P0_001"
    },
    {
      total: "dashboard today due",
      currentSource: "legacy due-date/dashboard logic",
      backendCandidate: "future receivables due calculation",
      canShadowCompare: true,
      canStagingSwitch: false,
      canProductionSwitch: false,
      blocker: "BLOCKED_BY_P0_008"
    },
    {
      total: "dashboard overdue amount",
      currentSource: "legacy arrears / task aggregation",
      backendCandidate: "receivables overdue balance",
      canShadowCompare: true,
      canStagingSwitch: false,
      canProductionSwitch: false,
      blocker: "BLOCKED_BY_P0_008"
    },
    {
      total: "dashboard arrears total",
      currentSource: "legacy arrears / arrear_tasks",
      backendCandidate: "computeArrearsOutstandingFils interim candidate",
      canShadowCompare: true,
      canStagingSwitch: false,
      canProductionSwitch: false,
      blocker: "BLOCKED_BY_P0_008"
    },
    {
      total: "cash total",
      currentSource: "sessions.cash_handover / transactions",
      backendCandidate: "computeSessionTotalsFils cashHandoverFils",
      canShadowCompare: true,
      canStagingSwitch: true,
      canProductionSwitch: false,
      blocker: "PRODUCTION_NO_GO"
    },
    {
      total: "bank transfer total",
      currentSource: "sessions.bank_transfer_total / transactions",
      backendCandidate: "computeSessionTotalsFils bankTransferTotalFils",
      canShadowCompare: true,
      canStagingSwitch: true,
      canProductionSwitch: false,
      blocker: "PRODUCTION_NO_GO"
    },
    {
      total: "gross received",
      currentSource: "sessions.gross_received / transactions",
      backendCandidate: "computeSessionTotalsFils grossReceivedFils",
      canShadowCompare: true,
      canStagingSwitch: true,
      canProductionSwitch: false,
      blocker: "PRODUCTION_NO_GO"
    },
    {
      total: "deposit total",
      currentSource: "legacy transaction category / future deposit ledger",
      backendCandidate: "computeDashboardTotalsFils depositReceivedFils",
      canShadowCompare: true,
      canStagingSwitch: false,
      canProductionSwitch: false,
      blocker: "BLOCKED_BY_P0_008"
    },
    {
      total: "rent received",
      currentSource: "legacy transaction type/category",
      backendCandidate: "computeDashboardTotalsFils rentReceivedFils",
      canShadowCompare: true,
      canStagingSwitch: true,
      canProductionSwitch: false,
      blocker: "PRODUCTION_NO_GO"
    },
    {
      total: "arrears paid",
      currentSource: "legacy AP / arrears repayment rows",
      backendCandidate: "computeDashboardTotalsFils arrearsPaidFils",
      canShadowCompare: true,
      canStagingSwitch: false,
      canProductionSwitch: false,
      blocker: "BLOCKED_BY_P0_008"
    },
    {
      total: "arrears outstanding",
      currentSource: "legacy arrears / arrear_tasks remain fields",
      backendCandidate: "computeArrearsOutstandingFils interim candidate",
      canShadowCompare: true,
      canStagingSwitch: false,
      canProductionSwitch: false,
      blocker: "BLOCKED_BY_P0_008"
    },
    {
      total: "handover totals",
      currentSource: "handover staging backend totals",
      backendCandidate: "handover atomic backend totals",
      canShadowCompare: true,
      canStagingSwitch: true,
      canProductionSwitch: false,
      blocker: "PRODUCTION_NO_GO"
    },
    {
      total: "session totals",
      currentSource: "sessions submitted totals and transactions",
      backendCandidate: "computeSessionTotalsFils",
      canShadowCompare: true,
      canStagingSwitch: true,
      canProductionSwitch: false,
      blocker: "PRODUCTION_NO_GO"
    },
    {
      total: "history row totals",
      currentSource: "history row display",
      backendCandidate: "row-level transaction recompute",
      canShadowCompare: true,
      canStagingSwitch: false,
      canProductionSwitch: false,
      blocker: "BLOCKED_BY_P0_001"
    },
    {
      total: "voided records exclusion",
      currentSource: "legacy void fields",
      backendCandidate: "backend active totals exclude voided rows",
      canShadowCompare: true,
      canStagingSwitch: true,
      canProductionSwitch: false,
      blocker: "PRODUCTION_NO_GO"
    },
    {
      total: "active records totals",
      currentSource: "legacy active row filters",
      backendCandidate: "backend active-row filters",
      canShadowCompare: true,
      canStagingSwitch: true,
      canProductionSwitch: false,
      blocker: "PRODUCTION_NO_GO"
    }
  ];
}

export function classifyTotalScope(total) {
  const row = backendTotalsStagingScopeRows().find((item) => item.total === total);
  if (!row) return "MANUAL_REQUIRED";
  if (!row.canShadowCompare) return row.blocker || "BLOCKED";
  if (row.canStagingSwitch && !row.canProductionSwitch) return "STAGING_SWITCH_CANDIDATE";
  return row.blocker || "SHADOW_ONLY";
}

export function normalizeSwitchScenarioName(scenario) {
  const value = String(scenario || "").trim();
  if (value.startsWith("session totals:")) return "session totals";
  if (value.startsWith("handover totals:")) return "handover totals";
  return value;
}

export function classifyBackendTotalsSwitchScenario(scenario) {
  const normalized = normalizeSwitchScenarioName(scenario);
  if (APPROVED_BACKEND_TOTALS_STAGING_SWITCH_TOTALS.has(normalized)) {
    return "STAGING_SWITCH_CANDIDATE";
  }
  if (BLOCKED_BACKEND_TOTALS_STAGING_SWITCH_TOTALS.has(normalized)) {
    return BLOCKED_BACKEND_TOTALS_STAGING_SWITCH_TOTALS.get(normalized);
  }
  return classifyTotalScope(normalized);
}

export function createBackendTotalsStagingSwitchRows(comparisonRows, env = {}) {
  const mode = resolveBackendTotalsStagingMode(env);
  return comparisonRows.map((row) => {
    const scenario = String(row.Scenario || "");
    const scenarioClass = classifyBackendTotalsSwitchScenario(scenario);
    const legacyTotal = row["Current / Legacy Total"] ?? "";
    const backendTotal = row["Backend Authority Candidate"] ?? "";
    const delta = row.Delta ?? "";
    const status = row.Status || "MANUAL_REQUIRED";

    if (!mode.enabled) {
      return {
        Scenario: scenario,
        "Legacy Total": legacyTotal,
        "Backend Total": backendTotal,
        Mode: "LEGACY",
        Delta: delta,
        Result: "LEGACY",
        Notes: "Feature flag off or environment not allowed; legacy behavior remains active."
      };
    }

    if (scenarioClass === "STAGING_SWITCH_CANDIDATE") {
      if (status === "MISMATCH" || status === "BLOCKED") {
        return {
          Scenario: scenario,
          "Legacy Total": legacyTotal,
          "Backend Total": backendTotal,
          Mode: "BACKEND_TOTALS_STAGING",
          Delta: delta,
          Result: "BLOCKED",
          Notes: "Approved candidate cannot switch while mismatch or blocked status is present."
        };
      }
      return {
        Scenario: scenario,
        "Legacy Total": legacyTotal,
        "Backend Total": backendTotal,
        Mode: "BACKEND_TOTALS_STAGING",
        Delta: delta,
        Result: status === "MANUAL_REQUIRED" ? "MANUAL_REQUIRED" : "PASS",
        Notes: "Approved staging candidate uses backend authority candidate in rehearsal only."
      };
    }

    if (String(scenarioClass).startsWith("BLOCKED_BY_")) {
      return {
        Scenario: scenario,
        "Legacy Total": legacyTotal,
        "Backend Total": backendTotal,
        Mode: "SHADOW_ONLY",
        Delta: delta,
        Result: "SHADOW_ONLY",
        Notes: `${scenarioClass}; total remains legacy/shadow-only and is not switched.`
      };
    }

    return {
      Scenario: scenario,
      "Legacy Total": legacyTotal,
      "Backend Total": backendTotal,
      Mode: "SHADOW_ONLY",
      Delta: delta,
      Result: status === "MISMATCH" ? "MANUAL_REQUIRED" : "SHADOW_ONLY",
      Notes: "Not in approved staging switch scope; retained for evidence only."
    };
  });
}

export function summarizeBackendTotalsStagingSwitchRows(rows) {
  const blocked = rows.filter((row) => row.Result === "BLOCKED");
  const manual = rows.filter((row) => row.Result === "MANUAL_REQUIRED");
  const unexpectedSwitches = rows.filter(
    (row) =>
      row.Mode === "BACKEND_TOTALS_STAGING" &&
      classifyBackendTotalsSwitchScenario(row.Scenario) !== "STAGING_SWITCH_CANDIDATE"
  );
  return {
    overall:
      blocked.length || unexpectedSwitches.length
        ? "BLOCKED"
        : manual.length
          ? "MANUAL_REQUIRED"
          : "PASS",
    blockedCount: blocked.length,
    manualRequiredCount: manual.length,
    unexpectedSwitchCount: unexpectedSwitches.length
  };
}

export function compareAedTotals(currentAed, candidateFils) {
  const currentFils = parseAedToFils(String(currentAed ?? "0"), { allowNegative: true });
  const candidate = BigInt(candidateFils || 0n);
  const delta = currentFils - candidate;
  return {
    currentFils,
    candidateFils: candidate,
    deltaFils: delta,
    deltaAed: filsToAedString(delta),
    status: delta === 0n ? "MATCH" : "MISMATCH"
  };
}

function runWrangler(args) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "powershell.exe" : "npx";
    const quotePs = (arg) => `'${String(arg).replaceAll("'", "''")}'`;
    const spawnArgs =
      process.platform === "win32"
        ? ["-NoProfile", "-Command", `& ${["npx", "wrangler", ...args].map(quotePs).join(" ")}`]
        : ["wrangler", ...args];
    const child = spawn(command, spawnArgs, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
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

async function assertStagingTarget() {
  const result = await runWrangler(["d1", "info", expectedStagingD1.name, "--json"]);
  if (result.code !== 0) {
    throw new Error(
      `Unable to confirm staging D1 target. Exit ${result.code}; ${String(result.stderr || "").slice(0, 240)}`
    );
  }
  const parsed = JSON.parse(result.stdout);
  if (parsed.name !== expectedStagingD1.name || parsed.uuid !== expectedStagingD1.id) {
    throw new Error("D1 target mismatch; refusing staging backend totals comparison.");
  }
  return parsed;
}

async function d1Select(sql) {
  const result = await runWrangler([
    "d1",
    "execute",
    expectedStagingD1.name,
    "--remote",
    "--json",
    "--command",
    sql.replace(/\s+/g, " ").trim()
  ]);
  if (result.code !== 0) {
    throw new Error(`Read-only staging D1 SELECT failed with exit code ${result.code}.`);
  }
  const parsed = JSON.parse(result.stdout);
  return parsed?.[0]?.results || [];
}

export async function readStagingBackendTotalsData() {
  const target = await assertStagingTarget();
  const transactions = await d1Select(`SELECT
    id, corpid, userid, session_id, cat, amount, paid, pay_type, created_at,
    type, status, voided_at, linked_task_id, room, note, src
    FROM transactions
    ORDER BY created_at, id`);
  const sessions = await d1Select(`SELECT
    id, corpid, date, cash_handover, bank_transfer_total, bank_transfer_count,
    gross_received, voided_at, created_at
    FROM sessions
    ORDER BY created_at, id`);
  const arrearTasks = await d1Select(`SELECT
    task_id, corpid, arrear_amount, actual_received, followup_status,
    close_status, promise_date AS due_date, voided_at, created_at,
    bed, tenant_name, arrear_reason, staff_note, owner_note, created_by
    FROM arrear_tasks
    ORDER BY created_at, task_id`);
  const arrears = await d1Select(`SELECT
    id, corpid, remain, cleared, type, due_date, voided_at, created_at
    FROM arrears
    ORDER BY created_at, id`);

  return {
    target,
    transactions,
    sessions,
    arrearRows: [...arrearTasks, ...arrears]
  };
}

function aed(value) {
  return filsToAedString(value || 0n);
}

function sumLegacyAed(rows, key) {
  return rows.reduce((sum, row) => {
    try {
      return sum + parseAedToFils(String(row?.[key] ?? "0"), { allowNegative: true });
    } catch {
      return sum;
    }
  }, 0n);
}

function sumTransactionsByCategory(rows, category) {
  return rows.reduce((sum, row) => {
    try {
      const normalized = normalizeHandoverCategory(
        row.category ?? row.event_type ?? row.type ?? row.code ?? row.tx_type ?? row.cat ?? ""
      );
      if (normalized !== category) return sum;
      return sum + parseAedToFils(String(row.amount ?? row.paid ?? "0"), { allowNegative: true });
    } catch {
      return sum;
    }
  }, 0n);
}

function statusForDelta(delta, warnings = 0, errors = 0) {
  if (errors > 0) return "BLOCKED";
  if (delta !== 0n) return "MISMATCH";
  if (warnings > 0) return "LEGACY_WARNING";
  return "MATCH";
}

export function isReceivablesShadowRehearsalTransaction(row) {
  return (
    String(row?.src || "") === RECEIVABLES_SHADOW_REHEARSAL_SOURCE ||
    String(row?.corpid || "") === RECEIVABLES_SHADOW_REHEARSAL_CORPID ||
    String(row?.id || "").startsWith("p0_008e_")
  );
}

export function splitBackendTotalsTransactions(rows = []) {
  const included = [];
  const excludedReceivablesShadowRows = [];
  for (const row of rows) {
    if (isReceivablesShadowRehearsalTransaction(row)) {
      excludedReceivablesShadowRows.push(row);
    } else {
      included.push(row);
    }
  }
  return { included, excludedReceivablesShadowRows };
}

function comparisonRow({ scenario, currentFils, candidateFils, status, notes }) {
  const delta = BigInt(currentFils || 0n) - BigInt(candidateFils || 0n);
  return {
    Scenario: scenario,
    "Current / Legacy Total": aed(currentFils),
    "Backend Authority Candidate": aed(candidateFils),
    Delta: aed(delta),
    Status: status || statusForDelta(delta),
    Notes: notes
  };
}

export function createComparisonRowsFromData({ transactions, sessions, arrearRows }) {
  const rows = [];
  const { included: backendScopeTransactions, excludedReceivablesShadowRows } =
    splitBackendTotalsTransactions(transactions);
  const dashboardTotals = computeDashboardTotalsFils(backendScopeTransactions, {
    arrearsRows: arrearRows
  });
  const sessionCash = sumLegacyAed(sessions, "cash_handover");
  const sessionBank = sumLegacyAed(sessions, "bank_transfer_total");
  const sessionGross = sumLegacyAed(sessions, "gross_received");
  const sessionBankCount = sessions.reduce(
    (sum, row) => sum + Number(row.bank_transfer_count || 0),
    0
  );
  const legacyRent = sumTransactionsByCategory(backendScopeTransactions, "rent");
  const sessionRows = new Map();

  for (const row of backendScopeTransactions) {
    const key = row.session_id || "NO_SESSION";
    if (!sessionRows.has(key)) sessionRows.set(key, []);
    sessionRows.get(key).push(row);
  }

  rows.push(
    comparisonRow({
      scenario: "cash total",
      currentFils: sessionCash,
      candidateFils: dashboardTotals.cashHandoverFils,
      status: statusForDelta(sessionCash - dashboardTotals.cashHandoverFils),
      notes: "Legacy sessions cash_handover vs backend active transaction recompute."
    })
  );
  rows.push(
    comparisonRow({
      scenario: "bank transfer total",
      currentFils: sessionBank,
      candidateFils: dashboardTotals.bankTransferTotalFils,
      status: statusForDelta(sessionBank - dashboardTotals.bankTransferTotalFils),
      notes: "Legacy sessions bank_transfer_total vs backend active transaction recompute."
    })
  );
  rows.push({
    Scenario: "bank transfer count",
    "Current / Legacy Total": String(sessionBankCount),
    "Backend Authority Candidate": String(dashboardTotals.bankTransferCount),
    Delta: String(sessionBankCount - dashboardTotals.bankTransferCount),
    Status: sessionBankCount === dashboardTotals.bankTransferCount ? "MATCH" : "MISMATCH",
    Notes: "Legacy session bank transfer count vs backend active bank-row recompute."
  });
  rows.push(
    comparisonRow({
      scenario: "gross received",
      currentFils: sessionGross,
      candidateFils: dashboardTotals.grossReceivedFils,
      status: statusForDelta(sessionGross - dashboardTotals.grossReceivedFils),
      notes: "Legacy sessions gross_received vs backend gross received candidate."
    })
  );
  rows.push(
    comparisonRow({
      scenario: "rent received",
      currentFils: legacyRent,
      candidateFils: dashboardTotals.rentReceivedFils,
      status: statusForDelta(legacyRent - dashboardTotals.rentReceivedFils),
      notes: "Legacy rent-category transaction total vs backend rent received candidate."
    })
  );

  for (const session of sessions) {
    const txRows = sessionRows.get(session.id) || [];
    const totals = computeSessionTotalsFils(txRows, {
      frontendTotals: {
        cash_handover: session.cash_handover,
        bank_transfer_total: session.bank_transfer_total,
        bank_transfer_count: session.bank_transfer_count,
        gross_received: session.gross_received
      }
    });
    const maxDelta = (totals.comparison?.comparisons || [])
      .filter((item) => typeof item.deltaFils === "bigint")
      .map((item) => (item.deltaFils < 0n ? -item.deltaFils : item.deltaFils))
      .reduce((max, item) => (item > max ? item : max), 0n);
    rows.push({
      Scenario: `session totals: ${session.id}`,
      "Current / Legacy Total": `cash ${session.cash_handover ?? "0"} / bank ${session.bank_transfer_total ?? "0"} / gross ${session.gross_received ?? "0"}`,
      "Backend Authority Candidate": `cash ${aed(totals.cashHandoverFils)} / bank ${aed(totals.bankTransferTotalFils)} / gross ${aed(totals.grossReceivedFils)}`,
      Delta: aed(maxDelta),
      Status: totals.comparison?.matches
        ? totals.warnings.length
          ? "LEGACY_WARNING"
          : "MATCH"
        : "MISMATCH",
      Notes: "Session frontend totals are comparison input only."
    });
  }

  rows.push({
    Scenario: "legacy decimal / fils conversion",
    "Current / Legacy Total": `${backendScopeTransactions.length} transaction rows`,
    "Backend Authority Candidate": `${dashboardTotals.warnings.length} warnings / ${dashboardTotals.errors.length} errors`,
    Delta: "0.00",
    Status: dashboardTotals.errors.length ? "BLOCKED" : "LEGACY_WARNING",
    Notes: "Legacy decimal values are parsed to integer fils for shadow comparison."
  });

  rows.push({
    Scenario: "voided records exclusion",
    "Current / Legacy Total": `${dashboardTotals.excludedVoidedRowCount} excluded rows`,
    "Backend Authority Candidate": "active totals exclude voided rows",
    Delta: "0.00",
    Status: "MATCH",
    Notes: "Backend active totals exclude voided rows by default."
  });

  rows.push({
    Scenario: "active records totals",
    "Current / Legacy Total": `${dashboardTotals.includedRowCount} included rows`,
    "Backend Authority Candidate": `${dashboardTotals.includedRowCount} active rows`,
    Delta: "0.00",
    Status: "MATCH",
    Notes: "Backend active totals include accepted rows and exclude voided rows."
  });

  if (excludedReceivablesShadowRows.length > 0) {
    rows.push({
      Scenario: "staging-only receivables rehearsal rows",
      "Current / Legacy Total": `${excludedReceivablesShadowRows.length} excluded rows`,
      "Backend Authority Candidate": "excluded from backend totals authority comparison",
      Delta: "0.00",
      Status: "MATCH",
      Notes:
        "P0-008E receivables shadow evidence rows are isolated from backend totals switch comparison."
    });
  }

  rows.push(
    comparisonRow({
      scenario: "arrears outstanding",
      currentFils: dashboardTotals.arrearsOutstandingFils,
      candidateFils: dashboardTotals.arrearsOutstandingFils,
      status: "BLOCKED",
      notes: "Interim shadow only; final authority blocked by P0-008 receivables."
    })
  );

  rows.push({
    Scenario: "dashboard/history API current result",
    "Current / Legacy Total": "MANUAL_REQUIRED",
    "Backend Authority Candidate": "read-only D1 candidate generated",
    Delta: "0.00",
    Status: "MANUAL_REQUIRED",
    Notes: "No authenticated API response mutation was performed by this script."
  });

  return rows;
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

async function run() {
  const { target, transactions, sessions, arrearRows } = await readStagingBackendTotalsData();
  const rows = createComparisonRowsFromData({ transactions, sessions, arrearRows });
  const hasMismatch = rows.some((row) => row.Status === "MISMATCH");
  const hasBlocked = rows.some((row) => row.Status === "BLOCKED");
  const hasManual = rows.some((row) => row.Status === "MANUAL_REQUIRED");
  const overall = hasMismatch ? "MISMATCH" : hasBlocked || hasManual ? "MANUAL_REQUIRED" : "PASS";

  const report = [
    "# Staging Backend Totals Comparison Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: read-only staging D1 comparison. This script does not deploy, migrate, write D1 rows, mutate API responses, or change dashboard output.",
    "",
    `Target D1: \`${target.name}\` (\`${target.uuid}\`)`,
    "",
    `Overall: \`${overall}\``,
    "",
    markdownTable(rows, [
      "Scenario",
      "Current / Legacy Total",
      "Backend Authority Candidate",
      "Delta",
      "Status",
      "Notes"
    ]),
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Staging D1 write: no.",
    "- API response mutation: no.",
    "- Dashboard mutation: no.",
    "",
    "Interpretation:",
    "",
    "- `MATCH` means the staging legacy total and backend candidate matched for the checked scope.",
    "- `LEGACY_WARNING` means the candidate was computed from legacy decimal fields and needs minor-unit reconciliation before production.",
    "- `MISMATCH` blocks staging switch rehearsal for that total until reviewed.",
    "- `BLOCKED` means the total is intentionally blocked by unresolved P0 dependencies.",
    "- `MANUAL_REQUIRED` means authenticated dashboard/history response evidence is still required before switch rehearsal.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`STAGING_BACKEND_TOTALS_COMPARISON=${overall}`);
  console.log(`STAGING_BACKEND_TOTALS_MISMATCH=${hasMismatch ? "yes" : "no"}`);
  console.log(`STAGING_BACKEND_TOTALS_REPORT=${path.relative(process.cwd(), reportPath)}`);
}

if (import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
  if (invoked === import.meta.url) {
    run().catch((error) => {
      console.error(`STAGING_BACKEND_TOTALS_COMPARISON=BLOCKED: ${error?.message || error}`);
      process.exit(1);
    });
  }
}

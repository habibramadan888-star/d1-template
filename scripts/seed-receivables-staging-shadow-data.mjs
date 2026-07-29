#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { P0_008E_QA_RUN_ID, P0_008E_SOURCE } from "./compare-staging-receivables-shadow.mjs";

const expectedStagingD1 = {
  name: "homelink-finance-staging",
  id: "4ff78bfc-3855-436b-aefb-6b492145d79c"
};
const reportPath = path.resolve("RECEIVABLES_STAGING_SHADOW_DATA_SEED_RESULT.md");
const confirmWrite = process.argv.includes("--confirm-staging-receivables-write");
const timestamp = new Date().toISOString();
const qaCorpid = "p0-008e-shadow";

function psQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
  if (value === null || value === undefined) return "NULL";
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Unsafe numeric SQL value: ${value}`);
  return number.toFixed(2);
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    let child;
    let stdout = "";
    let stderr = "";
    try {
      child = spawn(command, args, {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
        ...options
      });
    } catch (error) {
      resolve({ code: -1, stdout, stderr: error?.message || String(error) });
      return;
    }
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      stderr += error?.message || String(error);
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function runWrangler(args) {
  if (process.platform === "win32") {
    return runProcess("powershell.exe", [
      "-NoProfile",
      "-Command",
      `& ${["npx", "wrangler", ...args].map(psQuote).join(" ")}`
    ]);
  }
  return runProcess("npx", ["wrangler", ...args]);
}

async function assertProductionUrlExcluded() {
  const content = await readFile("PRODUCTION_URL_EXCLUSION_FINAL_REVIEW.md", "utf8");
  if (!content.includes("CONFIRMED_EXCLUDED")) {
    throw new Error("Production URL exclusion is not confirmed.");
  }
}

async function assertCommercialGateNoGo() {
  const result =
    process.platform === "win32"
      ? await runProcess("powershell.exe", [
          "-NoProfile",
          "-Command",
          `& ${["npm", "run", "gate:commercial-launch"].map(psQuote).join(" ")}`
        ])
      : await runProcess("npm", ["run", "gate:commercial-launch"]);
  if (
    result.code !== 0 ||
    !result.stdout.includes("COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO")
  ) {
    throw new Error(
      `Commercial launch gate is not PRODUCTION_NO_GO. Exit ${result.code}; ${String(result.stderr || "").slice(0, 240)}`
    );
  }
  return result.stdout;
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
    throw new Error(
      `D1 target mismatch; expected ${expectedStagingD1.name}/${expectedStagingD1.id}.`
    );
  }
  return parsed;
}

async function d1Json(command) {
  const result = await runWrangler([
    "d1",
    "execute",
    expectedStagingD1.name,
    "--remote",
    "--json",
    "--command",
    command.replace(/\s+/g, " ").trim()
  ]);
  if (result.code !== 0) {
    throw new Error(`Staging D1 command failed with exit code ${result.code}.`);
  }
  return JSON.parse(result.stdout);
}

async function countSeedRows() {
  const parsed = await d1Json(`SELECT
    (SELECT COUNT(*) FROM arrear_tasks WHERE task_id LIKE 'p0_008e_%') AS arrear_tasks_count,
    (SELECT COUNT(*) FROM transactions WHERE id LIKE 'p0_008e_%') AS transactions_count`);
  const row = parsed?.[0]?.results?.[0] || {};
  return {
    arrear_tasks: Number(row.arrear_tasks_count || 0),
    transactions: Number(row.transactions_count || 0)
  };
}

function qaNote(scenario) {
  return `qa_run_id=${P0_008E_QA_RUN_ID};source=${P0_008E_SOURCE};scenario=${scenario};amounts=fils`;
}

const arrearRows = [
  {
    task_id: "p0_008e_due_today",
    bed: "P0-008E-DUE",
    tenant_name: "P0-008E Due Today",
    arrear_amount: 500,
    actual_received: 0,
    promise_date: "2026-05-25",
    followup_status: "OPEN",
    close_status: null,
    scenario: "due_today"
  },
  {
    task_id: "p0_008e_overdue",
    bed: "P0-008E-OVERDUE",
    tenant_name: "P0-008E Overdue",
    arrear_amount: 900,
    actual_received: 100,
    promise_date: "2026-05-20",
    followup_status: "OPEN",
    close_status: null,
    scenario: "overdue"
  },
  {
    task_id: "p0_008e_short_pay",
    bed: "P0-008E-SHORT",
    tenant_name: "P0-008E Short Pay",
    arrear_amount: 770,
    actual_received: 80,
    promise_date: "2026-05-25",
    followup_status: "OPEN",
    close_status: null,
    scenario: "short_pay"
  },
  {
    task_id: "p0_008e_partial_repayment",
    bed: "P0-008E-PARTIAL",
    tenant_name: "P0-008E Partial Repayment",
    arrear_amount: 1000,
    actual_received: 400,
    promise_date: "2026-05-20",
    followup_status: "PARTIAL",
    close_status: null,
    scenario: "partial_repayment"
  },
  {
    task_id: "p0_008e_full_repayment",
    bed: "P0-008E-FULL",
    tenant_name: "P0-008E Full Repayment",
    arrear_amount: 300,
    actual_received: 300,
    promise_date: "2026-05-20",
    followup_status: "SETTLED",
    close_status: "PAID",
    scenario: "full_repayment"
  },
  {
    task_id: "p0_008e_adjustment_credit",
    bed: "P0-008E-CREDIT",
    tenant_name: "P0-008E Adjustment Credit",
    arrear_amount: 700,
    actual_received: 600,
    promise_date: "2026-05-30",
    followup_status: "ADJUSTMENT_REVIEW",
    close_status: null,
    scenario: "adjustment_credit;adjustment_credit_fils=10000"
  },
  {
    task_id: "p0_008e_adjustment_debit",
    bed: "P0-008E-DEBIT",
    tenant_name: "P0-008E Adjustment Debit",
    arrear_amount: 500,
    actual_received: 500,
    promise_date: "2026-05-30",
    followup_status: "ADJUSTMENT_REVIEW",
    close_status: null,
    scenario: "adjustment_debit;adjustment_debit_fils=10000"
  }
];

const transactionRows = [
  {
    id: "p0_008e_voided_payment",
    cat: "rent",
    type: "R",
    room: "P0-008E-VOID",
    amount: 450,
    paid: 450,
    status: "VOIDED",
    voided_at: "2026-05-25T12:00:00.000Z",
    note: qaNote("voided_payment")
  },
  {
    id: "p0_008e_deposit_exclusion",
    cat: "deposit",
    type: "D",
    room: "P0-008E-DEP",
    amount: 250,
    paid: 250,
    status: "ACTIVE",
    voided_at: null,
    note: qaNote("deposit_exclusion")
  }
];

function buildArrearInsert(row) {
  return `INSERT OR REPLACE INTO arrear_tasks (
    task_id, corpid, userid, entry_id, bed, tenant_name, arrear_amount,
    arrear_reason, created_at, followup_status, promise_date, promise_amount,
    actual_received, close_status, owner_note, staff_note, updated_by,
    updated_at, tenant_card_id, original_entry_id, original_period_start,
    original_period_end, created_by
  ) VALUES (
    ${sqlString(row.task_id)}, ${sqlString(qaCorpid)}, ${sqlString("p0-008e-shadow-user")},
    ${sqlString(row.task_id)}, ${sqlString(row.bed)}, ${sqlString(row.tenant_name)},
    ${sqlNumber(row.arrear_amount)}, ${sqlString(P0_008E_SOURCE)}, ${sqlString(timestamp)},
    ${sqlString(row.followup_status)}, ${sqlString(row.promise_date)}, ${sqlNumber(row.arrear_amount)},
    ${sqlNumber(row.actual_received)}, ${sqlString(row.close_status)}, ${sqlString(qaNote(row.scenario))},
    ${sqlString(qaNote(row.scenario))}, ${sqlString(P0_008E_SOURCE)}, ${sqlString(timestamp)},
    ${sqlString(`tenant_${row.task_id}`)}, ${sqlString(`entry_${row.task_id}`)},
    ${sqlString("2026-05-01")}, ${sqlString("2026-05-31")}, ${sqlString(P0_008E_SOURCE)}
  )`;
}

function buildTransactionInsert(row) {
  return `INSERT OR REPLACE INTO transactions (
    id, corpid, userid, session_id, cat, room, amount, due, paid, deficit,
    tag, note, created_at, type, status, src, voided_at, void_source
  ) VALUES (
    ${sqlString(row.id)}, ${sqlString(qaCorpid)}, ${sqlString("p0-008e-shadow-user")},
    ${sqlString("p0_008e_shadow_session")}, ${sqlString(row.cat)}, ${sqlString(row.room)},
    ${sqlNumber(row.amount)}, ${sqlNumber(row.amount)}, ${sqlNumber(row.paid)},
    ${sqlNumber(Math.max(row.amount - row.paid, 0))}, ${sqlString(P0_008E_SOURCE)},
    ${sqlString(row.note)}, ${sqlString(timestamp)}, ${sqlString(row.type)},
    ${sqlString(row.status)}, ${sqlString(P0_008E_SOURCE)}, ${sqlString(row.voided_at)},
    ${sqlString(row.voided_at ? P0_008E_SOURCE : null)}
  )`;
}

function plannedRows() {
  return [
    ...arrearRows.map((row) => ({
      Table: "arrear_tasks",
      ID: row.task_id,
      Scenario: row.scenario.split(";")[0],
      "Amount Fils": String(BigInt(Math.round(row.arrear_amount * 100))),
      "Paid Fils": String(BigInt(Math.round(row.actual_received * 100)))
    })),
    ...transactionRows.map((row) => ({
      Table: "transactions",
      ID: row.id,
      Scenario: row.id.replace("p0_008e_", ""),
      "Amount Fils": String(BigInt(Math.round(row.amount * 100))),
      "Paid Fils": String(BigInt(Math.round(row.paid * 100)))
    }))
  ];
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

async function writeReport({ target, before, after, result, gateOutput, wrote }) {
  const report = [
    "# Receivables Staging Shadow Data Seed Result",
    "",
    `Generated: ${timestamp}`,
    "",
    `Result: \`${result}\``,
    "",
    `QA run id: \`${P0_008E_QA_RUN_ID}\``,
    `Source: \`${P0_008E_SOURCE}\``,
    `Target D1: \`${target.name}\` (\`${target.uuid}\`)`,
    "",
    "Mode:",
    "",
    `- Confirm flag present: ${confirmWrite ? "yes" : "no"}.`,
    `- Staging D1 write executed: ${wrote ? "yes" : "no"}.`,
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Secret/password/token/cookie logged: no.",
    "",
    "Before / after counts:",
    "",
    markdownTable(
      [
        {
          Table: "arrear_tasks",
          Before: before.arrear_tasks,
          After: after.arrear_tasks,
          Delta: after.arrear_tasks - before.arrear_tasks
        },
        {
          Table: "transactions",
          Before: before.transactions,
          After: after.transactions,
          Delta: after.transactions - before.transactions
        }
      ],
      ["Table", "Before", "After", "Delta"]
    ),
    "",
    "Planned / seeded rows:",
    "",
    markdownTable(plannedRows(), ["Table", "ID", "Scenario", "Amount Fils", "Paid Fils"]),
    "",
    "Gate evidence:",
    "",
    "```text",
    gateOutput.trim(),
    "```",
    "",
    "Rollback recommendation:",
    "",
    "- Keep this data temporarily as staging QA evidence.",
    "- If cleanup is approved later, delete only rows with IDs beginning `p0_008e_` after a staging backup.",
    "- Do not delete production data.",
    ""
  ].join("\n");
  await writeFile(reportPath, `${report}\n`);
}

async function run() {
  const target = await assertStagingTarget();
  await assertProductionUrlExcluded();
  const gateOutput = await assertCommercialGateNoGo();
  const before = await countSeedRows();
  const statements = [
    ...arrearRows.map(buildArrearInsert),
    ...transactionRows.map(buildTransactionInsert)
  ];

  if (!confirmWrite) {
    await writeReport({
      target,
      before,
      after: before,
      result: "DRY_RUN_ONLY",
      gateOutput,
      wrote: false
    });
    console.log("RECEIVABLES_STAGING_SHADOW_SEED=DRY_RUN_ONLY");
    console.log(`RECEIVABLES_STAGING_SHADOW_QA_RUN_ID=${P0_008E_QA_RUN_ID}`);
    console.log("RECEIVABLES_STAGING_SHADOW_WRITE=no");
    console.log(`RECEIVABLES_STAGING_SHADOW_ROWS_PLANNED=${statements.length}`);
    return;
  }

  for (const statement of statements) {
    await d1Json(statement);
  }

  const after = await countSeedRows();
  await writeReport({
    target,
    before,
    after,
    result: "PASS",
    gateOutput,
    wrote: true
  });
  console.log("RECEIVABLES_STAGING_SHADOW_SEED=PASS");
  console.log(`RECEIVABLES_STAGING_SHADOW_QA_RUN_ID=${P0_008E_QA_RUN_ID}`);
  console.log("RECEIVABLES_STAGING_SHADOW_WRITE=yes");
  console.log(`RECEIVABLES_STAGING_SHADOW_ARREAR_TASKS=${after.arrear_tasks}`);
  console.log(`RECEIVABLES_STAGING_SHADOW_TRANSACTIONS=${after.transactions}`);
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invoked === import.meta.url) {
  run().catch(async (error) => {
    const message = error?.message || String(error);
    await writeFile(
      reportPath,
      [
        "# Receivables Staging Shadow Data Seed Result",
        "",
        `Generated: ${timestamp}`,
        "",
        "Result: `BLOCKED`",
        "",
        `QA run id: \`${P0_008E_QA_RUN_ID}\``,
        "",
        `Error: ${message}`,
        "",
        "Rollback recommendation: do not proceed to staging shadow comparison until the blocker is reviewed.",
        ""
      ].join("\n")
    );
    console.error(`RECEIVABLES_STAGING_SHADOW_SEED=BLOCKED: ${message}`);
    process.exit(1);
  });
}

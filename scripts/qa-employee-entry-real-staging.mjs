#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const env = process.env;

const CONFIRMATIONS = ["--confirm-staging-write", "--confirm-backup", "--confirm-rollback"];

const expected = {
  workerUrl: "https://homelink-finance-staging.habibramadan888.workers.dev",
  d1Name: "homelink-finance-staging",
  d1Id: "4ff78bfc-3855-436b-aefb-6b492145d79c",
  workerName: "homelink-finance-staging"
};

const secretMaterialPath = path.resolve(
  ".tmp",
  "staging-secrets",
  "staging-test-passwords.local.json"
);

function readTextIfExists(filePath) {
  try {
    return fs.readFileSync(path.resolve(filePath), "utf8");
  } catch {
    return "";
  }
}

function firstMatch(text, regex) {
  const match = text.match(regex);
  return match ? match[1] : "";
}

function readSafeDefaults() {
  const wrangler = readTextIfExists("deploy-worker/wrangler.toml");
  const evidence = readTextIfExists("STAGING_QA_EVIDENCE_TEMPLATE.md");
  return {
    STAGING_WORKER_URL:
      env.STAGING_WORKER_URL ||
      firstMatch(evidence, /`(https:\/\/homelink-finance-staging\.[^`\s]+)`/) ||
      expected.workerUrl,
    STAGING_D1_DATABASE:
      env.STAGING_D1_DATABASE ||
      firstMatch(wrangler, /database_name\s*=\s*"([^"]*homelink-finance-staging[^"]*)"/) ||
      expected.d1Name,
    STAGING_D1_ID:
      env.STAGING_D1_ID ||
      firstMatch(wrangler, /database_id\s*=\s*"(4ff78bfc-3855-436b-aefb-6b492145d79c)"/) ||
      expected.d1Id,
    STAGING_ENTRYPOINT:
      env.STAGING_ENTRYPOINT ||
      firstMatch(wrangler, /\[env\.staging\][\s\S]*?main\s*=\s*"([^"]+)"/),
    STAGING_EMPLOYEE_USERNAME:
      env.STAGING_EMPLOYEE_USERNAME || firstMatch(evidence, /`(employee_stg_qa_001)`/),
    STAGING_OWNER_USERNAME:
      env.STAGING_OWNER_USERNAME || firstMatch(evidence, /`(owner_stg_qa_001)`/)
  };
}

const safeDefaults = readSafeDefaults();

function looksProductionUrl(value) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return (
    lower.includes("production") ||
    lower.includes("prod") ||
    lower === "https://homelink-finance.workers.dev" ||
    lower.includes("homelink-finance.workers.dev")
  );
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

async function writeDryRunReport(result, rows) {
  const lines = [
    "# Employee Entry Real Staging QA Dry-Run Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Result: \`${result}\``,
    "",
    markdownTable(rows, ["Check", "Result", "Notes"]),
    "",
    "This script does not deploy, migrate, or write staging data unless all explicit confirmations are supplied."
  ];
  await writeFile("EMPLOYEE_ENTRY_REAL_STAGING_QA_DRY_RUN_RESULT.md", `${lines.join("\n")}\n`);
}

function dryRunRows() {
  const required = [
    ["STAGING_WORKER_URL", safeDefaults.STAGING_WORKER_URL],
    ["STAGING_D1_DATABASE", safeDefaults.STAGING_D1_DATABASE],
    ["STAGING_ENTRYPOINT", safeDefaults.STAGING_ENTRYPOINT],
    ["STAGING_EMPLOYEE_USERNAME", safeDefaults.STAGING_EMPLOYEE_USERNAME],
    ["STAGING_OWNER_USERNAME", safeDefaults.STAGING_OWNER_USERNAME]
  ];
  const rows = [];
  let manualRequired = false;
  let blocked = false;

  for (const [name, value] of required) {
    if (value) {
      rows.push({
        Check: name,
        Result: "FOUND",
        Notes: name.includes("USERNAME") ? "value present, not printed" : value
      });
    } else {
      manualRequired = true;
      rows.push({ Check: name, Result: "MISSING", Notes: "manual staging input required" });
    }
  }

  if (looksProductionUrl(safeDefaults.STAGING_WORKER_URL)) {
    blocked = true;
    rows.push({
      Check: "production URL guard",
      Result: "BLOCKED",
      Notes: "STAGING_WORKER_URL looks like production; refusing staging QA"
    });
  } else {
    rows.push({
      Check: "production URL guard",
      Result: safeDefaults.STAGING_WORKER_URL ? "PASS" : "MANUAL_REQUIRED",
      Notes: safeDefaults.STAGING_WORKER_URL
        ? "URL does not match blocked production patterns"
        : "no URL provided"
    });
  }

  for (const flag of CONFIRMATIONS) {
    const present = args.has(flag);
    if (present) {
      rows.push({ Check: flag, Result: "CONFIRMED", Notes: "explicit CLI confirmation present" });
    } else {
      manualRequired = true;
      rows.push({ Check: flag, Result: "MISSING", Notes: "required before any staging write" });
    }
  }

  return {
    result: blocked ? "BLOCKED" : manualRequired ? "MANUAL_REQUIRED" : "DRY_RUN_READY",
    rows
  };
}

function runWrangler(argsForWrangler, { input } = {}) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "powershell.exe" : "npx";
    const quotePs = (arg) => `'${String(arg).replaceAll("'", "''")}'`;
    const spawnArgs =
      process.platform === "win32"
        ? [
            "-NoProfile",
            "-Command",
            `& ${["npx", "wrangler", ...argsForWrangler].map(quotePs).join(" ")}`
          ]
        : ["wrangler", ...argsForWrangler];
    const child = spawn(command, spawnArgs, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
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
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

async function d1Info() {
  const result = await runWrangler(["d1", "info", expected.d1Name, "--json"]);
  if (result.code !== 0) {
    throw new Error("Unable to confirm staging D1 target.");
  }
  return JSON.parse(result.stdout);
}

async function d1Query(sql) {
  const command = sql.replace(/\s+/g, " ").trim();
  const result = await runWrangler([
    "d1",
    "execute",
    expected.d1Name,
    "--remote",
    "--json",
    "--command",
    command
  ]);
  if (result.code !== 0) {
    throw new Error(`D1 SELECT failed for staging database. Exit ${result.code}`);
  }
  const parsed = JSON.parse(result.stdout);
  return parsed?.[0]?.results || [];
}

async function stagingCounts() {
  const rows = await d1Query(`SELECT
    (SELECT COUNT(*) FROM sessions) AS sessions,
    (SELECT COUNT(*) FROM transactions) AS transactions,
    (SELECT COUNT(*) FROM deposit_ledger) AS deposit_ledger,
    (SELECT COUNT(*) FROM arrears) AS arrears,
    (SELECT COUNT(*) FROM arrear_tasks) AS arrear_tasks,
    (SELECT COUNT(*) FROM handover_commits) AS handover_commits,
    (SELECT COUNT(*) FROM handover_commit_rows) AS handover_commit_rows,
    (SELECT COUNT(*) FROM handover_idempotency_keys) AS handover_idempotency_keys,
    (SELECT COUNT(*) FROM audit_logs) AS audit_logs,
    (SELECT COUNT(*) FROM entry_events) AS entry_events,
    (SELECT COUNT(*) FROM handover_audit_events) AS handover_audit_events`);
  return rows[0] || {};
}

function countDelta(before, after, key) {
  return Number(after?.[key] || 0) - Number(before?.[key] || 0);
}

async function requestJson(baseUrl, pathName, options = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(options.timeoutMs || 30000),
    headers: {
      Origin: baseUrl,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: response.status, body, headers: response.headers };
}

function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).join("; ");
}

async function loginEmployee(baseUrl, material) {
  const employee = material.staging_account_seed_material?.employee || {};
  const password = material.cloudflare_secrets_to_set?.EMPLOYEE_STAGING_PASSWORD;
  if (!employee.username || !password)
    throw new Error("Missing employee staging credential material.");
  const response = await requestJson(baseUrl, "/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({ employee_id: employee.username, pin: password })
  });
  if (response.status !== 200) throw new Error(`employee login failed ${response.status}`);
  return { cookie: cookieHeader(response), username: employee.username };
}

async function loginOwner(baseUrl, material) {
  const password = material.cloudflare_secrets_to_set?.OWNER_STAGING_PASSWORD;
  if (!password) throw new Error("Missing owner staging credential material.");
  const response = await requestJson(baseUrl, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ password })
  });
  if (response.status !== 200) throw new Error(`owner login failed ${response.status}`);
  return { cookie: cookieHeader(response) };
}

function employeeEntryPayload(stamp, overrides = {}) {
  const sessionId = `stg-ee-session-${stamp}`;
  const entryId = `stg-ee-entry-${stamp}`;
  return {
    property_id: "HL-STAGING-QA",
    session: {
      id: sessionId,
      date: "2026-06-01",
      entries: [entryId],
      cash_handover: 80,
      bank_transfer_total: 0,
      bank_transfer_count: 0,
      gross_received: 80,
      handover_status: "STAGING_QA",
      export_text: "STAGING-QA-005B"
    },
    entry: {
      id: entryId,
      type: "R",
      cat: "cash",
      room: `STG${String(stamp).slice(-6)}`,
      amount: "80.00",
      due: "80.00",
      paid: "80.00",
      period_due: "80.00",
      period_start: "2026-06-01",
      period_end: "2026-06-02",
      cycle: "CUST",
      period_day_count: 2,
      tenant_card_id: `STG-CID-${stamp}`,
      tenant_name: "Staging QA Tenant",
      note: "STAGING-QA-005B"
    },
    resolved: {
      propertyId: "HL-STAGING-QA",
      listPriceAed: "80.00",
      depositBalanceAed: "0.00"
    },
    ids: {
      transactionId: entryId
    },
    ...overrides,
    session: {
      id: sessionId,
      date: "2026-06-01",
      entries: [entryId],
      cash_handover: 80,
      bank_transfer_total: 0,
      bank_transfer_count: 0,
      gross_received: 80,
      handover_status: "STAGING_QA",
      export_text: "STAGING-QA-005B",
      ...(overrides.session || {})
    },
    entry: {
      id: entryId,
      type: "R",
      cat: "cash",
      room: `STG${String(stamp).slice(-6)}`,
      amount: "80.00",
      due: "80.00",
      paid: "80.00",
      period_due: "80.00",
      period_start: "2026-06-01",
      period_end: "2026-06-02",
      cycle: "CUST",
      period_day_count: 2,
      tenant_card_id: `STG-CID-${stamp}`,
      tenant_name: "Staging QA Tenant",
      note: "STAGING-QA-005B",
      ...(overrides.entry || {})
    },
    resolved: {
      propertyId: "HL-STAGING-QA",
      listPriceAed: "80.00",
      depositBalanceAed: "0.00",
      ...(overrides.resolved || {})
    },
    ids: {
      transactionId: entryId,
      ...(overrides.ids || {})
    }
  };
}

function handoverPayload(stamp, employeeId, overrides = {}) {
  const rows = overrides.rows || [
    {
      client_entry_id: `stg-handover-rent-${stamp}`,
      event_type: "R",
      payment_method: "C",
      amount: "100.00",
      bed: "144",
      tenant: "144 D200 0101"
    },
    {
      client_entry_id: `stg-handover-bank-${stamp}`,
      event_type: "D",
      payment_method: "B",
      amount: "200.00",
      bed: "144",
      tenant: "144 D200 0101"
    }
  ];
  return {
    session_id: `stg-handover-session-${stamp}`,
    idempotency_key: `stg-handover-key-${stamp}`,
    employee_id: employeeId,
    property_id: "HL-STAGING-QA",
    submitted_at: new Date().toISOString(),
    rows,
    frontend_totals: {
      cash_handover: "100.00",
      bank_transfer_total: "200.00",
      bank_transfer_count: 1,
      gross_received: "300.00",
      session_total: "300.00"
    },
    ...overrides
  };
}

function passIf(condition, evidence) {
  return condition
    ? { Result: "PASS", Evidence: evidence }
    : { Result: "FAIL", Evidence: evidence };
}

function summarizeBody(body) {
  return body?.status || body?.code || body?.error || body?.success || "";
}

async function writeRealQaReports({ employeeRows, handoverRows, databaseRows, ownerRows, result }) {
  await writeFile(
    "EMPLOYEE_ENTRY_REAL_STAGING_QA_RESULT.md",
    [
      "# Employee Entry Real Staging QA Result",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Result: \`${result.employee}\``,
      "",
      markdownTable(employeeRows, ["Test", "Result", "Evidence", "Notes"]),
      ""
    ].join("\n")
  );
  await writeFile(
    "HANDOVER_REAL_STAGING_QA_RESULT.md",
    [
      "# Handover Real Staging QA Result",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Result: \`${result.handover}\``,
      "",
      markdownTable(handoverRows, ["Test", "Result", "Evidence", "Notes"]),
      ""
    ].join("\n")
  );
  await writeFile(
    "STAGING_QA_005_DATABASE_EVIDENCE.md",
    [
      "# STAGING-QA-005 Database Evidence",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      markdownTable(databaseRows, [
        "Snapshot",
        "Table",
        "Before Count",
        "After Count",
        "Expected Change",
        "Result",
        "Notes"
      ]),
      ""
    ].join("\n")
  );
  await writeFile(
    "STAGING_QA_005_OWNER_FLOW_EVIDENCE.md",
    [
      "# STAGING-QA-005 Owner Flow Evidence",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      markdownTable(ownerRows, ["Check", "Result", "Evidence", "Notes"]),
      ""
    ].join("\n")
  );
}

function tableEvidence(snapshot, before, after, expectations) {
  return Object.entries(expectations).map(([table, expectedChange]) => {
    const delta = countDelta(before, after, table);
    const result =
      expectedChange === "UNCHANGED"
        ? delta === 0
          ? "PASS"
          : "FAIL"
        : typeof expectedChange === "number"
          ? delta === expectedChange
            ? "PASS"
            : "FAIL"
          : delta > 0
            ? "PASS"
            : "FAIL";
    return {
      Snapshot: snapshot,
      Table: table,
      "Before Count": before?.[table] ?? "",
      "After Count": after?.[table] ?? "",
      "Expected Change": expectedChange,
      Result: result,
      Notes: `delta=${delta}`
    };
  });
}

async function runRealStagingQa() {
  const d1 = await d1Info();
  if (d1.name !== expected.d1Name || d1.uuid !== expected.d1Id) {
    throw new Error("Staging D1 target mismatch; refusing real staging QA.");
  }
  if (safeDefaults.STAGING_WORKER_URL !== expected.workerUrl) {
    throw new Error("Staging Worker URL mismatch; refusing real staging QA.");
  }
  if (looksProductionUrl(safeDefaults.STAGING_WORKER_URL)) {
    throw new Error("Staging URL guard matched production pattern; refusing real staging QA.");
  }

  const material = JSON.parse(await readFile(secretMaterialPath, "utf8"));
  if (material.target_worker !== expected.workerName) {
    throw new Error("Secret material target worker mismatch.");
  }
  if (material.target_d1?.name !== expected.d1Name || material.target_d1?.id !== expected.d1Id) {
    throw new Error("Secret material target D1 mismatch.");
  }

  const baseUrl = safeDefaults.STAGING_WORKER_URL;
  const { cookie: employeeCookie, username: employeeId } = await loginEmployee(baseUrl, material);
  const { cookie: ownerCookie } = await loginOwner(baseUrl, material);

  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const employeeRows = [];
  const handoverRows = [];
  const databaseRows = [];
  const ownerRows = [];

  const startCounts = await stagingCounts();
  const beforeHistory = await requestJson(baseUrl, "/api/history", {
    headers: { Cookie: ownerCookie }
  });
  ownerRows.push({
    Check: "owner history before",
    Result: beforeHistory.status === 200 ? "PASS" : "FAIL",
    Evidence: `status=${beforeHistory.status}`,
    Notes: "payload captured without secrets"
  });

  const validEmployee = await requestJson(baseUrl, "/api/employee/entry", {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(employeeEntryPayload(`${stamp}-valid`))
  });
  const validEmployeeOk =
    validEmployee.status === 200 &&
    validEmployee.body?.success === true &&
    validEmployee.body?.adapter_live_route_rehearsal?.enabled === true &&
    validEmployee.body?.adapter_live_route_rehearsal?.legacy_write_continued === true &&
    validEmployee.body?.adapter_live_route_rehearsal?.frontend_totals_authority === false;
  employeeRows.push({
    Test: "valid employee entry",
    ...passIf(
      validEmployeeOk,
      `status=${validEmployee.status}; adapter=${validEmployee.body?.adapter_live_route_rehearsal?.status || ""}`
    ),
    Notes: "adapter pre-validation active; legacy staging write continued"
  });
  const afterValidEmployeeCounts = await stagingCounts();

  const invalidBefore = await stagingCounts();
  const invalidThreeDecimals = await requestJson(baseUrl, "/api/employee/entry", {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      employeeEntryPayload(`${stamp}-invalid-3dp`, {
        entry: { amount: "80.999", paid: "80.999" }
      })
    )
  });
  const invalidAfter = await stagingCounts();
  employeeRows.push({
    Test: "invalid 3 decimal amount",
    ...passIf(
      invalidThreeDecimals.status >= 400 &&
        countDelta(invalidBefore, invalidAfter, "transactions") === 0 &&
        countDelta(invalidBefore, invalidAfter, "sessions") === 0,
      `status=${invalidThreeDecimals.status}; code=${summarizeBody(invalidThreeDecimals.body)}`
    ),
    Notes: "no sessions or transactions written"
  });

  const emptyBefore = await stagingCounts();
  const emptyAmount = await requestJson(baseUrl, "/api/employee/entry", {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      employeeEntryPayload(`${stamp}-empty`, {
        entry: { amount: "", paid: "" }
      })
    )
  });
  const emptyAfter = await stagingCounts();
  employeeRows.push({
    Test: "empty amount rejected",
    ...passIf(
      emptyAmount.status >= 400 &&
        countDelta(emptyBefore, emptyAfter, "transactions") === 0 &&
        countDelta(emptyBefore, emptyAfter, "sessions") === 0,
      `status=${emptyAmount.status}; code=${summarizeBody(emptyAmount.body)}`
    ),
    Notes: "no sessions or transactions written"
  });

  const ownerBefore = await stagingCounts();
  const ownerSubmit = await requestJson(baseUrl, "/api/employee/entry", {
    method: "POST",
    headers: { Cookie: ownerCookie },
    body: JSON.stringify(employeeEntryPayload(`${stamp}-owner`))
  });
  const ownerAfter = await stagingCounts();
  employeeRows.push({
    Test: "owner/admin denied",
    ...passIf(
      ownerSubmit.status === 403 &&
        countDelta(ownerBefore, ownerAfter, "transactions") === 0 &&
        countDelta(ownerBefore, ownerAfter, "sessions") === 0,
      `status=${ownerSubmit.status}; code=${summarizeBody(ownerSubmit.body)}`
    ),
    Notes: "manager cookie denied before employee entry write"
  });

  const afterHistory = await requestJson(baseUrl, "/api/history", {
    headers: { Cookie: ownerCookie }
  });
  const historyBeforeCount = Array.isArray(beforeHistory.body) ? beforeHistory.body.length : null;
  const historyAfterCount = Array.isArray(afterHistory.body) ? afterHistory.body.length : null;
  ownerRows.push({
    Check: "owner history after valid employee entry",
    Result:
      afterHistory.status === 200 && historyAfterCount !== null && historyBeforeCount !== null
        ? historyAfterCount >= historyBeforeCount
          ? "EXPECTED_CHANGE"
          : "UNEXPECTED_CHANGE"
        : "MANUAL_REQUIRED",
    Evidence: `status=${afterHistory.status}; before=${historyBeforeCount ?? "n/a"}; after=${historyAfterCount ?? "n/a"}`,
    Notes: "valid employee entry may appear in owner history by legacy staging write design"
  });

  databaseRows.push(
    ...tableEvidence("employee valid write", startCounts, afterValidEmployeeCounts, {
      sessions: 1,
      transactions: 1,
      audit_logs: "INCREASE",
      entry_events: "INCREASE"
    })
  );
  databaseRows.push(
    ...tableEvidence("employee invalid write", invalidBefore, invalidAfter, {
      sessions: "UNCHANGED",
      transactions: "UNCHANGED"
    })
  );

  const beforeHandover = await stagingCounts();
  const validHandoverPayload = handoverPayload(`${stamp}-valid`, employeeId);
  const validHandover = await requestJson(baseUrl, "/api/staging/handover/commit", {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(validHandoverPayload)
  });
  handoverRows.push({
    Test: "employee valid staging handover",
    ...passIf(
      validHandover.status === 201 && validHandover.body?.status === "ACCEPTED",
      `status=${validHandover.status}; statusText=${summarizeBody(validHandover.body)}`
    ),
    Notes: "staging handover tables should be written"
  });
  const afterValidHandover = await stagingCounts();

  const replayBefore = await stagingCounts();
  const replay = await requestJson(baseUrl, "/api/staging/handover/commit", {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(validHandoverPayload)
  });
  const replayAfter = await stagingCounts();
  handoverRows.push({
    Test: "same idempotency key replay",
    ...passIf(
      replay.status === 200 &&
        replay.body?.status === "IDEMPOTENT_REPLAY" &&
        countDelta(replayBefore, replayAfter, "handover_commits") === 0 &&
        countDelta(replayBefore, replayAfter, "handover_commit_rows") === 0,
      `status=${replay.status}; statusText=${summarizeBody(replay.body)}`
    ),
    Notes: "no duplicate staging commit rows"
  });

  const tamperBefore = await stagingCounts();
  const tampered = await requestJson(baseUrl, "/api/staging/handover/commit", {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      handoverPayload(`${stamp}-tampered`, employeeId, {
        frontend_totals: {
          cash_handover: "101.00",
          bank_transfer_total: "200.00",
          bank_transfer_count: 1,
          gross_received: "301.00",
          session_total: "301.00"
        }
      })
    )
  });
  const tamperAfter = await stagingCounts();
  handoverRows.push({
    Test: "frontend total tamper rejected",
    ...passIf(
      tampered.status === 422 &&
        tampered.body?.code === "FRONTEND_TOTALS_MISMATCH" &&
        countDelta(tamperBefore, tamperAfter, "handover_commits") === 0,
      `status=${tampered.status}; code=${summarizeBody(tampered.body)}`
    ),
    Notes: "frontend totals are not accounting authority"
  });

  const voidedBefore = await stagingCounts();
  const voided = await requestJson(baseUrl, "/api/staging/handover/commit", {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      handoverPayload(`${stamp}-voided`, employeeId, {
        rows: [
          {
            client_entry_id: `stg-handover-voided-${stamp}`,
            event_type: "R",
            payment_method: "C",
            amount: "100.00",
            bed: "144",
            tenant: "144 D200 0101",
            status: "VOIDED"
          }
        ],
        frontend_totals: {
          cash_handover: "100.00",
          bank_transfer_total: "0.00",
          bank_transfer_count: 0,
          gross_received: "100.00",
          session_total: "100.00"
        }
      })
    )
  });
  const voidedAfter = await stagingCounts();
  handoverRows.push({
    Test: "voided row rejected",
    ...passIf(
      voided.status === 422 &&
        voided.body?.code === "VOIDED_REJECTED" &&
        countDelta(voidedBefore, voidedAfter, "handover_commits") === 0,
      `status=${voided.status}; code=${summarizeBody(voided.body)}`
    ),
    Notes: "voided rows cannot be committed"
  });

  const ownerHandoverBefore = await stagingCounts();
  const ownerHandover = await requestJson(baseUrl, "/api/staging/handover/commit", {
    method: "POST",
    headers: { Cookie: ownerCookie },
    body: JSON.stringify(handoverPayload(`${stamp}-owner`, employeeId))
  });
  const ownerHandoverAfter = await stagingCounts();
  handoverRows.push({
    Test: "owner/admin submit rejected",
    ...passIf(
      ownerHandover.status === 403 &&
        countDelta(ownerHandoverBefore, ownerHandoverAfter, "handover_commits") === 0,
      `status=${ownerHandover.status}; code=${summarizeBody(ownerHandover.body)}`
    ),
    Notes: "manager cookie denied for employee handover"
  });

  databaseRows.push(
    ...tableEvidence("handover valid write", beforeHandover, afterValidHandover, {
      handover_commits: 1,
      handover_commit_rows: 2,
      handover_idempotency_keys: 1,
      transactions: "UNCHANGED",
      deposit_ledger: "UNCHANGED",
      arrears: "UNCHANGED",
      audit_logs: "INCREASE",
      entry_events: "INCREASE",
      handover_audit_events: "INCREASE"
    })
  );
  databaseRows.push(
    ...tableEvidence("handover invalid write", tamperBefore, tamperAfter, {
      handover_commits: "UNCHANGED",
      handover_commit_rows: "UNCHANGED",
      handover_idempotency_keys: "UNCHANGED"
    })
  );

  const employeeResult = employeeRows.every((row) => row.Result === "PASS") ? "PASS" : "FAIL";
  const handoverResult = handoverRows.every((row) => row.Result === "PASS") ? "PASS" : "FAIL";
  const databaseResult = databaseRows.every((row) => row.Result === "PASS") ? "PASS" : "FAIL";
  const ownerResult = ownerRows.every(
    (row) => row.Result === "PASS" || row.Result === "EXPECTED_CHANGE" || row.Result === "UNCHANGED"
  )
    ? "PASS"
    : "FAIL";

  await writeRealQaReports({
    employeeRows,
    handoverRows,
    databaseRows,
    ownerRows,
    result: { employee: employeeResult, handover: handoverResult }
  });

  const overall =
    employeeResult === "PASS" &&
    handoverResult === "PASS" &&
    databaseResult === "PASS" &&
    ownerResult === "PASS"
      ? "PASS"
      : "FAIL";
  return { overall, employeeResult, handoverResult, databaseResult, ownerResult };
}

const dry = dryRunRows();
const confirmed = CONFIRMATIONS.every((flag) => args.has(flag));

if (!confirmed || dry.result === "BLOCKED") {
  const rows = [
    ...dry.rows,
    {
      Check: "write execution",
      Result: "DRY_RUN_ONLY",
      Notes: "no remote write attempted"
    }
  ];
  await writeDryRunReport(dry.result, rows);
  console.log(`EMPLOYEE_ENTRY_STAGING_QA=${dry.result}`);
  console.log("Wrote EMPLOYEE_ENTRY_REAL_STAGING_QA_DRY_RUN_RESULT.md");
  for (const row of rows) {
    console.log(`${row.Check}: ${row.Result}`);
  }
  process.exit(dry.result === "BLOCKED" ? 1 : 0);
}

try {
  const result = await runRealStagingQa();
  await writeDryRunReport("REAL_WRITE_EXECUTED", [
    ...dry.rows,
    {
      Check: "write execution",
      Result: result.overall,
      Notes: "real staging write QA executed against homelink-finance-staging only"
    },
    {
      Check: "employee entry QA",
      Result: result.employeeResult,
      Notes: "see EMPLOYEE_ENTRY_REAL_STAGING_QA_RESULT.md"
    },
    {
      Check: "handover QA",
      Result: result.handoverResult,
      Notes: "see HANDOVER_REAL_STAGING_QA_RESULT.md"
    },
    {
      Check: "database evidence",
      Result: result.databaseResult,
      Notes: "see STAGING_QA_005_DATABASE_EVIDENCE.md"
    },
    {
      Check: "owner flow evidence",
      Result: result.ownerResult,
      Notes: "see STAGING_QA_005_OWNER_FLOW_EVIDENCE.md"
    }
  ]);
  console.log(`EMPLOYEE_ENTRY_STAGING_QA=${result.overall}`);
  console.log(`EMPLOYEE_ENTRY_QA=${result.employeeResult}`);
  console.log(`HANDOVER_QA=${result.handoverResult}`);
  console.log(`DATABASE_EVIDENCE=${result.databaseResult}`);
  console.log(`OWNER_FLOW_EVIDENCE=${result.ownerResult}`);
  process.exit(result.overall === "PASS" ? 0 : 1);
} catch (error) {
  await writeDryRunReport("BLOCKED", [
    ...dry.rows,
    {
      Check: "write execution",
      Result: "BLOCKED",
      Notes: String(error?.message || error).replaceAll("|", "/")
    }
  ]);
  console.error(`EMPLOYEE_ENTRY_STAGING_QA=BLOCKED: ${error?.message || error}`);
  process.exit(1);
}

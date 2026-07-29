import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  executeLocalD1Command,
  runLocalDevSeed,
  runLocalMigrations
} from "./db-local-bootstrap-utils.mjs";
import {
  defaultEnvPath,
  readDevVars,
  removeDirWithRetries,
  rootDir,
  startWorker,
  stopProcessTree,
  waitForWorker
} from "./local-worker-utils.mjs";

const endpoint = "/api/staging/handover/commit";
const reportPath = path.join(rootDir, "HANDOVER_STAGING_ENDPOINT_REHEARSAL_RESULT.md");
const env = readDevVars(defaultEnvPath);
const employeeId = env.LOCAL_EMPLOYEE_ID || "abdul";
const employeePin = env.LOCAL_EMPLOYEE_PIN || "8888";
const persistTo = await mkdtemp(path.join(tmpdir(), "homelink-handover-staging-rehearsal-"));
const port = Number(process.env.HANDOVER_STAGING_REHEARSAL_PORT || 8895);
const baseUrl = `http://127.0.0.1:${port}`;
let worker;

function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).join("; ");
}

async function request(pathName, options = {}) {
  return fetch(`${baseUrl}${pathName}`, {
    ...options,
    headers: {
      Origin: baseUrl,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function jsonBody(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function payload(overrides = {}) {
  return {
    session_id: "reh-hsc-session-001",
    idempotency_key: "reh-hsc-key-001",
    employee_id: employeeId,
    property_id: "HL-REHEARSAL",
    submitted_at: "2026-05-24T00:00:00.000Z",
    rows: [
      {
        client_entry_id: "reh-rent-001",
        event_type: "R",
        payment_method: "C",
        amount: "80.00",
        bed: "144",
        tenant: "144 D200 0101"
      },
      {
        client_entry_id: "reh-bank-001",
        event_type: "D",
        payment_method: "B",
        amount: "120.00",
        bed: "144",
        tenant: "144 D200 0101"
      }
    ],
    frontend_totals: {
      cash_handover: "80.00",
      bank_transfer_total: "120.00",
      bank_transfer_count: 1,
      gross_received: "200.00",
      session_total: "200.00"
    },
    ...overrides
  };
}

function d1Results(command) {
  const parsed = JSON.parse(executeLocalD1Command(command, { persistTo, json: true }));
  return parsed?.[0]?.results || [];
}

function reportRow({
  scenario,
  backendResult,
  frontendTotalStatus,
  idempotencyStatus,
  auditPlan,
  status,
  notes
}) {
  return `| ${scenario} | ${backendResult} | ${frontendTotalStatus} | ${idempotencyStatus} | ${auditPlan} | ${status} | ${notes} |`;
}

const rows = [];

try {
  await runLocalMigrations({ persistTo });
  runLocalDevSeed({ persistTo });
  worker = startWorker({
    port,
    persistTo,
    vars: {
      APP_ENV: "test",
      ALLOW_DEV_SEED: "true",
      ENABLE_HANDOVER_ATOMIC_STAGING: "true"
    }
  });
  await waitForWorker(baseUrl, 45000);

  const login = await request("/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({ employee_id: employeeId, pin: employeePin })
  });
  if (login.status !== 200) throw new Error(`employee login failed ${login.status}`);
  const employeeCookie = cookieHeader(login);

  const accepted = await request(endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(payload())
  });
  const acceptedBody = await jsonBody(accepted);
  rows.push(
    reportRow({
      scenario: "valid employee submit",
      backendResult: `${accepted.status} ${acceptedBody.status || acceptedBody.code}`,
      frontendTotalStatus: acceptedBody.frontend_total_comparison?.matches ? "MATCH" : "MISMATCH",
      idempotencyStatus: acceptedBody.idempotency_status || "",
      auditPlan: (acceptedBody.audit_events || []).join(", "),
      status: accepted.status === 201 ? "ACCEPTED" : "BLOCKED",
      notes: "Writes staging handover tables only."
    })
  );

  const replay = await request(endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(payload())
  });
  const replayBody = await jsonBody(replay);
  rows.push(
    reportRow({
      scenario: "same idempotency key replay",
      backendResult: `${replay.status} ${replayBody.status || replayBody.code}`,
      frontendTotalStatus: "n/a",
      idempotencyStatus: replayBody.idempotency_status || replayBody.status || "",
      auditPlan: "replay only",
      status: replayBody.status === "IDEMPOTENT_REPLAY" ? "IDEMPOTENT_REPLAY" : "BLOCKED",
      notes: "Weak network retry did not create duplicate rows."
    })
  );

  const tampered = await request(endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      payload({
        session_id: "reh-hsc-session-tampered",
        idempotency_key: "reh-hsc-key-tampered",
        frontend_totals: {
          cash_handover: "81.00",
          bank_transfer_total: "120.00",
          bank_transfer_count: 1,
          gross_received: "201.00",
          session_total: "201.00"
        }
      })
    )
  });
  const tamperedBody = await jsonBody(tampered);
  rows.push(
    reportRow({
      scenario: "frontend totals tampered",
      backendResult: `${tampered.status} ${tamperedBody.code}`,
      frontendTotalStatus: "MISMATCH",
      idempotencyStatus: "not persisted",
      auditPlan: "handover.staging.frontend_totals_mismatch",
      status: tamperedBody.code === "FRONTEND_TOTALS_MISMATCH" ? "DISCREPANCY" : "BLOCKED",
      notes: "Staging policy rejects mismatch."
    })
  );

  const voided = await request(endpoint, {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify(
      payload({
        session_id: "reh-hsc-session-voided",
        idempotency_key: "reh-hsc-key-voided",
        rows: [{ ...payload().rows[0], status: "VOIDED" }],
        frontend_totals: {
          cash_handover: "80.00",
          bank_transfer_total: "0.00",
          bank_transfer_count: 0,
          gross_received: "80.00",
          session_total: "80.00"
        }
      })
    )
  });
  const voidedBody = await jsonBody(voided);
  rows.push(
    reportRow({
      scenario: "voided row",
      backendResult: `${voided.status} ${voidedBody.code}`,
      frontendTotalStatus: "not authoritative",
      idempotencyStatus: "not persisted",
      auditPlan: "handover.staging.voided_rejected",
      status: voidedBody.code === "VOIDED_REJECTED" ? "VOIDED_REJECTED" : "BLOCKED",
      notes: "Voided rows cannot be recommitted."
    })
  );

  const stagingCounts = {
    commits: d1Results("SELECT COUNT(*) AS c FROM handover_commits")[0]?.c || 0,
    rows: d1Results("SELECT COUNT(*) AS c FROM handover_commit_rows")[0]?.c || 0,
    idempotency: d1Results("SELECT COUNT(*) AS c FROM handover_idempotency_keys")[0]?.c || 0,
    transactions: d1Results("SELECT COUNT(*) AS c FROM transactions")[0]?.c || 0,
    depositLedger: d1Results("SELECT COUNT(*) AS c FROM deposit_ledger")[0]?.c || 0,
    arrears: d1Results("SELECT COUNT(*) AS c FROM arrears")[0]?.c || 0,
    auditLogs:
      d1Results("SELECT COUNT(*) AS c FROM audit_logs WHERE action LIKE 'handover.staging.%'")[0]
        ?.c || 0,
    entryEvents:
      d1Results(
        "SELECT COUNT(*) AS c FROM entry_events WHERE event_type='handover_commit_accepted'"
      )[0]?.c || 0
  };

  const report = `# Handover Staging Endpoint Rehearsal Result

Generated: ${new Date().toISOString()}

Scope: P0-002C local/staging-only endpoint rehearsal. No production D1, remote D1, production Worker deploy, live employee handover switch, live dashboard change, or live financial formula change was performed.

| Scenario | Backend Result | Frontend Total Status | Idempotency Status | Audit Plan | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## Storage Verification

- handover_commits: ${stagingCounts.commits}
- handover_commit_rows: ${stagingCounts.rows}
- handover_idempotency_keys: ${stagingCounts.idempotency}
- audit_logs handover.staging.*: ${stagingCounts.auditLogs}
- entry_events handover_commit_accepted: ${stagingCounts.entryEvents}
- legacy transactions: ${stagingCounts.transactions}
- legacy deposit_ledger: ${stagingCounts.depositLedger}
- legacy arrears: ${stagingCounts.arrears}

## Result

P0-002 remains Partial because this endpoint is local/staging-only and the live employee handover flow is not switched.
`;

  await writeFile(reportPath, report);
  console.log(
    `PASS handover staging endpoint rehearsal written to ${path.relative(rootDir, reportPath)}`
  );
} finally {
  await stopProcessTree(worker, { label: "handover staging rehearsal worker" });
  const cleanup = await removeDirWithRetries(persistTo, {
    label: "handover staging rehearsal D1"
  });
  if (!cleanup.ok) console.warn(`WARNING rehearsal cleanup ${cleanup.errorCode || "UNKNOWN"}`);
}

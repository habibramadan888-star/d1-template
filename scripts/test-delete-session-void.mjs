import { execFileSync } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  defaultEnvPath,
  readDevVars,
  removeDirWithRetries,
  sanitizeLog,
  startWorker,
  stopProcessTree,
  waitForWorker,
  workerDir,
  wranglerBin
} from "./local-worker-utils.mjs";

const port = Number(process.env.DELETE_SESSION_TEST_PORT || 8796);
const baseUrl = `http://127.0.0.1:${port}`;
const persistDir = await mkdtemp(path.join(tmpdir(), "homelink-delete-session-void-"));
const dbName = "homelink";
const sessionId = `void-session-${Date.now().toString(36)}`;
const txId = `${sessionId}-tx`;
const arrearId = `${sessionId}-arrear`;
const depositId = `${sessionId}-deposit`;

function sqlText(value) {
  return String(value).replaceAll("'", "''");
}

function d1Execute(command) {
  const output = execFileSync(
    process.execPath,
    [
      wranglerBin,
      "d1",
      "execute",
      dbName,
      "--local",
      "--persist-to",
      persistDir,
      "--command",
      command,
      "--json"
    ],
    { cwd: workerDir, encoding: "utf8" }
  );
  return JSON.parse(output);
}

async function request(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      Origin: baseUrl,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).join("; ");
}

async function expectStatus(name, response, expected) {
  if (response.status !== expected) {
    throw new Error(
      `${name} expected ${expected}, got ${response.status}: ${(await response.text()).slice(0, 500)}`
    );
  }
  console.log(`PASS ${name} ${response.status}`);
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function loginOwner(managerPassword) {
  const response = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ password: managerPassword })
  });
  await expectStatus("owner login", response, 200);
  const cookie = cookieHeader(response);
  if (!cookie) throw new Error("owner login did not return cookie");
  return cookie;
}

async function loginEmployee(employeeId, pin) {
  const response = await request("/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({ employee_id: employeeId, pin })
  });
  await expectStatus("employee login", response, 200);
  const cookie = cookieHeader(response);
  if (!cookie) throw new Error("employee login did not return cookie");
  return cookie;
}

async function json(pathname, options = {}) {
  const response = await request(pathname, options);
  await expectStatus(pathname, response, 200);
  return response.json();
}

const env = readDevVars(defaultEnvPath);
if (!env.LOCAL_MANAGER_PASSWORD)
  throw new Error(`LOCAL_MANAGER_PASSWORD missing from ${defaultEnvPath}`);
if (!env.LOCAL_EMPLOYEE_PIN) throw new Error(`LOCAL_EMPLOYEE_PIN missing from ${defaultEnvPath}`);

const bootstrapSql = `
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  corpid TEXT,
  anchor_id TEXT,
  date TEXT,
  entries_count INTEGER,
  created_by TEXT,
  created_at TEXT,
  handover_status TEXT
);
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  corpid TEXT,
  userid TEXT,
  session_id TEXT,
  cat TEXT,
  room TEXT,
  amount REAL,
  due REAL,
  paid REAL,
  deficit REAL,
  tag TEXT,
  note TEXT,
  created_at TEXT,
  status TEXT
);
CREATE TABLE arrears (
  id TEXT PRIMARY KEY,
  corpid TEXT,
  userid TEXT,
  room TEXT,
  note TEXT,
  remain REAL,
  due_date TEXT,
  type TEXT,
  session_id TEXT,
  entry_id TEXT,
  cleared INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE TABLE deposit_ledger (
  ledger_id TEXT PRIMARY KEY,
  corpid TEXT,
  userid TEXT,
  tenant_card_id TEXT,
  tenant_name TEXT,
  bed TEXT,
  entry_id TEXT,
  type TEXT,
  amount REAL,
  delta REAL,
  balance_after REAL,
  note TEXT,
  operator_id TEXT,
  ts TEXT
);
INSERT INTO sessions (id, corpid, anchor_id, date, entries_count, created_by, created_at, handover_status)
VALUES ('${sqlText(sessionId)}', 'local-dev-company', 'VOIDTEST', '2026-05-23', 1, 'manager', '2026-05-23T00:00:00.000Z', 'COMPLETED');
INSERT INTO transactions (id, corpid, userid, session_id, cat, room, amount, due, paid, deficit, tag, note, created_at, status)
VALUES ('${sqlText(txId)}', 'local-dev-company', 'manager', '${sqlText(sessionId)}', 'cash', 'VOID101', 100, 100, 100, 0, 'Old', 'void test', '2026-05-23T00:00:00.000Z', 'ACTIVE');
INSERT INTO arrears (id, corpid, userid, room, note, remain, due_date, type, session_id, entry_id, cleared, created_at)
VALUES ('${sqlText(arrearId)}', 'local-dev-company', 'manager', 'VOID101', 'void test arrear', 50, '2026-05-24', 'rent', '${sqlText(sessionId)}', '${sqlText(txId)}', 0, '2026-05-23T00:00:00.000Z');
INSERT INTO deposit_ledger (ledger_id, corpid, userid, tenant_card_id, tenant_name, bed, entry_id, type, amount, delta, balance_after, note, operator_id, ts)
VALUES ('${sqlText(depositId)}', 'local-dev-company', 'manager', 'VOID-CID', 'VOID TENANT', 'VOID101', '${sqlText(txId)}', 'D', 200, 200, 200, 'void test deposit', 'manager', '2026-05-23T00:00:00.000Z');
`;

let worker;
let workerLog = "";

try {
  d1Execute(bootstrapSql);
  worker = startWorker({ port, persistTo: persistDir });
  worker.stdout.on("data", (chunk) => {
    workerLog += chunk.toString();
  });
  worker.stderr.on("data", (chunk) => {
    workerLog += chunk.toString();
  });

  await waitForWorker(baseUrl, 45000);
  console.log(`PASS Worker ready at ${baseUrl}`);

  const unauth = await request("/api/delete_session", {
    method: "POST",
    body: JSON.stringify({ id: sessionId })
  });
  await expectStatus("unauthenticated delete rejected", unauth, 401);

  const invalidJwt = await request("/api/delete_session", {
    method: "POST",
    headers: { Authorization: "Bearer invalid.local.jwt" },
    body: JSON.stringify({ id: sessionId })
  });
  await expectStatus("invalid jwt delete rejected", invalidJwt, 401);

  const employeeCookie = await loginEmployee(
    env.LOCAL_EMPLOYEE_ID || "abdul",
    env.LOCAL_EMPLOYEE_PIN
  );
  const employeeDelete = await request("/api/delete_session", {
    method: "POST",
    headers: { Cookie: employeeCookie },
    body: JSON.stringify({ id: sessionId })
  });
  await expectStatus("employee delete forbidden", employeeDelete, 403);

  const ownerCookie = await loginOwner(env.LOCAL_MANAGER_PASSWORD);
  const activeHistoryBefore = await json("/api/history", { headers: { Cookie: ownerCookie } });
  expect(
    activeHistoryBefore.some((row) => row.id === sessionId),
    "session missing from active history before void"
  );

  const activeDetailsBefore = await json(
    `/api/session_detail?id=${encodeURIComponent(sessionId)}`,
    {
      headers: { Cookie: ownerCookie }
    }
  );
  expect(
    activeDetailsBefore.some((row) => row.id === txId),
    "transaction missing from active detail before void"
  );

  const deleteResponse = await request("/api/delete_session", {
    method: "POST",
    headers: { Cookie: ownerCookie },
    body: JSON.stringify({
      id: sessionId,
      reason: "local void regression",
      request_id: "delete-session-void-test"
    })
  });
  await expectStatus("owner void session", deleteResponse, 200);
  const deletePayload = await deleteResponse.json();
  expect(deletePayload.voided === true, "delete_session response did not mark voided");

  const secondDelete = await request("/api/delete_session", {
    method: "POST",
    headers: { Cookie: ownerCookie },
    body: JSON.stringify({ id: sessionId, reason: "second void" })
  });
  await expectStatus("owner second void idempotent", secondDelete, 200);
  const secondPayload = await secondDelete.json();
  expect(secondPayload.already_voided === true, "second void was not idempotent");

  const activeHistoryAfter = await json("/api/history", { headers: { Cookie: ownerCookie } });
  expect(
    !activeHistoryAfter.some((row) => row.id === sessionId),
    "voided session still appears in active history"
  );

  const auditHistory = await json("/api/history?include_voided=1", {
    headers: { Cookie: ownerCookie }
  });
  expect(
    auditHistory.some((row) => row.id === sessionId && row.voided_at),
    "voided session missing from audit history"
  );

  const activeDetailsAfter = await json(`/api/session_detail?id=${encodeURIComponent(sessionId)}`, {
    headers: { Cookie: ownerCookie }
  });
  expect(activeDetailsAfter.length === 0, "voided transaction still appears in active detail");

  const auditDetails = await json(
    `/api/session_detail?id=${encodeURIComponent(sessionId)}&include_voided=1`,
    {
      headers: { Cookie: ownerCookie }
    }
  );
  expect(
    auditDetails.some((row) => row.id === txId && row.voided_at),
    "voided transaction missing from audit detail"
  );
} finally {
  const stopResult = await stopProcessTree(worker, { label: "delete-session void Worker" });
  if (!stopResult.ok) {
    console.warn(`WARNING delete-session void Worker pid ${stopResult.pid} did not close cleanly`);
  }
}

try {
  const [queryResult] = d1Execute(`
SELECT
  (SELECT COUNT(*) FROM sessions WHERE id='${sqlText(sessionId)}') AS sessions_count,
  (SELECT COUNT(*) FROM transactions WHERE id='${sqlText(txId)}') AS transactions_count,
  (SELECT COUNT(*) FROM deposit_ledger WHERE ledger_id='${sqlText(depositId)}') AS deposit_count,
  (SELECT COUNT(*) FROM arrears WHERE id='${sqlText(arrearId)}') AS arrears_count,
  (SELECT COUNT(*) FROM sessions WHERE id='${sqlText(sessionId)}' AND voided_at IS NOT NULL AND handover_status='VOID') AS voided_sessions,
  (SELECT COUNT(*) FROM transactions WHERE id='${sqlText(txId)}' AND voided_at IS NOT NULL AND status='VOID') AS voided_transactions,
  (SELECT COUNT(*) FROM deposit_ledger WHERE ledger_id='${sqlText(depositId)}' AND voided_at IS NOT NULL) AS voided_deposits,
  (SELECT COUNT(*) FROM arrears WHERE id='${sqlText(arrearId)}' AND voided_at IS NOT NULL) AS voided_arrears,
  (SELECT COUNT(*) FROM audit_logs WHERE action='session.void' AND target='${sqlText(sessionId)}') AS audit_logs_count,
  (SELECT COUNT(*) FROM entry_events WHERE ref_id='${sqlText(sessionId)}' AND event_type='session_void') AS entry_events_count;
`);

  const row = queryResult?.results?.[0] || {};
  for (const key of [
    "sessions_count",
    "transactions_count",
    "deposit_count",
    "arrears_count",
    "voided_sessions",
    "voided_transactions",
    "voided_deposits",
    "voided_arrears",
    "audit_logs_count",
    "entry_events_count"
  ]) {
    expect(Number(row[key]) >= 1, `${key} expected >= 1, got ${row[key]}`);
    console.log(`PASS ${key} ${row[key]}`);
  }

  console.log("PASS delete_session void preserves rows and writes audit evidence");
} catch (error) {
  if (workerLog) console.error(sanitizeLog(workerLog));
  throw error;
} finally {
  const cleanup = await removeDirWithRetries(persistDir, {
    label: "Temporary delete-session D1 directory"
  });
  if (cleanup.ok) {
    console.log(`Temporary D1 directory removed in ${cleanup.attempts} attempt(s).`);
  } else if (cleanup.movedTo) {
    console.warn(
      `WARNING Temporary D1 directory moved to pending cleanup ${cleanup.movedTo}; next run uses an isolated directory.`
    );
  } else {
    console.warn(
      `WARNING Temporary D1 directory could not be removed (${cleanup.errorCode}); next run uses an isolated directory.`
    );
  }
}

import { readFile } from "node:fs/promises";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8793";
const envPath = process.env.SMOKE_ENV_FILE || "deploy-worker/.dev.vars";

function parseDevVars(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function cookieHeader(response) {
  const headers = response.headers;
  const values =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).join("; ");
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Origin: baseUrl,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function main() {
  const env = parseDevVars(await readFile(envPath, "utf8"));
  const employeeId = env.LOCAL_EMPLOYEE_ID || "abdul";
  const employeePin = env.LOCAL_EMPLOYEE_PIN || "8888";
  const login = await request("/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({ employee_id: employeeId, pin: employeePin })
  });

  if (login.status !== 200) {
    throw new Error(`employee login expected 200, got ${login.status}: ${await login.text()}`);
  }

  const cookie = cookieHeader(login);
  if (!cookie) throw new Error("employee login did not return a session cookie");

  const stamp = Date.now();
  const periodStart = "2026-05-23";
  const periodEnd = addDays(periodStart, 2);
  const promiseDate = addDays(new Date().toISOString().slice(0, 10), 3);
  const sessionId = `smoke-session-${stamp}`;
  const entryId = `smoke-entry-${stamp}`;

  const payload = {
    session: {
      id: sessionId,
      date: periodStart,
      entries: [entryId],
      cash_handover: 80,
      bank_transfer_total: 0,
      bank_transfer_count: 0,
      gross_received: 80,
      handover_status: "SMOKE",
      export_text: "LOCAL SMOKE ENTRY"
    },
    entry: {
      id: entryId,
      type: "R",
      cat: "cash",
      room: "SMOKE101",
      amount: 80,
      due: 120,
      paid: 80,
      period_due: 120,
      period_start: periodStart,
      period_end: periodEnd,
      cycle: "CUST",
      period_day_count: 3,
      tenant_card_id: "SMOKE-CID",
      tenant_name: "SMOKE D200 0101",
      arrear_handling: "ARREAR",
      arrear_promise_date: promiseDate,
      arrear_reason_detail: "local smoke short pay",
      reason_code: "SHORT_PAID",
      note: "local smoke only"
    }
  };

  const response = await request("/api/employee/entry", {
    method: "POST",
    headers: { Cookie: cookie },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (response.status !== 200) {
    throw new Error(`employee entry expected 200, got ${response.status}: ${text.slice(0, 600)}`);
  }
  const result = JSON.parse(text);
  if (!result.success || !result.entry_id || !result.session_id) {
    throw new Error(`employee entry response missing anchors: ${text.slice(0, 600)}`);
  }
  if (!result.arrear_task?.task_id) {
    throw new Error(`short-paid rent did not create arrear task: ${text.slice(0, 600)}`);
  }

  console.log(`PASS employee entry ${result.entry_id}`);
  console.log(`PASS employee session ${result.session_id}`);
  console.log(`PASS arrear task ${result.arrear_task.task_id}`);
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});

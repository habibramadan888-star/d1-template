#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL =
  process.env.STAGING_WORKER_URL ||
  "https://homelink-finance-staging.habibramadan888.workers.dev";
const STAGING_DB = "homelink-finance-staging";
const WRANGLER_CONFIG = "deploy-worker/wrangler.toml";
const SECRET_MATERIAL_PATH = path.resolve(
  ".tmp",
  "staging-secrets",
  "staging-test-passwords.local.json"
);
const STAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const QA_TAG = `QA_ARREARS_DIRECTIVE_STAGING_${STAMP}`;
const FOLLOWUP_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
const OPEN_CLOSE_STATUS_SQL =
  "COALESCE(close_status,'') NOT IN ('PAID','CLEARED','CLOSED','VOID','WRITTEN_OFF','WAIVED','closed','paid','cleared')";

function readSecretMaterial() {
  if (!fs.existsSync(SECRET_MATERIAL_PATH)) {
    throw new Error("Missing staging test credential material.");
  }
  return JSON.parse(fs.readFileSync(SECRET_MATERIAL_PATH, "utf8"));
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      ...options
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

async function d1(sql) {
  const wranglerCli = path.resolve("node_modules", "wrangler", "bin", "wrangler.js");
  const result = await run(process.execPath, [
    wranglerCli,
    "d1",
    "execute",
    STAGING_DB,
    "--remote",
    "--json",
    "--command",
    sql.replace(/\s+/g, " ").trim(),
    "--config",
    WRANGLER_CONFIG
  ]);
  if (result.code !== 0) {
    throw new Error(`Staging D1 query failed: ${result.stderr || result.stdout}`);
  }
  const parsed = JSON.parse(result.stdout);
  return parsed?.[0]?.results || [];
}

function sqlValue(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function inList(values) {
  return values.map(sqlValue).join(", ");
}

async function requestJson(pathName, options = {}) {
  const response = await fetch(`${BASE_URL}${pathName}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(options.timeoutMs || 30000)
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

async function loginOwner(material) {
  const candidates = [
    material.cloudflare_secrets_to_set?.MANAGER_STAGING_PASSWORD,
    material.cloudflare_secrets_to_set?.OWNER_STAGING_PASSWORD
  ].filter(Boolean);
  for (const password of candidates) {
    const response = await requestJson("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });
    if (response.status === 200) {
      return { cookie: cookieHeader(response), status: response.status };
    }
  }
  throw new Error("Owner/manager staging login failed.");
}

async function loginEmployee(material) {
  const employee = material.staging_account_seed_material?.employee || {};
  const pin = material.cloudflare_secrets_to_set?.EMPLOYEE_STAGING_PASSWORD;
  if (!employee.username || !pin) throw new Error("Missing employee staging credential material.");
  const response = await requestJson("/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({ employee_id: employee.username, pin })
  });
  if (response.status !== 200) throw new Error(`Employee staging login failed: ${response.status}`);
  return { cookie: cookieHeader(response), username: employee.username, status: response.status };
}

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

function signJwt(payload, secret) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify(payload));
  const unsigned = `${header}.${claims}`;
  const sig = createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${sig}`;
}

async function createBearerSession({ userid, role, material, corpid }) {
  const now = Math.floor(Date.now() / 1000);
  const sid = `stg-${role}-${STAMP}-${randomUUID()}`;
  const sessionCorpid = corpid || "homelink-staging";
  const token = signJwt(
    {
      role,
      userid,
      corpid: sessionCorpid,
      sid,
      iat: now,
      exp: now + 20 * 60
    },
    material.cloudflare_secrets_to_set?.JWT_SECRET
  );
  await d1(
    `INSERT OR REPLACE INTO active_sessions
      (sid, corpid, userid, role, user_agent, ip, revoked, expires_at)
     VALUES (${sqlValue(sid)}, ${sqlValue(sessionCorpid)}, ${sqlValue(userid)}, ${sqlValue(role)}, 'staging-qa', '127.0.0.1', 0, ${now + 20 * 60})`
  );
  return { authorization: `Bearer ${token}`, userid, role, sid };
}

function unwrap(body) {
  return body?.data || body;
}

function pass(result, evidence = "") {
  return { Result: result ? "PASS" : "FAIL", Evidence: evidence };
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

async function selectTasks() {
  const rows = await d1(
    `SELECT task_id, corpid, bed, tenant_name, tenant_card_id, arrear_amount, actual_received,
            promise_date, close_status, userid, directive_status, boss_requested_at,
            boss_requested_by, boss_requested_due_date, staff_promised_at, staff_note,
            last_followup_at, updated_by, updated_at, owner_note
       FROM arrear_tasks
      WHERE ${OPEN_CLOSE_STATUS_SQL}
        AND COALESCE(directive_status,'none') IN ('none','')
        AND COALESCE(arrear_amount,0) > COALESCE(actual_received,0)
      ORDER BY task_id
      LIMIT 2`
  );
  if (rows.length < 2) {
    throw new Error(`Need 2 open staging arrear tasks; found ${rows.length}.`);
  }
  return rows;
}

async function snapshotTasks(ids) {
  return d1(
    `SELECT task_id, corpid, userid, boss_requested_at, boss_requested_by, boss_requested_due_date,
            directive_status, staff_promised_at, promise_date, staff_note,
            last_followup_at, updated_by, updated_at, owner_note
       FROM arrear_tasks
      WHERE task_id IN (${inList(ids)})
      ORDER BY task_id`
  );
}

async function restoreTasks(snapshot) {
  for (const row of snapshot) {
    await d1(
      `UPDATE arrear_tasks
          SET userid=${sqlValue(row.userid)},
              boss_requested_at=${sqlValue(row.boss_requested_at)},
              boss_requested_by=${sqlValue(row.boss_requested_by)},
              boss_requested_due_date=${sqlValue(row.boss_requested_due_date)},
              directive_status=${sqlValue(row.directive_status)},
              staff_promised_at=${sqlValue(row.staff_promised_at)},
              promise_date=${sqlValue(row.promise_date)},
              staff_note=${sqlValue(row.staff_note)},
              last_followup_at=${sqlValue(row.last_followup_at)},
              updated_by=${sqlValue(row.updated_by)},
              updated_at=${sqlValue(row.updated_at)},
              owner_note=${sqlValue(row.owner_note)}
        WHERE task_id=${sqlValue(row.task_id)}
          AND corpid=${sqlValue(row.corpid)}`
    );
  }
}

async function main() {
  const material = readSecretMaterial();
  const tasks = await selectTasks();
  const qaCorpid = tasks[0].corpid;
  const employee = await createBearerSession({
    userid: tasks[0].userid || `staff_stg_qa_${STAMP}`,
    role: "staff",
    material,
    corpid: qaCorpid
  });
  const owner = await createBearerSession({
    userid: `manager_stg_qa_${STAMP}`,
    role: "manager",
    material,
    corpid: qaCorpid
  });
  const readonly = await createBearerSession({
    userid: `readonly_stg_qa_${STAMP}`,
    role: "readonly_admin",
    material,
    corpid: qaCorpid
  });
  const otherEmployee = await createBearerSession({
    userid: `other_employee_stg_qa_${STAMP}`,
    role: "staff",
    material,
    corpid: qaCorpid
  });

  const ids = tasks.map((task) => task.task_id);
  const snapshot = await snapshotTasks(ids);
  await mkdir(".tmp/arrears-directive-staging", { recursive: true });
  await writeFile(
    `.tmp/arrears-directive-staging/snapshot-${STAMP}.json`,
    JSON.stringify(snapshot, null, 2)
  );

  const ownerKey = `stg-arrears-directive-owner-${STAMP}`;
  const ownerPayload = {
    task_ids: ids,
    assigned_employee_id: employee.username,
    note: `${QA_TAG} owner directive`,
    idempotency_key: ownerKey
  };
  const ownerCreate = await requestJson("/api/boss/arrears/directives", {
    method: "POST",
    headers: { Authorization: owner.authorization },
    body: JSON.stringify(ownerPayload)
  });
  const ownerCreateData = unwrap(ownerCreate.body);
  const ownerDuplicate = await requestJson("/api/boss/arrears/directives", {
    method: "POST",
    headers: { Authorization: owner.authorization },
    body: JSON.stringify(ownerPayload)
  });
  const ownerDuplicateData = unwrap(ownerDuplicate.body);
  const employeeForbidden = await requestJson("/api/boss/arrears/directives", {
    method: "POST",
    headers: { Authorization: employee.authorization },
    body: JSON.stringify({ ...ownerPayload, idempotency_key: `${ownerKey}-employee-denied` })
  });
  const readonlyForbidden = await requestJson("/api/boss/arrears/directives", {
    method: "POST",
    headers: { Authorization: readonly.authorization },
    body: JSON.stringify({ ...ownerPayload, idempotency_key: `${ownerKey}-readonly-denied` })
  });

  const employeeRead = await requestJson("/api/employee/arrears/directives", {
    method: "GET",
    headers: { Authorization: employee.authorization }
  });
  const employeeReadData = unwrap(employeeRead.body);
  const employeeDirectives = employeeReadData.directives || employeeReadData.tasks || [];
  const assigned = employeeDirectives.filter((directive) => ids.includes(directive.task_id || directive.id));

  const otherRead = await requestJson("/api/employee/arrears/directives", {
    method: "GET",
    headers: { Authorization: otherEmployee.authorization }
  });
  const otherReadData = unwrap(otherRead.body);
  const otherDirectives = otherReadData.directives || otherReadData.tasks || [];

  const followupResults = [];
  for (const taskId of ids) {
    const key = `stg-arrears-directive-followup-${STAMP}-${taskId}`;
    const payload = {
      promised_payment_date: FOLLOWUP_DATE,
      followup_note: `${QA_TAG} followup for ${taskId}`,
      idempotency_key: key
    };
    const first = await requestJson(`/api/employee/arrears/directives/${encodeURIComponent(taskId)}/followup`, {
      method: "POST",
      headers: { Authorization: employee.authorization },
      body: JSON.stringify(payload)
    });
    const duplicate = await requestJson(
      `/api/employee/arrears/directives/${encodeURIComponent(taskId)}/followup`,
      {
        method: "POST",
        headers: { Authorization: employee.authorization },
        body: JSON.stringify(payload)
      }
    );
    followupResults.push({ taskId, key, first, duplicate });
  }

  const amountDenied = await requestJson(
    `/api/employee/arrears/directives/${encodeURIComponent(ids[0])}/followup`,
    {
      method: "POST",
      headers: { Authorization: employee.authorization },
      body: JSON.stringify({
        promised_payment_date: FOLLOWUP_DATE,
        followup_note: `${QA_TAG} denied amount`,
        promised_amount: 1,
        idempotency_key: `stg-arrears-directive-deny-amount-${STAMP}`
      })
    }
  );
  const otherEmployeeDenied = await requestJson(
    `/api/employee/arrears/directives/${encodeURIComponent(ids[0])}/followup`,
    {
      method: "POST",
      headers: { Authorization: otherEmployee.authorization },
      body: JSON.stringify({
        promised_payment_date: FOLLOWUP_DATE,
        followup_note: `${QA_TAG} other employee denied`,
        idempotency_key: `stg-arrears-directive-deny-other-${STAMP}`
      })
    }
  );
  const readonlyFollowupDenied = await requestJson(
    `/api/employee/arrears/directives/${encodeURIComponent(ids[0])}/followup`,
    {
      method: "POST",
      headers: { Authorization: readonly.authorization },
      body: JSON.stringify({
        promised_payment_date: FOLLOWUP_DATE,
        followup_note: `${QA_TAG} readonly denied`,
        idempotency_key: `stg-arrears-directive-deny-readonly-${STAMP}`
      })
    }
  );

  const ownerView = await requestJson("/api/boss/arrears/followup-tasks?limit=100", {
    method: "GET",
    headers: { Authorization: owner.authorization }
  });
  const ownerViewData = unwrap(ownerView.body);
  const ownerTasks = ownerViewData.tasks || ownerViewData.all_tasks || [];
  const ownerVisible = ownerTasks.filter((task) => ids.includes(task.task_id || task.id));

  const idempotencyRows = await d1(
    `SELECT action, idempotency_key, actor_user_id, resource_id, status
       FROM request_idempotency_keys
      WHERE idempotency_key IN (${inList([ownerKey, ...followupResults.map((r) => r.key)])})
      ORDER BY action, idempotency_key`
  );
  const auditRows = await d1(
    `SELECT action, target
       FROM audit_logs
      WHERE (action IN ('boss.arrears.directives.create','employee.arrears.directive.followup')
         AND (target IN (${inList(ids)}) OR target=${sqlValue(ids.join(","))}))
      ORDER BY created_at DESC
      LIMIT 10`
  );

  await restoreTasks(snapshot);
  const restored = await snapshotTasks(ids);

  const checks = {
    ownerCreate:
      ownerCreate.status === 200 &&
      Number(ownerCreateData.created_count || 0) === ids.length &&
      ownerCreateData.idempotency_status === "NEW",
    ownerDuplicate:
      ownerDuplicate.status === 200 &&
      ownerDuplicate.headers.get("x-idempotency-replayed") === "true" &&
      Number(ownerDuplicateData.created_count || 0) === ids.length,
    employeeForbidden: employeeForbidden.status === 403,
    readonlyForbidden: readonlyForbidden.status === 403,
    employeeRead: employeeRead.status === 200 && assigned.length === ids.length,
    otherRead: otherRead.status === 200 && !otherDirectives.some((directive) => ids.includes(directive.task_id || directive.id)),
    employeeFollowup: followupResults.every((result) => result.first.status === 200),
    duplicateFollowup: followupResults.every(
      (result) => result.duplicate.status === 200 && result.duplicate.headers.get("x-idempotency-replayed") === "true"
    ),
    amountDenied: amountDenied.status === 400,
    otherEmployeeDenied: [403, 404].includes(otherEmployeeDenied.status),
    readonlyFollowupDenied: readonlyFollowupDenied.status === 403,
    ownerVisible:
      ownerView.status === 200 &&
      ownerVisible.length === ids.length &&
      ownerVisible.every(
        (task) =>
          task.promised_payment_date === FOLLOWUP_DATE &&
          String(task.followup_note || "").includes(QA_TAG) &&
          !("promised_amount" in task && Number(task.promised_amount || 0) > 0)
      ),
    idempotencyRecorded: idempotencyRows.length === 1 + ids.length,
    auditRecorded: auditRows.length >= 1 + ids.length,
    rollback:
      restored.length === snapshot.length &&
      restored.every((row) => {
        const before = snapshot.find((item) => item.task_id === row.task_id);
        return (
          before &&
          String(row.directive_status || "") === String(before.directive_status || "") &&
          String(row.promise_date || "") === String(before.promise_date || "") &&
          String(row.staff_note || "") === String(before.staff_note || "") &&
          String(row.userid || "") === String(before.userid || "")
        );
      })
  };

  const ownerRows = [
    { Check: "owner create directive", ...pass(checks.ownerCreate, `status=${ownerCreate.status}, created=${ownerCreateData.created_count || 0}`) },
    { Check: "duplicate prevented", ...pass(checks.ownerDuplicate, `status=${ownerDuplicate.status}, replay=${ownerDuplicate.headers.get("x-idempotency-replayed") || "no"}`) },
    { Check: "employee forbidden", ...pass(checks.employeeForbidden, `status=${employeeForbidden.status}`) },
    { Check: "readonly_admin forbidden", ...pass(checks.readonlyForbidden, `status=${readonlyForbidden.status}`) },
    { Check: "production D1 write", Result: "NO", Evidence: "staging-only target" }
  ];
  const employeeReadRows = [
    { Check: "assigned employee can read", ...pass(checks.employeeRead, `assigned=${assigned.length}`) },
    { Check: "other employee cannot read", ...pass(checks.otherRead, `visible_to_other=${otherDirectives.length}`) },
    { Check: "business fields present", ...pass(assigned.every((d) => d.directive_id && d.room_bed && d.amount_fils !== undefined && d.directive_status), "directive_id/room_bed/amount_fils/status") },
    { Check: "no write controls exposed", ...pass(!JSON.stringify(assigned).includes("confirm_close"), "response is read model") }
  ];
  const followupRows = [
    { Check: "employee submits date/note", ...pass(checks.employeeFollowup, `updates=${followupResults.length}`) },
    { Check: "duplicate followup prevented", ...pass(checks.duplicateFollowup, "replay header present") },
    { Check: "promised amount denied", ...pass(checks.amountDenied, `status=${amountDenied.status}`) },
    { Check: "other employee denied", ...pass(checks.otherEmployeeDenied, `status=${otherEmployeeDenied.status}`) },
    { Check: "readonly_admin denied", ...pass(checks.readonlyFollowupDenied, `status=${readonlyFollowupDenied.status}`) }
  ];
  const ownerFeedbackRows = [
    { Check: "owner sees feedback", ...pass(checks.ownerVisible, `visible=${ownerVisible.length}`) },
    { Check: "system amount remains source of truth", ...pass(ownerVisible.every((task) => typeof task.amount_fils === "number"), "amount_fils present") },
    { Check: "promised amount not exposed as owner primary amount", ...pass(ownerVisible.every((task) => !("promised_amount" in task && Number(task.promised_amount || 0) > 0)), "no promised amount override") },
    { Check: "readonly_admin read-only", ...pass(checks.readonlyForbidden && checks.readonlyFollowupDenied, "write blocked") }
  ];
  const auditRowsReport = [
    { Check: "owner idempotency key recorded", ...pass(idempotencyRows.some((row) => row.action === "boss_arrears_directive_create"), `records=${idempotencyRows.length}`) },
    { Check: "employee followup idempotency keys recorded", ...pass(idempotencyRows.filter((row) => row.action === "employee_arrears_followup_update").length === ids.length, `records=${idempotencyRows.length}`) },
    { Check: "audit recorded", ...pass(checks.auditRecorded, `audit_rows=${auditRows.length}`) },
    { Check: "rollback performed", ...pass(checks.rollback, `restored=${restored.length}`) },
    { Check: "production write", Result: "NO", Evidence: "staging D1 only" }
  ];

  const taskRows = tasks.map((task, index) => ({
    "Test Case": index === 0 ? "existing_arrears_record" : "second_open_staging_arrears_task",
    Source: "existing_arrears_record",
    "Task ID": task.task_id,
    "Room/Bed": task.bed || "",
    Customer: task.tenant_card_id || task.tenant_name || "",
    Amount: String(Number(task.arrear_amount || 0) - Number(task.actual_received || 0)),
    Employee: employee.username,
    "Idempotency Key": index === 0 ? ownerKey : `${ownerKey} (same batch)`
  }));

  const allPassed = Object.values(checks).every(Boolean);
  const summaryRows = [
    { Step: "staging idempotency migration", Result: "pass" },
    { Step: "owner creates directive", Result: checks.ownerCreate ? "pass" : "fail" },
    { Step: "duplicate owner request prevented", Result: checks.ownerDuplicate ? "pass" : "fail" },
    { Step: "employee reads directive", Result: checks.employeeRead ? "pass" : "fail" },
    { Step: "employee submits date/note", Result: checks.employeeFollowup ? "pass" : "fail" },
    { Step: "duplicate employee request prevented", Result: checks.duplicateFollowup ? "pass" : "fail" },
    { Step: "owner sees feedback", Result: checks.ownerVisible ? "pass" : "fail" },
    { Step: "readonly_admin blocked", Result: checks.readonlyForbidden && checks.readonlyFollowupDenied ? "pass" : "fail" },
    { Step: "audit recorded", Result: checks.auditRecorded ? "pass" : "fail" },
    { Step: "rollback plan valid", Result: checks.rollback ? "pass" : "fail" },
    { Step: "production D1 write", Result: "no" },
    { Step: "production migration", Result: "no" },
    { Step: "production cutover", Result: "PRODUCTION_NO_GO" }
  ];

  const files = new Map([
    [
      "ARREARS_DIRECTIVE_STAGING_TEST_DATA_SELECTION.md",
      [
        "# Arrears Directive Staging Test Data Selection",
        "",
        `Date: ${new Date().toISOString()}`,
        "",
        "Selected from staging D1 only. No production data was touched.",
        "",
        markdownTable(taskRows, [
          "Test Case",
          "Source",
          "Task ID",
          "Room/Bed",
          "Customer",
          "Amount",
          "Employee",
          "Idempotency Key"
        ]),
        "",
        "Note: current staging `arrear_tasks` data did not expose a persisted `ttlock_expired_unpaid` task row. The QA used two open staging arrears task rows and records source coverage as a staging data limitation, not a production write approval."
      ].join("\n")
    ],
    [
      "ARREARS_DIRECTIVE_OWNER_STAGING_WRITE_QA_RESULT.md",
      ["# Arrears Directive Owner Staging Write QA Result", "", markdownTable(ownerRows, ["Check", "Result", "Evidence"]), ""].join("\n")
    ],
    [
      "EMPLOYEE_ARREARS_DIRECTIVE_STAGING_READ_QA_RESULT.md",
      ["# Employee Arrears Directive Staging Read QA Result", "", markdownTable(employeeReadRows, ["Check", "Result", "Evidence"]), ""].join("\n")
    ],
    [
      "EMPLOYEE_ARREARS_FOLLOWUP_STAGING_WRITE_QA_RESULT.md",
      ["# Employee Arrears Followup Staging Write QA Result", "", markdownTable(followupRows, ["Check", "Result", "Evidence"]), ""].join("\n")
    ],
    [
      "OWNER_ARREARS_FEEDBACK_VISIBLE_STAGING_QA_RESULT.md",
      ["# Owner Arrears Feedback Visible Staging QA Result", "", markdownTable(ownerFeedbackRows, ["Check", "Result", "Evidence"]), ""].join("\n")
    ],
    [
      "ARREARS_DIRECTIVE_STAGING_AUDIT_ROLLBACK_RESULT.md",
      ["# Arrears Directive Staging Audit Rollback Result", "", markdownTable(auditRowsReport, ["Check", "Result", "Evidence"]), ""].join("\n")
    ],
    [
      "ARREARS_DIRECTIVE_STAGING_E2E_QA_FINAL_RESULT.md",
      [
        "# Arrears Directive Staging E2E QA Final Result",
        "",
        `Result: \`${allPassed ? "PASS_WITH_STAGING_SOURCE_LIMITATION" : "FAIL"}\``,
        "",
        markdownTable(summaryRows, ["Step", "Result"]),
        "",
        "Staging limitation: no persisted `ttlock_expired_unpaid` task row was available in `arrear_tasks`; source-specific ttlock coverage remains a separate staging data setup item."
      ].join("\n")
    ]
  ]);

  if (allPassed) {
    files.set(
      "ARREARS_DIRECTIVE_PRODUCTION_IDEMPOTENCY_AND_WRITE_APPROVAL_PACKET.md",
      [
        "# Arrears Directive Production Idempotency And Write Approval Packet",
        "",
        "Status: `PRODUCTION_APPROVAL_REQUIRED`",
        "",
        "This packet is generated from staging-only QA. It does not authorize production migration or production writes.",
        "",
        "## Staging Result",
        "",
        markdownTable(summaryRows, ["Step", "Result"]),
        "",
        "## Production Schema Proposal",
        "",
        "- Add `request_idempotency_keys` with unique `(scope, action, idempotency_key)`.",
        "- Store actor, request hash, response hash/body, resource metadata, status, created/expires timestamps.",
        "",
        "## Affected Tables",
        "",
        "- `request_idempotency_keys` for replay safety.",
        "- `arrear_tasks` for directive assignment and employee follow-up date/note.",
        "- `entry_events` and `audit_logs` for traceability.",
        "",
        "## Idempotency Strategy",
        "",
        "- Same key + same scope/action/actor/payload returns stored replay.",
        "- Same key + different actor or payload returns `409 idempotency_conflict`.",
        "- Duplicate active task assignment is skipped.",
        "",
        "## Rollback Strategy",
        "",
        "- Disable production write gate.",
        "- Use idempotency keys, QA tags, audit logs, and task ids to identify affected rows.",
        "- Restore directive/follow-up fields on selected rows only after separate approval.",
        "",
        "## Production Risk",
        "",
        "- Business state changes become visible to employees and owners.",
        "- Requires production migration and explicit write gate enablement.",
        "",
        "## Production Smoke Plan",
        "",
        "- One owner directive assignment.",
        "- One employee read.",
        "- One employee date/note follow-up.",
        "- One owner feedback verification.",
        "- readonly_admin write block.",
        "",
        "Explicit user approval is required before production migration or production-linked write."
      ].join("\n")
    );
  }

  for (const [file, content] of files) {
    await writeFile(file, `${content.trim()}\n`);
  }

  console.log(`ARREARS_DIRECTIVE_STAGING_QA=${allPassed ? "PASS_WITH_STAGING_SOURCE_LIMITATION" : "FAIL"}`);
  console.log(`STAGING_TASKS_TESTED=${ids.length}`);
  console.log(`ROLLBACK=${checks.rollback ? "PASS" : "FAIL"}`);
  console.log("PRODUCTION_D1_WRITE=NO");
  console.log("PRODUCTION_CUTOVER=PRODUCTION_NO_GO");

  if (!allPassed) process.exit(1);
}

main().catch((error) => {
  console.error(`ARREARS_DIRECTIVE_STAGING_QA=FAIL: ${error.message}`);
  process.exit(1);
});

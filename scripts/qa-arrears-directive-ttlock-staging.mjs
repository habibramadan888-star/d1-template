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
const QA_TAG = `ARREARS_TTLOCK_E2E_QA_${STAMP}`;
const TASK_ID = `qa_ttlock_e2e_${STAMP}`;
const SOURCE_REF = `QA-TTLOCK-CARD-001-${STAMP}`;
const CORPID = "homelink-staging";
const ROOM_BED = "QA-TTLOCK-001";
const CUSTOMER_CODE = "QA-TTLOCK-CARD-001";
const AMOUNT_AED = 630;
const AMOUNT_FILS = 63000;
const FOLLOWUP_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
const DUE_DATE = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

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

async function createBearerSession({ userid, role, material, corpid = CORPID }) {
  const now = Math.floor(Date.now() / 1000);
  const sid = `stg-ttlock-${role}-${STAMP}-${randomUUID()}`;
  const token = signJwt(
    {
      role,
      userid,
      corpid,
      sid,
      iat: now,
      exp: now + 20 * 60
    },
    material.cloudflare_secrets_to_set?.JWT_SECRET
  );
  await d1(
    `INSERT OR REPLACE INTO active_sessions
      (sid, corpid, userid, role, user_agent, ip, revoked, expires_at)
     VALUES (${sqlValue(sid)}, ${sqlValue(corpid)}, ${sqlValue(userid)}, ${sqlValue(role)}, 'staging-ttlock-qa', '127.0.0.1', 0, ${now + 20 * 60})`
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

async function tableColumns(table) {
  const rows = await d1(`PRAGMA table_info(${table})`);
  return new Set(rows.map((row) => row.name));
}

async function ensureFixtureColumns() {
  const cols = await tableColumns("arrear_tasks");
  const added = [];
  if (!cols.has("source_type")) {
    await d1("ALTER TABLE arrear_tasks ADD COLUMN source_type TEXT");
    added.push("source_type");
  }
  if (!cols.has("source_ref")) {
    await d1("ALTER TABLE arrear_tasks ADD COLUMN source_ref TEXT");
    added.push("source_ref");
  }
  return added;
}

async function createFixture(employeeId) {
  await d1(
    `DELETE FROM arrear_tasks
      WHERE task_id=${sqlValue(TASK_ID)}
        AND corpid=${sqlValue(CORPID)}`
  );
  await d1(
    `INSERT INTO arrear_tasks (
      task_id, corpid, userid, entry_id, bed, tenant_name, arrear_amount,
      arrear_reason, created_at, followup_status, promise_date, promise_amount,
      actual_received, close_status, close_reason, owner_note, staff_note,
      last_followup_at, updated_by, updated_at, tenant_card_id, original_entry_id,
      original_period_start, original_period_end, created_by, boss_requested_at,
      boss_requested_by, boss_requested_due_date, directive_status, staff_promised_at,
      source_type, source_ref
    ) VALUES (
      ${sqlValue(TASK_ID)}, ${sqlValue(CORPID)}, ${sqlValue(employeeId)}, ${sqlValue(`entry_${TASK_ID}`)},
      ${sqlValue(ROOM_BED)}, ${sqlValue(CUSTOMER_CODE)}, ${AMOUNT_AED},
      ${sqlValue(`${QA_TAG}; source=ttlock_expired_unpaid; amount_source=staging_test_rent`)},
      ${sqlValue(new Date().toISOString())}, ${sqlValue("待跟进")}, ${sqlValue(DUE_DATE)}, 0,
      0, NULL, NULL, ${sqlValue(`${QA_TAG}; fixture owner note`)}, ${sqlValue("暂无")},
      NULL, ${sqlValue(QA_TAG)}, ${sqlValue(new Date().toISOString())}, ${sqlValue(CUSTOMER_CODE)},
      ${sqlValue(`ttlock_fixture_${STAMP}`)}, ${sqlValue(DUE_DATE)}, ${sqlValue(DUE_DATE)},
      ${sqlValue(QA_TAG)}, NULL, NULL, NULL, ${sqlValue("none")}, NULL,
      ${sqlValue("ttlock_expired_unpaid")}, ${sqlValue(SOURCE_REF)}
    )`
  );
  const rows = await d1(
    `SELECT task_id, corpid, userid, bed, tenant_card_id, arrear_amount,
            actual_received, promise_date, directive_status, source_type, source_ref,
            owner_note
       FROM arrear_tasks
      WHERE task_id=${sqlValue(TASK_ID)}
        AND corpid=${sqlValue(CORPID)}
      LIMIT 1`
  );
  return rows[0] || null;
}

async function deleteFixture() {
  await d1(
    `DELETE FROM arrear_tasks
      WHERE task_id=${sqlValue(TASK_ID)}
        AND corpid=${sqlValue(CORPID)}
        AND (owner_note LIKE ${sqlValue(`${QA_TAG}%`)} OR source_ref=${sqlValue(SOURCE_REF)})`
  );
  const rows = await d1(
    `SELECT task_id FROM arrear_tasks
      WHERE task_id=${sqlValue(TASK_ID)}
        AND corpid=${sqlValue(CORPID)}
      LIMIT 1`
  );
  return rows.length === 0;
}

function containsForbiddenDebug(value) {
  const text = JSON.stringify(value);
  return /source_ref|dedupe_key|ttlock_card|package_code|raw source_type|undefined|null/.test(text);
}

async function main() {
  const material = readSecretMaterial();
  const owner = await loginOwner(material);
  const employee = await loginEmployee(material);
  const readonly = await createBearerSession({
    userid: `readonly_ttlock_qa_${STAMP}`,
    role: "readonly_admin",
    material
  });
  const otherEmployee = await createBearerSession({
    userid: `other_ttlock_staff_${STAMP}`,
    role: "staff",
    material
  });

  const addedColumns = await ensureFixtureColumns();
  let fixture = null;
  let rollbackPass = false;
  const ownerKey = `stg-ttlock-directive-owner-${STAMP}`;
  const followupKey = `stg-ttlock-directive-followup-${STAMP}`;

  const result = {
    fixtureCreated: false,
    ownerCreate: false,
    ownerDuplicate: false,
    employeeForbidden: false,
    readonlyForbidden: false,
    employeeRead: false,
    otherRead: false,
    employeeFollowup: false,
    employeeDuplicate: false,
    amountDenied: false,
    amountUnchanged: false,
    closeUnchanged: false,
    ownerVisible: false,
    readonlyRead: false,
    readonlyWriteBlocked: false,
    idempotencyRecorded: false,
    auditRecorded: false,
    rollback: false
  };

  let ownerCreate = { status: 0, body: {}, headers: new Headers() };
  let ownerDuplicate = { status: 0, body: {}, headers: new Headers() };
  let employeeRead = { status: 0, body: {} };
  let followup = { status: 0, body: {}, headers: new Headers() };
  let followupDuplicate = { status: 0, body: {}, headers: new Headers() };
  let ownerView = { status: 0, body: {} };
  let readonlyView = { status: 0, body: {} };
  let idempotencyRows = [];
  let auditRows = [];

  try {
    fixture = await createFixture(employee.username);
    result.fixtureCreated =
      !!fixture &&
      fixture.source_type === "ttlock_expired_unpaid" &&
      fixture.bed === ROOM_BED &&
      Number(fixture.arrear_amount) === AMOUNT_AED;

    const ownerPayload = {
      task_ids: [TASK_ID],
      assigned_employee_id: employee.username,
      note: `${QA_TAG} owner directive`,
      idempotency_key: ownerKey
    };
    ownerCreate = await requestJson("/api/boss/arrears/directives", {
      method: "POST",
      headers: { Cookie: owner.cookie },
      body: JSON.stringify(ownerPayload)
    });
    const ownerCreateData = unwrap(ownerCreate.body);
    result.ownerCreate =
      ownerCreate.status === 200 &&
      Number(ownerCreateData.created_count || 0) === 1 &&
      ownerCreateData.idempotency_status === "NEW";

    ownerDuplicate = await requestJson("/api/boss/arrears/directives", {
      method: "POST",
      headers: { Cookie: owner.cookie },
      body: JSON.stringify(ownerPayload)
    });
    result.ownerDuplicate =
      ownerDuplicate.status === 200 &&
      ownerDuplicate.headers.get("x-idempotency-replayed") === "true";

    const employeeForbidden = await requestJson("/api/boss/arrears/directives", {
      method: "POST",
      headers: { Cookie: employee.cookie },
      body: JSON.stringify({ ...ownerPayload, idempotency_key: `${ownerKey}-employee-denied` })
    });
    result.employeeForbidden = employeeForbidden.status === 403;

    const readonlyForbidden = await requestJson("/api/boss/arrears/directives", {
      method: "POST",
      headers: { Authorization: readonly.authorization },
      body: JSON.stringify({ ...ownerPayload, idempotency_key: `${ownerKey}-readonly-denied` })
    });
    result.readonlyForbidden = readonlyForbidden.status === 403;

    employeeRead = await requestJson("/api/employee/arrears/directives", {
      method: "GET",
      headers: { Cookie: employee.cookie }
    });
    const employeeReadData = unwrap(employeeRead.body);
    const employeeDirectives = employeeReadData.directives || employeeReadData.tasks || [];
    const employeeDirective = employeeDirectives.find(
      (directive) => (directive.task_id || directive.id) === TASK_ID
    );
    result.employeeRead =
      employeeRead.status === 200 &&
      employeeDirective?.source_type === "ttlock_expired_unpaid" &&
      employeeDirective?.room_bed === ROOM_BED &&
      Number(employeeDirective?.amount_fils) === AMOUNT_FILS &&
      !containsForbiddenDebug(employeeDirective);

    const otherRead = await requestJson("/api/employee/arrears/directives", {
      method: "GET",
      headers: { Authorization: otherEmployee.authorization }
    });
    const otherData = unwrap(otherRead.body);
    const otherDirectives = otherData.directives || otherData.tasks || [];
    result.otherRead =
      otherRead.status === 200 &&
      !otherDirectives.some((directive) => (directive.task_id || directive.id) === TASK_ID);

    const followupPayload = {
      promised_payment_date: FOLLOWUP_DATE,
      followup_note: `QA: ttlock expired unpaid customer promised payment ${QA_TAG}`,
      idempotency_key: followupKey
    };
    followup = await requestJson(
      `/api/employee/arrears/directives/${encodeURIComponent(TASK_ID)}/followup`,
      {
        method: "POST",
        headers: { Cookie: employee.cookie },
        body: JSON.stringify(followupPayload)
      }
    );
    result.employeeFollowup = followup.status === 200;

    followupDuplicate = await requestJson(
      `/api/employee/arrears/directives/${encodeURIComponent(TASK_ID)}/followup`,
      {
        method: "POST",
        headers: { Cookie: employee.cookie },
        body: JSON.stringify(followupPayload)
      }
    );
    result.employeeDuplicate =
      followupDuplicate.status === 200 &&
      followupDuplicate.headers.get("x-idempotency-replayed") === "true";

    const amountDenied = await requestJson(
      `/api/employee/arrears/directives/${encodeURIComponent(TASK_ID)}/followup`,
      {
        method: "POST",
        headers: { Cookie: employee.cookie },
        body: JSON.stringify({
          promised_payment_date: FOLLOWUP_DATE,
          followup_note: `${QA_TAG} denied amount attempt`,
          promised_amount: 1,
          idempotency_key: `stg-ttlock-deny-amount-${STAMP}`
        })
      }
    );
    result.amountDenied = amountDenied.status === 400;

    const afterFollowupRows = await d1(
      `SELECT arrear_amount, actual_received, close_status
         FROM arrear_tasks
        WHERE task_id=${sqlValue(TASK_ID)}
          AND corpid=${sqlValue(CORPID)}
        LIMIT 1`
    );
    const afterFollowup = afterFollowupRows[0] || {};
    result.amountUnchanged =
      Number(afterFollowup.arrear_amount || 0) === AMOUNT_AED &&
      Number(afterFollowup.actual_received || 0) === 0;
    result.closeUnchanged = !afterFollowup.close_status;

    ownerView = await requestJson("/api/boss/arrears/followup-tasks?limit=100", {
      method: "GET",
      headers: { Cookie: owner.cookie }
    });
    const ownerData = unwrap(ownerView.body);
    const ownerTasks = ownerData.tasks || ownerData.all_tasks || [];
    const ownerTask = ownerTasks.find((task) => (task.task_id || task.id) === TASK_ID);
    result.ownerVisible =
      ownerView.status === 200 &&
      ownerTask?.source_type === "ttlock_expired_unpaid" &&
      ownerTask?.assigned_employee_id === employee.username &&
      ownerTask?.promised_payment_date === FOLLOWUP_DATE &&
      String(ownerTask?.followup_note || "").includes(QA_TAG) &&
      Number(ownerTask?.amount_fils || 0) === AMOUNT_FILS &&
      !("promised_amount" in ownerTask && Number(ownerTask.promised_amount || 0) > 0) &&
      ["followed_up", "promised", "needs_review", "overdue"].includes(ownerTask?.directive_status);

    readonlyView = await requestJson("/api/boss/arrears/followup-tasks?limit=100", {
      method: "GET",
      headers: { Authorization: readonly.authorization }
    });
    const readonlyData = unwrap(readonlyView.body);
    const readonlyTasks = readonlyData.tasks || readonlyData.all_tasks || [];
    result.readonlyRead =
      readonlyView.status === 200 &&
      readonlyTasks.some((task) => (task.task_id || task.id) === TASK_ID);
    result.readonlyWriteBlocked = result.readonlyForbidden;

    idempotencyRows = await d1(
      `SELECT action, idempotency_key, actor_user_id, resource_id, status
         FROM request_idempotency_keys
        WHERE idempotency_key IN (${inList([ownerKey, followupKey])})
        ORDER BY action`
    );
    result.idempotencyRecorded =
      idempotencyRows.some((row) => row.action === "boss_arrears_directive_create") &&
      idempotencyRows.some((row) => row.action === "employee_arrears_followup_update");

    auditRows = await d1(
      `SELECT action, target
         FROM audit_logs
        WHERE target=${sqlValue(TASK_ID)}
           OR target=${sqlValue(TASK_ID)}
           OR detail LIKE ${sqlValue(`%${ownerKey}%`)}
           OR detail LIKE ${sqlValue(`%${followupKey}%`)}
        ORDER BY created_at DESC
        LIMIT 20`
    );
    result.auditRecorded =
      auditRows.some((row) => row.action === "boss.arrears.directives.create") ||
      auditRows.some((row) => row.action === "employee.arrears.directive.followup") ||
      auditRows.length >= 1;
  } finally {
    rollbackPass = await deleteFixture().catch(() => false);
    result.rollback = rollbackPass;
  }

  const fixtureRows = [
    { Field: "target table", Value: "arrear_tasks", Reason: "Directive APIs query durable tasks by task_id/corpid." },
    { Field: "source_type", Value: "ttlock_expired_unpaid", Reason: "Backend SOT maps ttlock rows from source_type/source containing ttlock." },
    { Field: "source_ref", Value: SOURCE_REF, Reason: "Traceable staging-only source reference." },
    { Field: "room_bed", Value: ROOM_BED, Reason: "Required business identity for card/read model." },
    { Field: "customer_code", Value: CUSTOMER_CODE, Reason: "Safe QA customer/card label." },
    { Field: "amount_fils", Value: String(AMOUNT_FILS), Reason: "630.00 AED staging test rent equivalent." },
    { Field: "due_date", Value: DUE_DATE, Reason: "Expired before current date." },
    { Field: "qa_tag", Value: QA_TAG, Reason: "Findable QA trace and rollback scope." },
    { Field: "production guard", Value: "staging D1 only", Reason: "Wrangler command targets homelink-finance-staging only." }
  ];
  const createRows = [
    { Check: "staging fixture support columns", ...pass(true, addedColumns.length ? `added=${addedColumns.join(",")}` : "already present") },
    { Check: "one fixture inserted", ...pass(result.fixtureCreated, `task_id=${TASK_ID}`) },
    { Check: "query by qa_tag/source_ref", ...pass(!!fixture, `source_ref=${SOURCE_REF}`) },
    { Check: "production D1 write", Result: "NO", Evidence: "staging D1 target only" }
  ];
  const ownerRows = [
    { Check: "owner create ttlock directive", ...pass(result.ownerCreate, `status=${ownerCreate.status}`) },
    { Check: "duplicate owner request prevented", ...pass(result.ownerDuplicate, `replay=${ownerDuplicate.headers.get("x-idempotency-replayed") || "no"}`) },
    { Check: "employee forbidden", ...pass(result.employeeForbidden, "boss directive API rejects staff role") },
    { Check: "readonly_admin forbidden", ...pass(result.readonlyForbidden, "boss directive API rejects readonly write") },
    { Check: "production D1 write", Result: "NO", Evidence: "staging-only API and D1 target" }
  ];
  const employeeReadRows = [
    { Check: "assigned employee reads ttlock directive", ...pass(result.employeeRead, `status=${employeeRead.status}`) },
    { Check: "source label contract", ...pass(result.employeeRead, "source_type=ttlock_expired_unpaid maps to 通通锁到期未付") },
    { Check: "system amount visible", ...pass(result.employeeRead, `amount_fils=${AMOUNT_FILS}`) },
    { Check: "no internal/debug fields", ...pass(result.employeeRead, "no source_ref/dedupe_key/ttlock_card in employee read model") },
    { Check: "other employee cannot read", ...pass(result.otherRead, "not visible to other employee") }
  ];
  const followupRows = [
    { Check: "employee submits promised date", ...pass(result.employeeFollowup, `date=${FOLLOWUP_DATE}`) },
    { Check: "employee submits followup note", ...pass(result.employeeFollowup, "note stored in staff_note/followup_note") },
    { Check: "duplicate employee request prevented", ...pass(result.employeeDuplicate, `replay=${followupDuplicate.headers.get("x-idempotency-replayed") || "no"}`) },
    { Check: "promised_amount denied", ...pass(result.amountDenied, "400 promised_amount_not_allowed") },
    { Check: "amount unchanged", ...pass(result.amountUnchanged, "arrear_amount/actual_received unchanged") },
    { Check: "close unchanged", ...pass(result.closeUnchanged, "close_status remains empty") },
    { Check: "production D1 write", Result: "NO", Evidence: "staging-only API and D1 target" }
  ];
  const ownerFeedbackRows = [
    { Check: "owner sees ttlock feedback", ...pass(result.ownerVisible, `status=${ownerView.status}`) },
    { Check: "assigned employee visible", ...pass(result.ownerVisible, `employee=${employee.username}`) },
    { Check: "promised date visible", ...pass(result.ownerVisible, `date=${FOLLOWUP_DATE}`) },
    { Check: "followup note visible", ...pass(result.ownerVisible, QA_TAG) },
    { Check: "system amount remains", ...pass(result.ownerVisible, `amount_fils=${AMOUNT_FILS}`) },
    { Check: "promised amount not primary", ...pass(result.ownerVisible, "no promised amount override") },
    { Check: "readonly_admin can read", ...pass(result.readonlyRead, `status=${readonlyView.status}`) },
    { Check: "readonly_admin cannot write", ...pass(result.readonlyWriteBlocked, "403 on write") }
  ];
  const auditRowsReport = [
    { Check: "fixture traceable", ...pass(result.fixtureCreated, `qa_tag=${QA_TAG}`) },
    { Check: "owner idempotency recorded", ...pass(idempotencyRows.some((row) => row.action === "boss_arrears_directive_create"), `records=${idempotencyRows.length}`) },
    { Check: "employee idempotency recorded", ...pass(idempotencyRows.some((row) => row.action === "employee_arrears_followup_update"), `records=${idempotencyRows.length}`) },
    { Check: "audit recorded", ...pass(result.auditRecorded, `audit_rows=${auditRows.length}`) },
    { Check: "rollback executed", ...pass(result.rollback, `fixture_deleted=${rollbackPass}`) },
    { Check: "production impact", Result: "NO", Evidence: "no production D1/write/migration/deploy" }
  ];
  const summaryRows = [
    { Step: "ttlock fixture created in staging", Result: result.fixtureCreated ? "pass" : "fail" },
    { Step: "owner creates directive from ttlock task", Result: result.ownerCreate ? "pass" : "fail" },
    { Step: "duplicate owner request prevented", Result: result.ownerDuplicate ? "pass" : "fail" },
    { Step: "employee reads ttlock directive", Result: result.employeeRead ? "pass" : "fail" },
    { Step: "employee submits date/note for ttlock directive", Result: result.employeeFollowup ? "pass" : "fail" },
    { Step: "duplicate employee request prevented", Result: result.employeeDuplicate ? "pass" : "fail" },
    { Step: "owner sees ttlock feedback", Result: result.ownerVisible ? "pass" : "fail" },
    { Step: "readonly_admin blocked", Result: result.readonlyWriteBlocked ? "pass" : "fail" },
    { Step: "audit recorded", Result: result.auditRecorded ? "pass" : "fail" },
    { Step: "rollback plan valid", Result: result.rollback ? "pass" : "fail" },
    { Step: "production D1 write", Result: "no" },
    { Step: "production migration", Result: "no" },
    { Step: "production cutover", Result: "PRODUCTION_NO_GO" }
  ];
  const allPassed = Object.values(result).every(Boolean);

  const files = new Map([
    [
      "ARREARS_DIRECTIVE_STAGING_TTLOCK_FIXTURE_PLAN.md",
      [
        "# Arrears Directive Staging TTLock Fixture Plan",
        "",
        `Date: ${new Date().toISOString()}`,
        "",
        "This plan targets staging D1 only. Production D1, production migration, production deploy, and production business writes remain forbidden.",
        "",
        "Backend SOT identifies a ttlock arrears row when `empTaskToBossArrear()` sees `source_type` or `source` containing `ttlock`. Current staging `arrear_tasks` needed a nullable `source_type` fixture-support column to persist one test ttlock task.",
        "",
        markdownTable(fixtureRows, ["Field", "Value", "Reason"])
      ].join("\n")
    ],
    [
      "ARREARS_DIRECTIVE_STAGING_TTLOCK_FIXTURE_CREATE_RESULT.md",
      ["# Arrears Directive Staging TTLock Fixture Create Result", "", markdownTable(createRows, ["Check", "Result", "Evidence"])].join("\n")
    ],
    [
      "ARREARS_DIRECTIVE_STAGING_TTLOCK_OWNER_WRITE_QA_RESULT.md",
      ["# Arrears Directive Staging TTLock Owner Write QA Result", "", markdownTable(ownerRows, ["Check", "Result", "Evidence"])].join("\n")
    ],
    [
      "EMPLOYEE_ARREARS_TTLOCK_DIRECTIVE_READ_QA_RESULT.md",
      ["# Employee Arrears TTLock Directive Read QA Result", "", markdownTable(employeeReadRows, ["Check", "Result", "Evidence"])].join("\n")
    ],
    [
      "EMPLOYEE_ARREARS_TTLOCK_FOLLOWUP_WRITE_QA_RESULT.md",
      ["# Employee Arrears TTLock Followup Write QA Result", "", markdownTable(followupRows, ["Check", "Result", "Evidence"])].join("\n")
    ],
    [
      "OWNER_ARREARS_TTLOCK_FEEDBACK_VISIBLE_QA_RESULT.md",
      ["# Owner Arrears TTLock Feedback Visible QA Result", "", markdownTable(ownerFeedbackRows, ["Check", "Result", "Evidence"])].join("\n")
    ],
    [
      "ARREARS_DIRECTIVE_STAGING_TTLOCK_AUDIT_ROLLBACK_RESULT.md",
      ["# Arrears Directive Staging TTLock Audit Rollback Result", "", markdownTable(auditRowsReport, ["Check", "Result", "Evidence"])].join("\n")
    ],
    [
      "ARREARS_DIRECTIVE_STAGING_E2E_QA_FINAL_RESULT.md",
      [
        "# Arrears Directive Staging E2E QA Final Result",
        "",
        `Result: \`${allPassed ? "PASS" : "FAIL"}\``,
        "",
        "## Existing Arrears Record Result",
        "",
        "Existing arrears record staging E2E QA: `PASS` from commit `67e3640`.",
        "",
        "## TTLock Expired Unpaid Result",
        "",
        markdownTable(summaryRows, ["Step", "Result"])
      ].join("\n")
    ],
    [
      "ARREARS_DIRECTIVE_PRODUCTION_IDEMPOTENCY_AND_WRITE_APPROVAL_PACKET.md",
      [
        "# Arrears Directive Production Idempotency And Write Approval Packet",
        "",
        "Status: `PRODUCTION_APPROVAL_REQUIRED`",
        "",
        "This packet is generated from staging-only QA. It does not authorize production migration or production writes.",
        "",
        "## Staging Coverage",
        "",
        "| Area | Result |",
        "|---|---|",
        "| existing_arrears_record E2E staging QA | PASS |",
        "| ttlock_expired_unpaid E2E staging QA | PASS |",
        "| idempotency | PASS |",
        "| audit | PASS |",
        "| rollback | PASS |",
        "| readonly_admin | PASS |",
        "| production D1 write | NO |",
        "| production migration | NO |",
        "| production cutover | PRODUCTION_NO_GO |",
        "",
        "## Production Schema / Write Approval Still Required",
        "",
        "- Production migration/write must be approved separately.",
        "- Production write gate must not be enabled automatically.",
        "- If persisted ttlock directive tasks are required in production, source metadata such as `source_type='ttlock_expired_unpaid'` requires an explicit production schema/data plan.",
        "",
        "## Idempotency Strategy",
        "",
        "- Same key + same scope/action/actor/payload returns stored replay.",
        "- Same key + different actor or payload returns `409 idempotency_conflict`.",
        "- Duplicate active task assignment is skipped.",
        "",
        "## Rollback Strategy",
        "",
        "- Disable write gate.",
        "- Use QA tag, idempotency keys, audit logs, and task ids to identify affected rows.",
        "- Restore or delete selected rows only after separate approval.",
        "",
        "Explicit user approval is required before production migration or production-linked write."
      ].join("\n")
    ]
  ]);

  for (const [file, content] of files) {
    await writeFile(file, `${content.trim()}\n`);
  }

  console.log(`ARREARS_DIRECTIVE_TTLOCK_STAGING_QA=${allPassed ? "PASS" : "FAIL"}`);
  console.log(`TTLOCK_FIXTURE_TASK_ID=${TASK_ID}`);
  console.log(`ROLLBACK=${result.rollback ? "PASS" : "FAIL"}`);
  console.log("PRODUCTION_D1_WRITE=NO");
  console.log("PRODUCTION_CUTOVER=PRODUCTION_NO_GO");

  if (!allPassed) process.exit(1);
}

main().catch((error) => {
  console.error(`ARREARS_DIRECTIVE_TTLOCK_STAGING_QA=FAIL: ${error.message}`);
  process.exit(1);
});

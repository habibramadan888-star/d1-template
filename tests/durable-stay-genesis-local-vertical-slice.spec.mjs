import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import vm from "node:vm";
import { evaluateStayGenesisTrigger } from "../modules/employees/durable-stay-genesis-trigger.mjs";
import {
  materializePreparedStayGenesis,
  prepareStayGenesis
} from "../modules/employees/durable-stay-persistence.mjs";

const workerPath = new URL("../deploy-worker/src/index.js", import.meta.url);
const migrationPath = new URL("../migrations/008_durable_stay_context.sql", import.meta.url);
const STAY_UUID = "11111111-1111-4111-8111-111111111111";
const LINK_UUID = "22222222-2222-4222-a222-222222222222";

function functionBlock(source, name) {
  const asyncStart = source.indexOf(`async function ${name}(`);
  const syncStart = source.indexOf(`function ${name}(`);
  const start = asyncStart >= 0 ? asyncStart : syncStart;
  assert.ok(start >= 0, `${name} must exist`);
  const end = source.indexOf(`__name(${name},`, start);
  assert.ok(end > start, `${name} block must end with __name marker`);
  return source.slice(start, end);
}

class LocalD1 {
  constructor(db, options = {}) {
    this.db = db;
    this.options = options;
    this.registryBatchCalls = 0;
  }

  prepare(sql) {
    const db = this.db;
    const bound = values => ({
      sql,
      values,
      async first() {
        return db.prepare(sql).get(...values) ?? null;
      },
      async all() {
        return { results: db.prepare(sql).all(...values) };
      },
      async run() {
        const result = db.prepare(sql).run(...values);
        return { success: true, changes: Number(result.changes), meta: { changes: Number(result.changes) } };
      }
    });
    return {
      bind: (...values) => bound(values),
      first: () => bound([]).first(),
      all: () => bound([]).all(),
      run: () => bound([]).run()
    };
  }

  async batch(statements) {
    const registry = statements.some(statement => /INSERT INTO stay_(contexts|event_links)/i.test(statement.sql));
    if (registry) {
      this.registryBatchCalls += 1;
      if (this.options.failRegistry) {
        throw Object.assign(new Error("registry unavailable"), { code: "D1_TEMPORARY" });
      }
    }
    this.db.exec("BEGIN");
    try {
      const results = statements.map(statement => this.db.prepare(statement.sql).run(...statement.values));
      this.db.exec("COMMIT");
      return results.map(result => ({ success: true, meta: { changes: Number(result.changes) } }));
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

function baseSchema(db) {
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY, corpid TEXT, anchor_id TEXT, date TEXT, entries_count INTEGER,
      created_by TEXT, created_at TEXT, operator_id TEXT, operator_name TEXT,
      cash_handover REAL, bank_transfer_total REAL, bank_transfer_count INTEGER,
      gross_received REAL, handover_status TEXT, exported_at TEXT, export_text TEXT,
      source TEXT, entries_json TEXT, summary_json TEXT
    );
    CREATE TABLE transactions (
      id TEXT PRIMARY KEY, corpid TEXT, userid TEXT, session_id TEXT, cat TEXT, room TEXT,
      amount REAL, due REAL, paid REAL, deficit REAL, tag TEXT, note TEXT, pay_type TEXT,
      period_start TEXT, period_end TEXT, cycle TEXT, reason_code TEXT, operator_id TEXT,
      operator_name TEXT, src TEXT, created_at TEXT, type TEXT, linked_task_id TEXT,
      period_due REAL, status TEXT, ts TEXT
    );
    CREATE TABLE arrear_tasks (
      task_id TEXT PRIMARY KEY, corpid TEXT, bed TEXT, original_period_start TEXT,
      original_period_end TEXT, close_status TEXT
    );
  `);
}

async function localDatabase({ migration = true, failRegistry = false } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  baseSchema(sqlite);
  if (migration) sqlite.exec(await readFile(migrationPath, "utf8"));
  return { sqlite, d1: new LocalD1(sqlite, { failRegistry }) };
}

function cleanText(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanDate(value) {
  const match = String(value ?? "").match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

async function insertDynamic(env, table, values) {
  if (env.__failCanonicalSession && table === "sessions") throw new Error("canonical session write failed");
  const columns = (await env.DB.prepare(`PRAGMA table_info(${table})`).all()).results.map(row => row.name);
  const names = Object.keys(values).filter(name => columns.includes(name) && values[name] !== undefined);
  const statement = `INSERT OR REPLACE INTO ${table} (${names.join(",")}) VALUES (${names.map(() => "?").join(",")})`;
  await env.DB.prepare(statement).bind(...names.map(name => values[name])).run();
  return { inserted: true, columns: names };
}

function requestBody(eventType, suffix = eventType) {
  const type = eventType === "rent" ? "R" : "D";
  const amount = eventType === "rent" ? 680 : 100;
  const entry = {
    id: `entry-${suffix}`,
    entry_id: `entry-${suffix}`,
    anchor_id: `anchor-${suffix}`,
    event_type: eventType,
    type,
    stay_action: "start",
    room: "611",
    bed: "611",
    amount,
    due: amount,
    paid: amount,
    period_due: eventType === "rent" ? amount : 0,
    payment_method: "cash",
    pay_type: "cash",
    period_start: "2026-07-11",
    period_end: "2026-08-11",
    rent_period_start: "2026-07-11",
    rent_period_end: "2026-08-11",
    deposit_amount: eventType === "deposit_in" ? amount : undefined,
    deposit_required_total: eventType === "deposit_in" ? 200 : undefined,
    deposit_paid_amount: eventType === "deposit_in" ? amount : undefined,
    deposit_remaining: eventType === "deposit_in" ? 100 : undefined,
    created_at: "2026-07-11T12:00:00+04:00"
  };
  return {
    event_index: 0,
    entry: { ...entry },
    entries: [{ ...entry }],
    session: {
      id: `session-${suffix}`,
      session_id: `session-${suffix}`,
      anchor_id: `session-anchor-${suffix}`,
      date: "2026-07-11",
      source: "employee_entry",
      entries: [{ ...entry }]
    }
  };
}

async function harness({ migration = true, failRegistry = false, uuids = [STAY_UUID, LINK_UUID] } = {}) {
  const source = await readFile(workerPath, "utf8");
  const { sqlite, d1 } = await localDatabase({ migration, failRegistry });
  const uuidCalls = [];
  let uuidIndex = 0;
  let idCounter = 0;
  const context = {
    evaluateStayGenesisTrigger,
    prepareStayGenesis,
    materializePreparedStayGenesis,
    Date,
    crypto: { randomUUID() { uuidCalls.push(uuidIndex); return uuids[uuidIndex++]; } },
    cleanText,
    cleanId: value => cleanText(value, 160),
    cleanDate,
    entryAnchorMoney: value => Math.round((Number(value) || 0) * 100) / 100,
    empNow: () => "2026-07-11T12:00:00+04:00",
    empTodayDubai: () => "2026-07-11",
    empId: prefix => `${prefix}-local-${++idCounter}`,
    employeeEntryValidationFailure: (stage, error_code, message, extra = {}) => ({ ok: false, stage, error_code, message, ...extra }),
    json: (body, status = 200) => ({ body, status }),
    success: body => ({ body: { ok: true, ...body }, status: 200 }),
    badRequest: error_code => ({ body: { ok: false, error_code }, status: 400 }),
    errorResponse: (error_code, status) => ({ body: { ok: false, error_code }, status }),
    bedTransferForbiddenIdentityFailure: () => null,
    employeeEntryUploadType: entry => ({ rent: "R", deposit_in: "D", arrears_payment: "AP", deposit_out: "DR", checkout: "CO", expense: "E", bed_transfer: "TF" })[entry?.event_type] || cleanText(entry?.type, 12).toUpperCase(),
    bedTransferWriteApproved: () => false,
    bedTransferWriteDisabledResponse: () => ({ body: { error_code: "bed_transfer_write_disabled_phase1_safety" }, status: 409 }),
    validateEmployeeEntryStayGenesisBusinessFields: () => null,
    normalizeEmployeeEntryBodyForValidation: body => structuredClone(body),
    validateEmployeeEntryUploadPayload: async () => ({ ok: true, idempotent: false }),
    eeaLiveRouteGate: () => ({ enabled: false }),
    empRentForBed: async () => 0,
    empAddMonths: value => value,
    empAddDays: value => value,
    employeeEntryBedTransferFee: () => ({ fee_choice: "", fee_amount: 0, payment_method: "", waiver_reason: "" }),
    employeeEntryUploadHasValue: value => String(value ?? "").trim() !== "",
    empDepositBalance: async () => 0,
    getOpenCloudArrearsForBed: async () => [],
    buildEmployeeEntryEntriesWithOccupancyCandidateMetadata: (_user, _body, entries) => entries.map(row => {
      const clean = { ...row };
      for (const field of ["tenant_card_id", "card_id", "old_ttlock_ref", "provider_phone", "phone_99099", "provider_metadata"]) delete clean[field];
      clean.anchor_contract_version = "employee_entry_anchor_v1";
      clean.validation_status = "valid";
      clean.validation_missing_fields = [];
      return clean;
    }),
    employeeEntryExportTextWithAnchors: (_text, entries) => JSON.stringify(entries),
    empInsertDynamic: insertDynamic,
    empDepositMove: async () => null,
    empEnsureOpenArrearTaskForPayment: async () => null,
    empReconcileArrearTask: async () => null,
    empApplyLeftWithArrearsMetadata: async () => null,
    empEvent: async () => ({ inserted: true }),
    audit: async () => null,
    EMP_SESSION_COLUMNS: [],
    EMP_TX_COLUMNS: [],
    EMP_TASK_COLUMNS: [],
    EEA_EMPLOYEE_ROLES: new Set(["employee", "staff"])
  };
  vm.createContext(context);
  vm.runInContext([
    functionBlock(source, "empTableExists"),
    functionBlock(source, "employeeEntryValidationEntryFromBody"),
    functionBlock(source, "employeeEntryStayGenesisRows"),
    functionBlock(source, "employeeEntryStayGenesisEnvelopeFailure"),
    functionBlock(source, "evaluateEmployeeEntryStayGenesis"),
    functionBlock(source, "employeeEntryStayGenesisStartRequested"),
    functionBlock(source, "employeeEntryStayGenesisFailure"),
    functionBlock(source, "stayGenesisWriteNotEnabledResponse"),
    functionBlock(source, "durableStayWriteApproved"),
    functionBlock(source, "durableStayMissingTables"),
    functionBlock(source, "stayGenesisSchemaNotReadyResponse"),
    functionBlock(source, "employeeEntryCanonicalGenesisEntries"),
    functionBlock(source, "handleEmployeeEntry")
  ].join("\n"), context);
  const env = { DB: d1, DURABLE_STAY_WRITE_APPROVED: "true" };
  const user = { corpid: "corp-a", userid: "employee-a", employee_name: "Employee A", role: "employee" };
  return { source, context, sqlite, d1, env, user, uuidCalls };
}

function request(body) {
  return { headers: { get: () => null }, json: async () => structuredClone(body) };
}

function canonicalEntry(sqlite, sessionId) {
  const row = sqlite.prepare("SELECT entries_json FROM sessions WHERE id=?").get(sessionId);
  return row ? JSON.parse(row.entries_json).entries[0] : null;
}

for (const eventType of ["rent", "deposit_in"]) {
  test(`${eventType} genesis writes canonical ID first and materializes matching registry`, async () => {
    const h = await harness();
    const body = requestBody(eventType);
    body.entry.card_id = "provider-card-value";
    body.entries[0].card_id = "provider-card-value";
    body.session.entries[0].card_id = "provider-card-value";
    const response = await h.context.handleEmployeeEntry(request(body), h.env, h.user);
    assert.equal(response.status, 200);
    assert.equal(response.body.stay_genesis.registry_status, "created");
    assert.equal(response.body.stay_genesis.stay_context_id, STAY_UUID);
    const anchor = canonicalEntry(h.sqlite, body.session.id);
    assert.equal(anchor.stay_action, "start");
    assert.equal(anchor.stay_context_id, STAY_UUID);
    assert.equal(anchor.stay_lifecycle_action, "genesis");
    assert.equal(anchor.amount, body.entry.amount);
    assert.equal(anchor.card_id, undefined);
    const contextRow = h.sqlite.prepare("SELECT * FROM stay_contexts").get();
    const linkRow = h.sqlite.prepare("SELECT * FROM stay_event_links").get();
    assert.equal(contextRow.stay_context_id, anchor.stay_context_id);
    assert.equal(linkRow.stay_context_id, anchor.stay_context_id);
    assert.equal(contextRow.genesis_anchor_id, anchor.anchor_id);
    assert.deepEqual(h.uuidCalls, [0, 1]);
    h.sqlite.close();
  });
}

test("full request retry is deduplicated without another stay or link", async () => {
  const h = await harness();
  const body = requestBody("rent", "retry");
  const first = await h.context.handleEmployeeEntry(request(body), h.env, h.user);
  const second = await h.context.handleEmployeeEntry(request(body), h.env, h.user);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(second.body.duplicate, true);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM stay_contexts").get().count, 1);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM stay_event_links").get().count, 1);
  assert.deepEqual(h.uuidCalls, [0, 1]);
  h.sqlite.close();
});

test("session.entries target can carry the single canonical genesis ID without body.entry", async () => {
  const h = await harness();
  const body = requestBody("rent", "session-wrapper");
  delete body.entry;
  const response = await h.context.handleEmployeeEntry(request(body), h.env, h.user);
  assert.equal(response.status, 200);
  const anchor = canonicalEntry(h.sqlite, body.session.id);
  assert.equal(anchor.stay_context_id, STAY_UUID);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM stay_contexts").get().count, 1);
  assert.deepEqual(h.uuidCalls, [0, 1]);
  h.sqlite.close();
});

test("materializer repairs a missing link from canonical prepared facts", async () => {
  const h = await harness({ uuids: [STAY_UUID, LINK_UUID, "33333333-3333-4333-a333-333333333333"] });
  const body = requestBody("rent", "repair");
  await h.context.handleEmployeeEntry(request(body), h.env, h.user);
  const anchor = canonicalEntry(h.sqlite, body.session.id);
  h.sqlite.prepare("DELETE FROM stay_event_links").run();
  const result = await materializePreparedStayGenesis(h.d1, {
    stay_context_id: anchor.stay_context_id,
    corpid: "corp-a",
    genesis_event_type: anchor.event_type,
    genesis_session_id: anchor.session_id,
    genesis_entry_id: anchor.entry_id,
    genesis_anchor_id: anchor.anchor_id,
    started_at: anchor.created_at,
    lifecycle_status: "active"
  }, { randomUUID: () => "33333333-3333-4333-a333-333333333333", createdAt: anchor.created_at });
  assert.equal(result.status, "link_repaired");
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM stay_event_links").get().count, 1);
  h.sqlite.close();
});

test("missing stay schema returns fixed 503 before canonical business writes", async () => {
  const h = await harness({ migration: false });
  const response = await h.context.handleEmployeeEntry(request(requestBody("rent", "schema")), h.env, h.user);
  assert.equal(response.status, 503);
  assert.equal(response.body.error_code, "STAY_GENESIS_SCHEMA_NOT_READY");
  assert.deepEqual(Array.from(response.body.missing_tables), ["stay_contexts", "stay_event_links"]);
  assert.equal(response.body.write_attempted, false);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM sessions").get().count, 0);
  h.sqlite.close();
});

test("schema capability reports one missing registry table without runtime DDL", async () => {
  const h = await harness({ migration: false });
  h.sqlite.exec(`CREATE TABLE stay_contexts (
    stay_context_id TEXT PRIMARY KEY, corpid TEXT, lifecycle_status TEXT,
    genesis_event_type TEXT, genesis_session_id TEXT, genesis_entry_id TEXT,
    genesis_anchor_id TEXT, started_at TEXT
  )`);
  const response = await h.context.handleEmployeeEntry(request(requestBody("deposit_in", "one-table")), h.env, h.user);
  assert.equal(response.status, 503);
  assert.deepEqual(Array.from(response.body.missing_tables), ["stay_event_links"]);
  assert.equal(h.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stay_event_links'").get(), undefined);
  h.sqlite.close();
});

test("temporary registry failure returns 202 while canonical archive remains accepted", async () => {
  const h = await harness({ failRegistry: true });
  const body = requestBody("rent", "pending");
  const response = await h.context.handleEmployeeEntry(request(body), h.env, h.user);
  assert.equal(response.status, 202);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.canonical_write_status, "accepted");
  assert.equal(response.body.stay_registry_status, "pending_rebuild");
  assert.equal(response.body.owner_review_required, true);
  assert.equal(canonicalEntry(h.sqlite, body.session.id).stay_context_id, STAY_UUID);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM transactions").get().count, 1);
  h.sqlite.close();
});

test("registry canonical conflict returns safe 202 without deleting canonical archive", async () => {
  const h = await harness();
  const body = requestBody("rent", "conflict");
  h.sqlite.prepare(`INSERT INTO stay_contexts (
    stay_context_id, corpid, lifecycle_status, genesis_event_type, genesis_session_id,
    genesis_entry_id, genesis_anchor_id, started_at
  ) VALUES (?, ?, 'active', 'rent', ?, ?, ?, ?)`)
    .run("33333333-3333-4333-a333-333333333333", "corp-a", body.session.id, body.entry.id, body.entry.anchor_id, body.entry.created_at);
  const response = await h.context.handleEmployeeEntry(request(body), h.env, h.user);
  assert.equal(response.status, 202);
  assert.equal(response.body.stay_registry_status, "conflict");
  assert.equal(response.body.error_code, "STAY_GENESIS_ANCHOR_CONFLICT");
  assert.equal(canonicalEntry(h.sqlite, body.session.id).stay_context_id, STAY_UUID);
  h.sqlite.close();
});

test("canonical session failure prevents every registry materialization attempt", async () => {
  const h = await harness();
  h.env.__failCanonicalSession = true;
  await assert.rejects(h.context.handleEmployeeEntry(request(requestBody("rent", "canonical-fail")), h.env, h.user), /canonical session write failed/);
  assert.equal(h.d1.registryBatchCalls, 0);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM stay_contexts").get().count, 0);
  h.sqlite.close();
});

test("client stay ID is rejected and no-trigger Rent or Deposit In creates no stay", async () => {
  const h = await harness();
  const forbidden = requestBody("rent", "forbidden");
  forbidden.entry.stay_context_id = "client-value";
  const rejected = await h.context.handleEmployeeEntry(request(forbidden), h.env, h.user);
  assert.equal(rejected.status, 422);
  assert.equal(rejected.body.error_code, "STAY_SERVER_MANAGED_FIELD_FORBIDDEN");

  const ordinary = requestBody("rent", "ordinary");
  delete ordinary.entry.stay_action;
  delete ordinary.entries[0].stay_action;
  delete ordinary.session.entries[0].stay_action;
  const accepted = await h.context.handleEmployeeEntry(request(ordinary), { ...h.env, DURABLE_STAY_WRITE_APPROVED: "false" }, h.user);
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.stay_genesis, undefined);
  const ordinaryDeposit = requestBody("deposit_in", "ordinary-deposit");
  delete ordinaryDeposit.entry.stay_action;
  delete ordinaryDeposit.entries[0].stay_action;
  delete ordinaryDeposit.session.entries[0].stay_action;
  const acceptedDeposit = await h.context.handleEmployeeEntry(request(ordinaryDeposit), { ...h.env, DURABLE_STAY_WRITE_APPROVED: "false" }, h.user);
  assert.equal(acceptedDeposit.status, 200);
  assert.equal(acceptedDeposit.body.stay_genesis, undefined);
  assert.equal(h.sqlite.prepare("SELECT COUNT(*) AS count FROM stay_contexts").get().count, 0);
  h.sqlite.close();
});

test("runtime source preserves Bed Transfer closures and keeps validate-only free of UUID and writes", async () => {
  const source = await readFile(workerPath, "utf8");
  const validate = functionBlock(source, "handleEmployeeEntryValidate");
  const validator = functionBlock(source, "validateEmployeeEntryUploadPayload");
  assert.doesNotMatch(validate, /prepareStayGenesis|materializePreparedStayGenesis|randomUUID/);
  assert.doesNotMatch(validator, /prepareStayGenesis|materializePreparedStayGenesis|randomUUID/);
  assert.match(functionBlock(source, "handleEmployeeBedTransferCreate"), /return bedTransferCanonicalPathRequiredResponse\(\);/);
  assert.match(source, /if\(saveSessionContainsBedTransfer\(body\)\)return bedTransferCanonicalPathRequiredResponse\(\);/);
  assert.match(functionBlock(source, "handleEmployeeEntry"), /\["TF","TFF"\]\.includes\(writeGateType\)&&!bedTransferWriteApproved\(env\)/);
});

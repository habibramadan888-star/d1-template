import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

async function loadEmployeeRentHarness() {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const uploadStart = html.indexOf("function cloneEntryForUpload");
  const uploadEnd = html.indexOf("function currentSessionPayload", uploadStart);
  const start = html.indexOf("const EMPLOYEE_ENTRY_ANCHOR_CONTRACT");
  const end = html.indexOf("function sessionStats", start);
  assert.ok(uploadStart > 0 && uploadEnd > uploadStart && start > 0 && end > start);
  const sandbox = {
    Date,
    Math,
    JSON,
    String,
    Number,
    Object,
    Array,
    console,
    state: { drafts: [], user: { userid: "abdul", name: "Abdul" } }
  };
  vm.createContext(sandbox);
  vm.runInContext(
    `
    function num(v){ return Number(String(v ?? 0).replace(/,/g,'')) || 0; }
    function fmtMoney(v){ return Number(num(v).toFixed(2)).toString(); }
    function uid(prefix){ return prefix + '-test'; }
    function employeeStorageKey(key){ return key; }
    function operatorName(){ return 'Abdul'; }
    function operatorId(){ return 'abdul'; }
    function nowIso(){ return '2026-07-07T10:00:00.000Z'; }
    function employeeEntryStableIdentity(entry={}){
      return String(entry.id||entry.event_id||entry.anchor_id||entry.original_local_entry_id||'').trim();
    }
    function employeeQaAcceptanceSessionId(entry={},fallback=''){
      const id=employeeEntryStableIdentity(entry);
      return String(state.qaAcceptance?.sessionIdsByEntry?.[id]||fallback||'');
    }
    const localStorage = { setItem(){}, getItem(){ return ''; } };
    ${html.slice(start, end)}
    ${html.slice(uploadStart, uploadEnd)}
    globalThis.normalizeEntryAnchor = normalizeEntryAnchor;
    globalThis.validateUploadAnchorBatch = validateUploadAnchorBatch;
    globalThis.prepareRepeatableUploadRows = prepareRepeatableUploadRows;
    globalThis.buildEntryAnchorExportBlock = buildEntryAnchorExportBlock;
    `,
    sandbox
  );
  return sandbox;
}

async function loadWorkerRentHarness() {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const start = worker.indexOf("const entryAnchorContract");
  const end = worker.indexOf("function empCloseStatusIsOpen", start);
  assert.ok(start > 0 && end > start);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `
    function __name(fn){ return fn; }
    function cleanText(value,max=10000){ return String(value ?? '').slice(0,max); }
    function cleanDate(value){ return String(value || '').slice(0, 10); }
    const employeeEntryAnchorParseCache = new WeakMap();
    ${worker.slice(start, end)}
    globalThis.extractEmployeeEntryAnchorsFromSession = extractEmployeeEntryAnchorsFromSession;
    `,
    sandbox
  );
  return sandbox;
}

test("normal rent add-to-session payload is valid for dry-run upload", async () => {
  const harness = await loadEmployeeRentHarness();
  const rent = harness.normalizeEntryAnchor({
    id: "E-rent-143",
    type: "R",
    room: "143",
    amount: 700,
    paid: 700,
    due: 700,
    period_due: 700,
    pay_type: "C",
    period_start: "2026-08-06",
    period_end: "2026-09-06",
    created_at: "2026-07-07T10:00:00.000Z"
  });

  assert.equal(rent.event_type, "rent");
  assert.equal(rent.bed, "143");
  assert.equal(rent.expected_rent, 700);
  assert.equal(rent.paid_amount, 700);
  assert.equal(rent.short_paid, false);
  assert.equal(rent.validation_status, "valid");

  const uploadRows = harness.prepareRepeatableUploadRows([rent], "S-rent-143", "upload-rent-143");
  assert.equal(harness.validateUploadAnchorBatch(uploadRows).ok, true);
  assert.equal(uploadRows[0].session_id, "S-rent-143");
  assert.equal(uploadRows[0].idempotency_key, "employee-entry-S-rent-143-E-rent-143");
});

test("short paid rent preserves arrears anchor while remaining upload-valid", async () => {
  const harness = await loadEmployeeRentHarness();
  const rent = harness.normalizeEntryAnchor({
    type: "R",
    room: "144",
    amount: 700,
    paid: 700,
    due: 770,
    period_due: 770,
    pay_type: "C",
    period_start: "2026-08-06",
    period_end: "2026-09-06",
    arrear_promise_date: "2026-08-10",
    arrear_reason_detail: "salary delay",
    note: "salary delay",
    created_at: "2026-07-07T10:00:00.000Z"
  });

  assert.equal(rent.event_type, "rent");
  assert.equal(rent.expected_rent, 770);
  assert.equal(rent.paid_amount, 700);
  assert.equal(rent.short_paid, true);
  assert.equal(rent.arrears_amount, 70);
  assert.equal(rent.arrears_due_date, "2026-08-10");
  assert.equal(rent.arrears_note, "salary delay");
  assert.equal(rent.arrears_status, "open");
  assert.equal(rent.validation_status, "valid");
  assert.equal(harness.validateUploadAnchorBatch([rent]).ok, true);
});

test("owner history detail can decode uploaded rent session anchors", async () => {
  const employee = await loadEmployeeRentHarness();
  const worker = await loadWorkerRentHarness();
  const rent = employee.normalizeEntryAnchor({
    type: "R",
    room: "143",
    amount: 700,
    paid: 700,
    due: 700,
    period_due: 700,
    pay_type: "C",
    period_start: "2026-08-06",
    period_end: "2026-09-06",
    created_at: "2026-07-07T10:00:00.000Z"
  });
  const entriesJson = JSON.stringify({
    anchor_contract_version: "employee_entry_anchor_v1",
    entries: [rent]
  });
  const rows = worker.extractEmployeeEntryAnchorsFromSession({
    id: "S-rent-143",
    corpid: "homelink",
    source: "employee_entry",
    operator_id: "abdul",
    operator_name: "Abdul",
    entries_json: entriesJson
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].event_type, "rent");
  assert.equal(rows[0].bed, "143");
  assert.equal(rows[0].expected_rent, 700);
  assert.equal(rows[0].paid_amount, 700);
});

test("rent ledger export remains available after synced upload state", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "R",
      room: "143",
      amount: 700,
      paid: 700,
      due: 700,
      period_due: 700,
      pay_type: "C",
      sync_status: "SYNCED",
      upload_status: "SYNCED",
      created_at: "2026-07-07T10:00:00.000Z",
      period_start: "2026-08-06",
      period_end: "2026-09-06"
    }
  ]);

  assert.match(text, /^HOMELINK LEDGER/m);
  assert.match(text, /\[143\] paid 700 cash/);
  assert.doesNotMatch(text, /short_paid/);
  assert.doesNotMatch(text, /Upload validation failed/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function loadWorkerAnchorHarness() {
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
    ${worker.slice(start, end)}
    globalThis.extractEmployeeEntryAnchorsFromSession = extractEmployeeEntryAnchorsFromSession;
    globalThis.employeeEntryExportTextWithAnchors = employeeEntryExportTextWithAnchors;
    globalThis.renderEntryAnchorForWhatsapp = renderEntryAnchorForWhatsapp;
    `,
    sandbox
  );
  return sandbox;
}

const sevenAnchors = [
  {
    type: "R",
    event_type: "rent",
    room: "144",
    amount: 700,
    paid: 700,
    period_due: 770,
    due: 770,
    pay_type: "C",
    period_start: "2026-07-03",
    period_end: "2026-08-02",
    arrear_promise_date: "2026-07-10",
    arrear_reason_detail: "customer will pay later"
  },
  {
    type: "AP",
    event_type: "arrears_payment",
    room: "144",
    amount: 70,
    pay_type: "C",
    linked_task_id: "task-short-144",
    original_arrears_amount: 70,
    already_paid_amount: 0,
    remaining_arrears: 0
  },
  {
    type: "D",
    event_type: "deposit_in",
    room: "221",
    amount: 500,
    pay_type: "B",
    tenant_card_id: "tenant-221",
    note: "new deposit"
  },
  {
    type: "DR",
    event_type: "deposit_out",
    room: "222",
    amount: 200,
    pay_type: "C",
    deposit_balance: 200,
    actual_refund_amount: 200,
    refund_date: "2026-07-05",
    ded_note: "refund to home"
  },
  {
    type: "CO",
    event_type: "checkout",
    room: "223",
    amount: 0,
    checkout_date: "2026-07-05",
    deposit_amt: 300,
    deposit_deduction: 20,
    note: "final checkout"
  },
  {
    type: "E",
    event_type: "expense",
    room: "219",
    amount: 5,
    pay_type: "C",
    expense_category: "maintenance",
    expense_desc: "door battery"
  },
  {
    type: "TF",
    event_type: "bed_transfer",
    room: "112",
    room_to: "111",
    bed_from: "112",
    bed_to: "111",
    amount: 50,
    pay_type: "C",
    transfer_date: "2026-07-05",
    transfer_reason: "customer_request"
  }
];

test("employee upload payload and export text carry structured 7-event anchor block", async () => {
  const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(employee, /entries=state\.drafts\.map\(normalizeEntryAnchor\)/);
  assert.match(employee, /entries_json:JSON\.stringify\(\{anchor_contract_version:'employee_entry_anchor_v1',entries\}\)/);
  assert.match(employee, /function buildEntryAnchorExportBlock\(entries=state\.drafts\)/);
  assert.match(employee, /==== ENTRY ANCHORS JSON ====/);
  assert.match(employee, /==== END ENTRY ANCHORS JSON ====/);
});

test("worker extracts canonical structured employee anchors before legacy export parsing", async () => {
  const harness = await loadWorkerAnchorHarness();
  const exportText = harness.employeeEntryExportTextWithAnchors("HOMELINK LEDGER", sevenAnchors, {
    id: "S-seven",
    anchorId: "EMPV3-seven"
  });

  const rows = harness.extractEmployeeEntryAnchorsFromSession({
    id: "S-seven",
    corpid: "homelink",
    anchor_id: "EMPV3-seven",
    operator_id: "abdul",
    operator_name: "Abdul",
    source: "employee_entry",
    export_text: exportText
  });

  assert.equal(rows.length, 7);
  assert.equal(
    JSON.stringify(rows.map((row) => row.event_type)),
    JSON.stringify(["rent", "arrears_payment", "deposit_in", "deposit_out", "checkout", "expense", "bed_transfer"])
  );

  const rent = rows[0];
  assert.equal(rent.short_paid, true);
  assert.equal(rent.arrears_amount, 70);
  assert.equal(rent.arrears_due_date, "2026-07-10");
  assert.equal(rent.arrears_status, "open");

  const arrearsPayment = rows[1];
  assert.equal(arrearsPayment.arrears_ref, "task-short-144");
  assert.equal(arrearsPayment.remaining_arrears, 0);
  assert.equal(arrearsPayment.settlement_status, "settled");

  assert.equal(rows[2].deposit_amount, 500);
  assert.equal(rows[3].refund_amount, 200);
  assert.equal(rows[3].actual_refund_amount, 200);
  assert.equal(rows[3].deposit_balance, 200);
  assert.equal(rows[3].refund_difference, 0);
  assert.equal(rows[4].checkout_date, "2026-07-05");
  assert.equal(rows[4].deposit_refund, 0);
  assert.equal(rows[5].expense_category, "maintenance");
  assert.equal(rows[6].from_bed, "112");
  assert.equal(rows[6].to_bed, "111");
  assert.equal(rows[6].fee_amount, 50);
  assert.equal(rows[6].transfer_reason, "customer_request");
});

test("owner session detail route prefers structured anchors over legacy text decoder", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /const anchorRows=extractEmployeeEntryAnchorsFromSession\(sessionRow\)/);
  assert.match(worker, /const exportRows=parseEmployeeEntryExportRows\(sessionRow\)/);
  assert.match(worker, /chooseOwnerEmployeeSessionDetailRows\(sessionRow,results,anchorRows,exportRows\)/);
});

test("owner detail mapper preserves all structured employee anchor fields", async () => {
  const owner = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(owner, /const eventType=tx\.event_type\|\|tx\.type\|\|tx\.reason_code\|\|''/);
  assert.match(owner, /deposit_amount/);
  assert.match(owner, /refund_amount/);
  assert.match(owner, /checkout_date/);
  assert.match(owner, /expense_amount/);
  assert.match(owner, /fee_amount/);
  assert.match(owner, /\.\.\.tx/);
});

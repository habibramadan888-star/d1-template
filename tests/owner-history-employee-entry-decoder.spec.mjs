import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { loadLedgerHarness, readOwnerMain } from "./helpers/ledger-history-test-utils.mjs";

const employeeExportText = `HOMELINK LEDGER
Property HL-009  Staff 阿布杜 / abdul  2026-07-03  Session S20260703-amv7l

==== CASH RECEIVED ====
#146 146 D100 0901 R O paid 700.00 AED expected 770.00 short paid SHORT_PAID 70.00 PROMISE:2026-07-05 NOTE:222 STATUS:open
#144 144 D200 0101 R O paid 700.00 AED expected 770.00 short paid SHORT_PAID 70.00 PROMISE:2026-07-11 NOTE:111 STATUS:open
#112 -> #111 manager TF FEE50 C

==== ARREAR REPAID ====
#144 144 D200 0101 AP 70.00 AED C closes TASK task-mr5bepkg-e7425634

==== TRANSFER ====
#112 -> #111 manager TF FEE50 C

==== HANDOVER ANCHORS ====
Cash handover: 1,520.00
Bank transfer total: 0.00 (0 txns)
Gross received: 1,520.00

==== SUMMARY ====
Entries: 4
Exported 2026-07-03T23:32:52+04:00
All synced`;

test("employee entry history summary does not reparse export footer as money", async () => {
  const { normalizeLedgerSession } = await loadLedgerHarness();

  const normalized = normalizeLedgerSession({
    id: "S20260703-amv7l",
    date: "2026-07-03",
    anchorId: "EMPV3-20260703-abdul-amv7l",
    anchor_id: "EMPV3-20260703-abdul-amv7l",
    source: "EMP",
    entries: [],
    entriesCount: 4,
    entries_count: 4,
    cash_handover: 1520,
    gross_received: 1520,
    export_text: employeeExportText,
    _cloud: true
  });

  assert.equal(normalized._reparsedFromRaw, undefined);
  assert.equal(normalized.entries.length, 0);
  assert.equal(normalized.entriesCount, 4);
  assert.equal(normalized.cash_handover, 1520);
  assert.equal(normalized.gross_received, 1520);
});

test("owner history card uses stored entries_count when employee summary has no detail rows yet", async () => {
  const main = await readOwnerMain();

  assert.match(main, /function isEmployeeLedgerSession\(s\)/);
  assert.match(main, /raw\.trim\(\)&&!isEmployeeLedgerSession\(original\)/);
  assert.match(main, /const cnt=hasEntries\?s\.entries\.length:\(s\.entriesCount\|\|0\)/);
});

test("owner session detail has employee export decoder fallback for R AP and TF rows", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /const entryAnchorContract=/);
  assert.match(worker, /function normalizeEntryAnchor\(row\)/);
  assert.match(worker, /function validateEntryAnchor\(row\)/);
  assert.match(worker, /function renderEntryAnchorForOwner\(row\)/);
  assert.match(worker, /function parseEmployeeEntryExportRows\(session\)/);
  assert.match(worker, /section==="CASH RECEIVED"&&\/\\sTF\\s\/i\.test\(line\)/);
  assert.match(worker, /section==="CASH RECEIVED"&&\/\\sR\\s\/i\.test\(line\)/);
  assert.match(worker, /section==="ARREAR REPAID"&&\/\\sAP\\s\/i\.test\(line\)/);
  assert.match(worker, /if\(sessionRow&&isEmployeeEntrySession\(sessionRow\)\)/);
  assert.match(worker, /chooseOwnerEmployeeSessionDetailRows\(sessionRow,results,anchorRows,exportRows\)/);
});

test("employee export detail decoder returns the four expected owner detail rows", async () => {
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
    ${worker.slice(start, end)}
    globalThis.parseEmployeeEntryExportRows = parseEmployeeEntryExportRows;
    `,
    sandbox
  );

  const rows = sandbox.parseEmployeeEntryExportRows({
    id: "S20260703-amv7l",
    corpid: "homelink",
    anchor_id: "EMPV3-20260703-abdul-amv7l",
    operator_id: "abdul",
    operator_name: "阿布杜",
    source: "EMP",
    export_text: employeeExportText
  });

  assert.equal(rows.length, 4);
  assert.equal(
    JSON.stringify(rows.map((row) => [row.source, row.event_type, row.validation_status])),
    JSON.stringify([
      ["employee_entry", "rent", "valid"],
      ["employee_entry", "rent", "valid"],
      ["employee_entry", "bed_transfer", "valid"],
      ["employee_entry", "arrears_payment", "valid"]
    ])
  );
  assert.equal(
    JSON.stringify(rows.map((row) => [row.type, row.room, row.room_to || "", row.amount])),
    JSON.stringify([
      ["R", "146", "", 700],
      ["R", "144", "", 700],
      ["TF", "112", "111", 50],
      ["AP", "144", "", 70]
    ])
  );
});

test("owner parser reads WhatsApp-friendly employee statement without changing display text", async () => {
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
    ${worker.slice(start, end)}
    globalThis.parseEmployeeEntryExportRows = parseEmployeeEntryExportRows;
    `,
    sandbox
  );

  const statement = [
    "Statement",
    "Date 0707",
    "Employee Abdul",
    "",
    "💼 ▬▬▬▬▬▬▬▬▬▬▬ 💼",
    "Core Summary",
    "Cash Received 850",
    "Bank Received 700",
    "Gross Received 1550",
    "",
    "💵 ▬▬▬▬▬▬▬▬▬▬▬ 💵",
    "Cash Details",
    "[334] paid 700 cash short 80 promise 0710 note 111",
    "[736] deposit 100 cash note new",
    "",
    "🏦 ▬▬▬▬▬▬▬▬▬▬▬ 🏦",
    "Bank Details",
    "[841] paid 700 bank",
    "",
    "🧾 ▬▬▬▬▬▬▬▬▬▬▬ 🧾",
    "Arrears Details",
    "[334] arrears paid 80 cash old balance",
    "",
    "🔄 ▬▬▬▬▬▬▬▬▬▬▬ 🔄",
    "Transfer Details",
    "[112]",
    "[111]",
    "transfer 50 cash management adjustment",
    "",
    "📤 ▬▬▬▬▬▬▬▬▬▬▬ 📤",
    "Expense Details",
    "[751] expense 200 cash maintenance"
  ].join("\n");

  const rows = sandbox.parseEmployeeEntryExportRows({
    id: "S20260707-whatsapp",
    corpid: "homelink",
    anchor_id: "EMPV3-20260707-abdul-whatsapp",
    operator_id: "abdul",
    operator_name: "Abdul",
    source: "employee_entry",
    export_text: statement
  });

  assert.equal(rows.length, 6);
  assert.equal(
    JSON.stringify(rows.map((row) => row.event_type)),
    JSON.stringify([
      "rent",
      "deposit_in",
      "rent",
      "arrears_payment",
      "bed_transfer",
      "expense"
    ])
  );
  assert.equal(rows[0].room, "334");
  assert.equal(rows[0].amount, 700);
  assert.equal(rows[0].deficit, 80);
  assert.equal(rows[0].arrear_promise_date, "0710");
  assert.equal(rows[4].room, "112");
  assert.equal(rows[4].room_to, "111");
});

test("owner session detail chooses complete transaction rows over partial export parser", async () => {
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
    function cleanDate(value){ return String(value || '').slice(0,10); }
    ${worker.slice(start, end)}
    globalThis.chooseOwnerEmployeeSessionDetailRows = chooseOwnerEmployeeSessionDetailRows;
    globalThis.ownerEmployeeDetailRowsTotals = ownerEmployeeDetailRowsTotals;
    `,
    sandbox
  );

  const session = {
    id: "S20260707-057sk",
    anchor_id: "EMPV3-20260707-abdul-057sk",
    source: "employee_entry",
    entries_count: 23,
    cash_handover: 10940,
    bank_transfer_total: 4060,
    gross_received: 15000
  };
  const cashRows = Array.from({ length: 13 }, (_, index) => ({
    id: `cash-${index + 1}`,
    cat: "cash",
    room: `C${index + 1}`,
    amount: index === 12 ? 1340 : 800,
    pay_type: "C",
    type: "R"
  }));
  const bankRows = Array.from({ length: 10 }, (_, index) => ({
    id: `bank-${index + 1}`,
    cat: "bank",
    room: `B${index + 1}`,
    amount: 406,
    pay_type: "B",
    type: "R"
  }));
  const transactionRows = [...cashRows, ...bankRows];
  const partialExportRows = Array.from({ length: 13 }, (_, index) => ({
    id: `export-${index + 1}`,
    cat: "cash",
    room: `E${index + 1}`,
    amount: index === 12 ? 990 : 800,
    pay_type: "C",
    type: "R"
  }));

  const choice = sandbox.chooseOwnerEmployeeSessionDetailRows(session, transactionRows, [], partialExportRows);
  const totals = sandbox.ownerEmployeeDetailRowsTotals(choice.rows);

  assert.equal(choice.source, "transactions");
  assert.equal(choice.rows.length, 23);
  assert.equal(totals.cash, 10940);
  assert.equal(totals.bank, 4060);
  assert.equal(totals.gross, 15000);
});

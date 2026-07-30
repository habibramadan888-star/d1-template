import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const ownerPath = "deploy-worker/public/index-51-main.js";

async function ownerRawHeldFunctions() {
  const source = await readFile(ownerPath, "utf8");
  const start = source.indexOf("function ownerRawHeldEntryType");
  const end = source.indexOf("function ownerHistoryDetailMainText", start);
  assert.ok(start >= 0 && end > start, "raw-held Ledger functions must exist");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source.slice(start, end)}\nresult={ownerRawHeldLedgerText,ownerRawHeldAuditText};`, sandbox);
  return sandbox.result;
}

test("raw-held Owner detail renders the employee Ledger while retaining full audit evidence", async () => {
  const { ownerRawHeldLedgerText, ownerRawHeldAuditText } = await ownerRawHeldFunctions();
  const session = {
    id: "S20260730-04fkx",
    anchor_id: "RAW-S20260730-04fkx",
    date: "2026-07-31",
    created_at: "2026-07-31T02:09:00+04:00",
    entries: [
      { event_type: "rent", type: "R", room: "848", amount: 750, paid: 750, due: 750, payment_method: "cash", raw_envelope: { payload_json: JSON.stringify({ tag: "O", created_at: "2026-07-31T01:31:00+04:00" }) }, event_id: "rent-848", ingestion_status: "ACCEPTED", projection_status: "HELD_FOR_REVIEW" },
      { event_type: "rent", type: "R", room: "856", amount: 750, paid: 750, due: 750, tag: "O", payment_method: "cash", created_at: "2026-07-31T01:31:00+04:00", event_id: "rent-856" },
      { event_type: "rent", type: "R", room: "859", amount: 700, paid: 700, due: 700, tag: "N", payment_method: "cash", created_at: "2026-07-31T01:31:00+04:00", custom_reason: "original receipt 800 AED on 2026-07-20; rent 700 AED; deposit included 100 AED", event_id: "rent-859" },
      { event_type: "deposit_in", type: "D", room: "859", amount: 100, deposit_amount: 100, tag: "N", payment_method: "cash", created_at: "2026-07-31T01:31:00+04:00", event_id: "deposit-859" },
      { event_type: "rent", type: "R", room: "729", amount: 680, paid: 680, due: 680, tag: "N", payment_method: "cash", created_at: "2026-07-31T01:25:00+04:00", custom_reason: "original receipt 780 AED on 2026-07-23; rent 680 AED; deposit included 100 AED", event_id: "rent-729" },
      { event_type: "deposit_in", type: "D", room: "729", amount: 100, deposit_amount: 100, tag: "N", payment_method: "cash", created_at: "2026-07-31T01:26:00+04:00", event_id: "deposit-729" },
      { event_type: "rent", type: "R", room: "9114", amount: 1000, paid: 1000, due: 1000, tag: "O", payment_method: "cash", created_at: "2026-07-31T01:25:00+04:00", custom_reason: "250 balance from this month; 750 for next month advance", event_id: "rent-9114" },
      { event_type: "rent", type: "R", room: "857", amount: 700, paid: 700, due: 700, tag: "O", payment_method: "cash", created_at: "2026-07-31T01:25:00+04:00", event_id: "rent-857" },
      { event_type: "rent", type: "R", room: "737", amount: 460, paid: 460, due: 680, expected_rent: 680, arrears_amount: 220, tag: "O", payment_method: "bank", created_at: "2026-07-31T01:32:00+04:00", arrears_due_date: "2026-08-07", custom_reason: "Balance 220 AED on 2026-08-07; employee statement", event_id: "rent-737" },
      { event_type: "deposit_out", type: "DR", room: "946", amount: 200, actual_refund_amount: 200, tag: "O", payment_method: "cash", created_at: "2026-07-31T01:32:00+04:00", refund_reason: "Employee-reported refund 200 AED; system deposit balance 100 AED; changed location; preserve raw fact for Owner Review", event_id: "refund-946" },
      { event_type: "expense", type: "E", room: "401-103", amount: 150, expense_amount: 150, payment_method: "cash", created_at: "2026-07-31T01:32:00+04:00", expense_desc: "100 for 103 1st room AC service; 50 for 401 1st room AC smart switch removing and fixing", event_id: "expense-401-103" }
    ]
  };

  const ledger = ownerRawHeldLedgerText(session);
  const audit = ownerRawHeldAuditText(session);

  assert.match(ledger, /^HOMELINK LEDGER/m);
  assert.match(ledger, /Cash Received .* AED 4,780/);
  assert.match(ledger, /Bank Received .* AED 460/);
  assert.match(ledger, /Total Received .* AED 5,240/);
  assert.match(ledger, /Total Outflow .* AED 350/);
  assert.match(ledger, /Net Funds .* AED 4,890/);
  assert.match(ledger, /Cash Net .* AED 4,430/);
  assert.match(ledger, /Outstanding .* AED 220/);
  assert.match(ledger, /Deposit Included .* AED 200/);
  assert.match(ledger, /Deposit Refund 200/);
  assert.match(ledger, /Other Expense 150/);
  assert.match(ledger, /\[9114\] paid 1,000 O cash 0125 250 balance from this month; 750 for next month advance/);
  assert.match(ledger, /Deposit Refund Details[\s\S]*preserve raw fact for Owner Review/);
  assert.match(ledger, /Expense Details[\s\S]*50 for 401 1st room AC smart switch removing and fixing/);
  assert.match(audit, /record_id: rent-848/);
  assert.match(audit, /ingestion_status: ACCEPTED/);
  assert.match(audit, /projection_status: HELD_FOR_REVIEW/);
  assert.match(audit, /raw_fields:/);
});

test("Owner history keeps the raw-held status card and separate audit disclosure", async () => {
  const source = await readFile(ownerPath, "utf8");
  assert.match(source, /ownerRawHeldLedgerText\(session\)/);
  assert.match(source, /ownerRawHeldAuditText\(session\)/);
  assert.match(source, /data-owner-raw-held-audit="true"/);
  assert.match(source, /Raw Source &amp; Canonical Anchors/);
  assert.match(source, /Accepted · Held for Review · Not Yet Projected/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";
import { EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS } from "./fixtures/employee-seven-event-golden-session.mjs";

test("Current Session WhatsApp export uses final Statement baseline", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "R",
      room: "144",
      amount: 770,
      paid: 770,
      due: 770,
      period_due: 770,
      pay_type: "C",
      period_start: "2026-06-05",
      period_end: "2026-07-05"
    },
    {
      type: "TF",
      bed_from: "144",
      bed_to: "145",
      amount: 50,
      fee_status: "paid",
      payment_method: "cash",
      transfer_reason: "customer_request"
    }
  ]);

  assert.match(text, /^HOMELINK LEDGER/m);
  assert.match(text, /Date 0602 Time \d{4}/);
  assert.match(text, /Employee Abdul/);
  assert.match(text, /Core Summary/);
  assert.match(text, /Cash Handover 820/);
  assert.match(text, /\[144\] paid 770 cash \d{4}/);
  assert.match(text, /Transfer Details/);
  assert.match(text, /\[144\]\n\[145\]\ntransfer 50 cash \d{4} customer_request/);
  assert.doesNotMatch(text, /#144|144->145|\[144-145\]/);
  assert.doesNotMatch(text, /Markdown|EID|trace|source_ref|\+971|debug/i);
});

test("Quick Ledger uses formal transfer fields and the shared arrears totals", async () => {
  const text = await buildWhatsappTextWithDrafts(EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS.map(row => structuredClone(row.input)));
  assert.match(text, /Transfer 100/);
  assert.match(text, /Outstanding \/ 本票未收 AED 150/);
  assert.match(text, /Arrears Opened \/ 本票新增欠款 AED 150/);
  assert.match(text, /Arrears Repaid \/ 本票收回欠款 AED 70/);
  assert.match(text, /\[301\]\n\[302\]\ntransfer 50 cash/);
  assert.match(text, /\[303\]\n\[304\]\ntransfer 50 bank/);
  const paidCashBlock = text.slice(text.indexOf("[301]"), text.indexOf("[303]"));
  const paidBankBlock = text.slice(text.indexOf("[303]"), text.indexOf("[305]"));
  assert.doesNotMatch(paidCashBlock, /transfer waived/);
  assert.doesNotMatch(paidBankBlock, /transfer waived/);
});

test("transfer display does not infer waived from a missing generic amount", async () => {
  const paid = await buildWhatsappTextWithDrafts([{ type: "TF", from_bed: "301", to_bed: "302", fee_amount_aed: 50, payment_status: "paid", payment_method: "cash", transfer_reason: "paid" }]);
  const waived = await buildWhatsappTextWithDrafts([{ type: "TF", from_bed: "303", to_bed: "304", fee_amount_aed: 50, payment_status: "waived", payment_method: "none", transfer_reason: "waived" }]);
  const unpaid = await buildWhatsappTextWithDrafts([{ type: "TF", from_bed: "305", to_bed: "306", fee_amount_aed: 50, payment_status: "unpaid", payment_method: "cash", transfer_reason: "unpaid" }]);
  assert.match(paid, /transfer 50 cash/);
  assert.doesNotMatch(paid, /transfer waived/);
  assert.match(paid, /Transfer 50/);
  assert.match(waived, /transfer waived/);
  assert.match(waived, /Transfer 0/);
  assert.match(unpaid, /transfer unpaid 0/);
  assert.match(unpaid, /Transfer 0/);
});

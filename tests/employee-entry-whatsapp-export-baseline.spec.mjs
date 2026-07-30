import test from "node:test";
import assert from "node:assert/strict";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

test("Current Session Preview and Copy use the formal HOMELINK LEDGER format", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "R",
      room: "144",
      amount: 770,
      paid: 770,
      due: 770,
      period_due: 770,
      pay_type: "C",
      created_at: "2026-07-05T22:43:00Z",
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
      created_at: "2026-07-05T22:51:00Z",
      transfer_reason: "customer_request"
    }
  ]);

  assert.match(text, /^HOMELINK LEDGER\nDate 0602 Time \d{4}\nEmployee Abdul/m);
  assert.match(text, /💼 ▬+ 💼\nCore Summary/);
  assert.match(text, /📊 ▬+ 📊\nBreakdown/);
  assert.match(text, /💵 ▬+ 💵\nCash Details/);
  assert.match(text, /\[144\] paid 770 cash 2243/);
  assert.match(text, /🔄 ▬+ 🔄\nTransfer Details/);
  assert.match(text, /\[144\]\n\[145\]\ntransfer 50 cash 2251 customer_request/);
  assert.doesNotMatch(text, /\uFFFD|�/);
  assert.doesNotMatch(text, /#144/);
  assert.doesNotMatch(text, /#144->#145/);
  assert.doesNotMatch(text, /\[144-145\]/);
  assert.doesNotMatch(text, /2026-07-05/);
});

test("Waived Bed Transfer exports as waived zero AED", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "TF",
      bed_from: "144",
      bed_to: "145",
      amount: 0,
      fee_status: "waived",
      payment_method: "none",
      created_at: "2026-07-05T22:52:00Z",
      waiver_reason: "internal_waiver"
    }
  ]);

  assert.match(text, /\[144\]\n\[145\]\ntransfer waived 2252 internal_waiver/);
  assert.doesNotMatch(text, /144->145/);
  assert.doesNotMatch(text, /144-145/);
});

test("Rent short paid WhatsApp export preserves arrears anchor", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "R",
      room: "144",
      amount: 700,
      paid: 700,
      due: 770,
      period_due: 770,
      expected_rent: 770,
      paid_amount: 700,
      arrears_amount: 70,
      arrears_due_date: "2026-06-10",
      arrears_note: "customer pays later",
      pay_type: "C",
      created_at: "2026-07-05T22:43:00Z",
      period_start: "2026-06-05",
      period_end: "2026-07-05",
      reason_code: "SHORT_PAID"
    }
  ]);

  assert.match(text, /\[144\] paid 700 cash 2243 short 70 DUE:0610 \| NOTE:customer pays later/);
  assert.doesNotMatch(text, /expected/);
  assert.doesNotMatch(text, /short_paid/);
  assert.doesNotMatch(text, /2026-06-10/);
});

test("Current text export shows existing O/N customer tags without tagging Expense", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "R",
      tag: "O",
      room: "9113",
      amount: 700,
      paid: 700,
      due: 700,
      period_due: 700,
      pay_type: "C",
      created_at: "2026-07-07T10:00:00Z"
    },
    {
      type: "D",
      tag: "N",
      room: "211",
      amount: 200,
      deposit_amount: 200,
      pay_type: "C",
      created_at: "2026-07-07T10:01:00Z"
    },
    {
      type: "E",
      tag: "O",
      room: "office",
      amount: 50,
      expense_amount: 50,
      expense_desc: "test supplies",
      pay_type: "C",
      created_at: "2026-07-07T10:02:00Z"
    }
  ]);

  assert.match(text, /\[9113\] paid 700 O cash 1000/);
  assert.match(text, /\[211\] deposit 200 N cash 1001/);
  assert.match(text, /\[office\] expense 50 cash 1002 test supplies/);
  assert.doesNotMatch(text, /\[office\] expense 50 O\b/);
  assert.match(text, /Cash Received .* AED 900/);
  assert.match(text, /Expenses .* AED 50/);
  assert.match(text, /Net Funds .* AED 850/);
});

test("Deposit Out and ordinary Expense remain separately classified in the text export", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "DR",
      room: "946",
      amount: 200,
      actual_refund_amount: 200,
      refund_amount: 200,
      refund_reason: "changed location",
      pay_type: "C",
      created_at: "2026-07-25T01:32:00Z"
    },
    {
      type: "E",
      room: "401-103",
      amount: 150,
      expense_amount: 150,
      expense_desc: "AC service",
      pay_type: "C",
      created_at: "2026-07-25T01:33:00Z"
    }
  ]);

  assert.match(text, /Expenses .* AED 350/);
  assert.match(text, /Deposit Refund 200/);
  assert.match(text, /Other Expense 150/);
  assert.match(text, /Deposit Refund Details[\s\S]*\[946\] deposit refund 200 cash 0132 changed location/);
  assert.match(text, /Expense Details[\s\S]*\[401-103\] expense 150 cash 0133 AC service/);
  assert.doesNotMatch(text, /\nExpense 350\n/);
});

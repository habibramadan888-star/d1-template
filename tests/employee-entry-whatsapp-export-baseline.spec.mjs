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

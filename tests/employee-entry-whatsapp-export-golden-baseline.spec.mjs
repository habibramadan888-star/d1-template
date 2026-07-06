import test from "node:test";
import assert from "node:assert/strict";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

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

  assert.match(text, /^Statement/m);
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

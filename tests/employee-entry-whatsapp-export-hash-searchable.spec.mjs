import test from "node:test";
import assert from "node:assert/strict";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

test("Current Session WhatsApp export keeps searchable bracket bed anchors without hash", async () => {
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

  assert.match(text, /\[144\] paid 770 cash 2243/);
  assert.match(text, /\[144\]\n\[145\]\ntransfer 50 cash 2251 customer_request/);
  assert.doesNotMatch(text, /#144/);
  assert.doesNotMatch(text, /144->145/);
});

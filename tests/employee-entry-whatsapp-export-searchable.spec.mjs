import test from "node:test";
import assert from "node:assert/strict";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

test("Current Session WhatsApp export keeps bed numbers searchable", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "R",
      room: "144",
      amount: 770,
      paid: 770,
      due: 770,
      period_due: 770,
      pay_type: "C",
      created_at: "2026-07-05T22:43:00Z"
    },
    {
      type: "TF",
      bed_from: "144",
      bed_to: "145",
      amount: 50,
      fee_status: "paid",
      payment_method: "cash",
      created_at: "2026-07-05T22:51:00Z"
    }
  ]);

  assert.match(text, /\b144\b/);
  assert.match(text, /\[144\] paid/);
  assert.match(text, /\[144\]\n\[145\]\ntransfer 50 cash/);
  assert.doesNotMatch(text, /#144/);
  assert.doesNotMatch(text, /144->145/);
});

test("Current Session WhatsApp export keeps backend transfer aliases searchable", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "TF",
      from_bed: "144",
      to_bed: "145",
      amount: 50,
      fee_status: "paid",
      payment_method: "cash",
      created_at: "2026-07-05T22:51:00Z",
      transfer_reason: "customer_request"
    }
  ]);

  assert.match(text, /\[144\]\n\[145\]\ntransfer 50 cash 2251 customer_request/);
  assert.doesNotMatch(text, /bed->to/);
  assert.doesNotMatch(text, /144->145/);
});

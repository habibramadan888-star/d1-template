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
      pay_type: "C"
    },
    {
      type: "TF",
      bed_from: "144",
      bed_to: "145",
      amount: 50,
      fee_status: "paid",
      payment_method: "cash"
    }
  ]);

  assert.match(text, /#144\b/);
  assert.match(text, /#144->#145/);
  assert.doesNotMatch(text, /#144\s+->\s+#145/);
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
      transfer_reason: "customer_request"
    }
  ]);

  assert.match(text, /#144->#145 bed_transfer 50\.00 cash customer_request/);
  assert.doesNotMatch(text, /bed->to/);
});

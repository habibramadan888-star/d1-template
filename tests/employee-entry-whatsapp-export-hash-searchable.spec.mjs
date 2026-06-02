import test from "node:test";
import assert from "node:assert/strict";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

test("Current Session WhatsApp export keeps searchable beds with bracket anchors and without hash", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "R",
      room: "144",
      amount: 770,
      paid: 770,
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

  assert.match(text, /【144】 144 rent/);
  assert.match(text, /【144-145】 144 145 bed_transfer/);
  assert.doesNotMatch(text, /#144/);
  assert.doesNotMatch(text, /#144->#145/);
});

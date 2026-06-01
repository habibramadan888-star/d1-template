import test from "node:test";
import assert from "node:assert/strict";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

test("Current Session WhatsApp baseline includes compact header and all rows", async () => {
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

  assert.match(text, /^Homelink Entry \| 2026-06-02 \| Abdul/m);
  assert.match(text, /Cash 820\.00 AED \| Bank 0\.00 AED \| Total 820\.00 AED/);
  assert.match(text, /1\. 144 rent 770\.00 cash 2026-06-05 to 2026-07-05/);
  assert.match(text, /2\. 144->145 bed_transfer 50\.00 cash customer_request/);
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
      waiver_reason: "internal_waiver"
    }
  ]);

  assert.match(text, /1\. 144->145 bed_transfer waived 0\.00 none internal_waiver/);
});

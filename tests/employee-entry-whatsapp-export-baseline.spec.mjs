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

  assert.match(text, /^Entry 06\/02 \| Abdul \| 2 records/m);
  assert.match(text, /Cash 820\.00 \| Bank 0\.00 \| Total 820\.00/);
  assert.match(text, /1\. #144 rent 770\.00 cash expected 770\.00 0605-0705/);
  assert.match(text, /2\. #144->#145 bed_transfer 50\.00 cash customer_request/);
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

  assert.match(text, /1\. #144->#145 bed_transfer waived 0\.00 none internal_waiver/);
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
      period_start: "2026-06-05",
      period_end: "2026-07-05",
      reason_code: "SHORT_PAID"
    }
  ]);

  assert.match(
    text,
    /#144 rent 700\.00 cash expected 770\.00 short_paid 70\.00 due 2026-06-10 note customer pays later 0605-0705/
  );
});

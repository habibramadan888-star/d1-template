import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildWhatsappTextWithDrafts,
  ownerMainPath
} from "./helpers/employee-entry-whatsapp-helper.mjs";

test("Current Session WhatsApp export strips internal/debug fields", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "TF",
      bed_from: "144",
      bed_to: "145",
      amount: 50,
      fee_status: "paid",
      payment_method: "cash",
      note: "source_ref abc EID eid-123 trace trace-123 debug yes +971501234567"
    }
  ]);

  assert.doesNotMatch(text, /EID/i);
  assert.doesNotMatch(text, /trace/i);
  assert.doesNotMatch(text, /source_ref/i);
  assert.doesNotMatch(text, /\+971/);
  assert.doesNotMatch(text, /debug/i);
  assert.doesNotMatch(text, /idempotency_key/i);
  assert.doesNotMatch(text, /audit_id/i);
});

test("Owner WhatsApp export remains present", async () => {
  const ownerMain = await readFile(ownerMainPath, "utf8");

  assert.match(ownerMain, /function buildArrearsWhatsAppText/);
  assert.match(ownerMain, /function exportArrearsWhatsApp/);
  assert.match(ownerMain, /WhatsApp 导出/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("arrears payment is not tied to billing period UI", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /const hasPeriod=\['R','TFF'\]\.includes\(type\)/);
  assert.doesNotMatch(html, /\['R','AP','TFF'\]\.includes\(type\)&&\(!\$\(\'periodStart\'\)\.value/);
  assert.match(html, /还欠款只针对云端未清欠款，不使用本期账期/);
  assert.match(html, /该床位暂无未清欠款/);
  assert.match(html, /populateTaskSelect\(\);syncForm\(\);/);
});

test("arrears payment anchor carries source debt and remaining balance", async () => {
  const html = await readFile(htmlPath, "utf8");

  for (const field of [
    "arrears_ref",
    "original_arrears_id",
    "original_arrears_amount",
    "already_paid_amount",
    "payment_amount",
    "remaining_arrears",
    "settlement_status"
  ]) {
    assert.match(html, new RegExp(field));
  }
  assert.match(html, /本次还款不能超过该欠款剩余金额/);
});

test("arrears payment WhatsApp export preserves repayment anchor", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "AP",
      room: "144",
      amount: 70,
      payment_amount: 70,
      pay_type: "C",
      arrears_ref: "task-short-144",
      original_arrears_amount: 770,
      already_paid_amount: 700,
      remaining_arrears: 0,
      settlement_status: "settled",
      note: "paid balance"
    }
  ]);

  assert.match(
    text,
    /\[144\] arrears paid 70 cash \d{4} paid balance/
  );
  assert.match(text, /Arrears Details/);
  assert.doesNotMatch(text, /#144/);
});

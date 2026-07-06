import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildWhatsappTextWithDrafts } from "./helpers/employee-entry-whatsapp-helper.mjs";

const employeePath = "deploy-worker/public/employee-v3.html";

test("Statement export preserves emoji before copy", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "R",
      room: "738",
      amount: 730,
      paid: 730,
      due: 730,
      period_due: 730,
      pay_type: "C",
      created_at: "2026-07-05T22:43:00Z"
    }
  ]);

  assert.match(text, /💼 ▬+ 💼/);
  assert.match(text, /📊 ▬+ 📊/);
  assert.match(text, /💵 ▬+ 💵/);
  assert.match(text, /\[738\] paid 730 cash 2243/);
  assert.doesNotMatch(text, /\uFFFD|�/);
});

test("WhatsApp URL encoding round-trips emoji safely", async () => {
  const text = await buildWhatsappTextWithDrafts([
    {
      type: "TF",
      bed_from: "112",
      bed_to: "111",
      amount: 50,
      fee_status: "paid",
      payment_method: "cash",
      transfer_reason: "management_adjustment",
      created_at: "2026-07-05T22:51:00Z"
    }
  ]);

  const url = "https://wa.me/?text=" + encodeURIComponent(text);
  const decoded = decodeURIComponent(url.split("text=")[1]);
  assert.equal(decoded, text);
  assert.match(decoded, /🔄 ▬+ 🔄/);
  assert.match(decoded, /\[112\]\n\[111\]\ntransfer 50 cash 2251 management_adjustment/);
  assert.doesNotMatch(decoded, /\uFFFD|�/);
});

test("copy and fallback paths guard damaged text and keep raw textarea value", async () => {
  const html = await readFile(employeePath, "utf8");
  const whatsappBlock = html.slice(html.indexOf("function entryWhatsappSafe"), html.indexOf("function previewField"));
  const copyBlock = html.slice(html.indexOf("async function copyEntryWhatsappText"), html.indexOf("function commitSessionAndExport"));

  assert.match(html, /function entryWhatsappHasReplacementChar\(text\)/);
  assert.match(html, /function entryWhatsappAssertTextSafe\(text,context='WhatsApp export'\)/);
  assert.match(html, /if\(!entryWhatsappAssertTextSafe\(text,'WhatsApp export'\)\)return ''/);
  assert.match(html, /if\(!entryWhatsappAssertTextSafe\(text,'WhatsApp copy'\)\)return false/);
  assert.match(html, /if\(!entryWhatsappAssertTextSafe\(text,'WhatsApp fallback'\)\)return/);
  assert.match(html, /textarea\.value=text/);
  assert.doesNotMatch(whatsappBlock + copyBlock, /unescape\(|escape\(|btoa\(|atob\(/);
});

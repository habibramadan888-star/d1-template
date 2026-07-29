import test from "node:test";
import assert from "node:assert/strict";
import { readEmployeeHtml } from "./helpers/employee-entry-whatsapp-helper.mjs";

test("Current Session preview exposes WhatsApp Export action", async () => {
  const html = await readEmployeeHtml();

  assert.match(html, /id="btnWhatsAppSession"/);
  assert.match(html, /WhatsApp Export/);
  assert.match(html, /\$\('btnWhatsAppSession'\)\.onclick=exportEntrySessionWhatsApp/);
});

test("Current Session WhatsApp export copies text and opens WhatsApp with fallback", async () => {
  const html = await readEmployeeHtml();

  assert.match(html, /function exportEntrySessionWhatsApp\(\)/);
  assert.match(html, /navigator\.clipboard\?\.writeText/);
  assert.match(html, /window\.open\(url,'_blank','noopener,noreferrer'\)/);
  assert.match(html, /showEntryWhatsappFallback\(text,url\)/);
  assert.match(html, /https:\/\/wa\.me\/\?text=/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const employeePath = "deploy-worker/public/employee-v3.html";

test("WhatsApp fallback includes English-first copy action and manual text fallback", async () => {
  const html = await readFile(employeePath, "utf8");
  const fallbackBlock = html.slice(html.lastIndexOf("function showEntryWhatsappFallback"));

  assert.match(html, /async function copyEntryWhatsappText\(text,button,textarea\)/);
  assert.match(fallbackBlock, /Copy WhatsApp Text/);
  assert.match(fallbackBlock, /复制 WhatsApp 文本/);
  assert.match(fallbackBlock, /Open WhatsApp/);
  assert.match(fallbackBlock, /entryWhatsappFallbackText/);
  assert.match(fallbackBlock, /textarea\.focus\(\);textarea\.select\(\)/);
});

test("copy action uses clipboard API first and falls back to selected textarea", async () => {
  const html = await readFile(employeePath, "utf8");
  const copyBlock = html.slice(html.lastIndexOf("async function copyEntryWhatsappText"));

  assert.match(copyBlock, /navigator\.clipboard\?\.writeText/);
  assert.match(copyBlock, /await navigator\.clipboard\.writeText\(text\)/);
  assert.match(copyBlock, /textarea\.select\(\)/);
  assert.match(copyBlock, /Copied/);
  assert.match(copyBlock, /已复制/);
});

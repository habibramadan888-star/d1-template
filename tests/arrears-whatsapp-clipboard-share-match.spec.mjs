import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const start = source.lastIndexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("clipboard, WhatsApp share URL, and fallback all use the same text variable", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const exportFn = extractLastFunction(js, "exportArrearsWhatsApp");

  assert.match(exportFn, /const text=buildArrearsWhatsAppText\(rows\)/);
  assert.match(exportFn, /writeText\(text\)/);
  assert.match(exportFn, /encodeURIComponent\(text\)/);
  assert.match(exportFn, /showArrearsWhatsAppFallback\(text,url\)/);
  assert.doesNotMatch(exportFn, /const clipboardText|const shareText|legacyText/);
});

test("fallback modal receives the final text without rebuilding", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const fallback = extractLastFunction(js, "showArrearsWhatsAppFallback");

  assert.match(fallback, /textarea/);
  assert.match(fallback, /esc\(text\)/);
  assert.match(fallback, /href="\$\{esc\(url\)\}"/);
  assert.doesNotMatch(fallback, /buildArrearsWhatsAppText/);
});


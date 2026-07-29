import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
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

test("employee follow-up title sanitizer removes TTLock account phone tokens", async () => {
  const html = await readFile(htmlPath, "utf8");
  const sanitizer = extractFunction(html, "stripTtlockAccountPhoneForEmployee");

  assert.match(sanitizer, /\\\+\?971/);
  assert.match(sanitizer, /\\d\{8,10\}/);
  assert.match(sanitizer, /ttlock_card/);
  assert.match(sanitizer, /source_ref/);
});

test("system reminder card title uses sanitized display title", async () => {
  const html = await readFile(htmlPath, "utf8");
  const title = extractFunction(html, "followupTitle");
  const card = extractFunction(html, "followupCard");

  assert.match(title, /stripTtlockAccountPhoneForEmployee\(item\.lock_remark\|\|item\.tenant_name\|\|''\)/);
  assert.match(card, /const title=followupTitle\(item\)/);
  assert.doesNotMatch(card, /tenant_card_id|source_ref|ttlock_card/);
});

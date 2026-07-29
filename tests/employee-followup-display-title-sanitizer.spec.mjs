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

test("display title sanitizer is UI-only and does not mutate raw TTLock fields", async () => {
  const html = await readFile(htmlPath, "utf8");
  const sanitizer = extractFunction(html, "stripTtlockAccountPhoneForEmployee");
  const title = extractFunction(html, "followupTitle");

  assert.match(sanitizer, /return String\(value\|\|''\)/);
  assert.doesNotMatch(sanitizer, /=\s*.*source_ref/);
  assert.doesNotMatch(sanitizer, /=\s*.*tenant_card_id/);
  assert.match(title, /const bed=String\(item\.bed\|\|''\)\.trim\(\)/);
  assert.match(title, /return \[bed,remark\]\.filter\(Boolean\)/);
});

test("employee UI still keeps raw source fields out of the default system card", async () => {
  const html = await readFile(htmlPath, "utf8");
  const card = extractFunction(html, "followupCard");

  assert.doesNotMatch(card, /\+971/);
  assert.doesNotMatch(card, /source_ref/);
  assert.doesNotMatch(card, /ttlock_card/);
  assert.match(card, /<div class="followup-bed">\$\{esc\(title\)\}<\/div>/);
});

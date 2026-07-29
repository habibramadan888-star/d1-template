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

test("owner arrears cards are collapsed by default with details inside disclosure", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractLastFunction(js, "renderOwnerArrearsTaskCard");

  assert.match(card, /data-owner-arrear-task-card="true"/);
  assert.match(card, /data-owner-arrears-business-title="true"/);
  assert.match(card, /<details class="owner-arrears-card-detail"/);
  assert.match(card, /<summary>展开详情<\/summary>/);
  assert.match(card, /承诺日期/);
  assert.match(card, /备注/);
  assert.match(card, /状态/);
  assert.doesNotMatch(card, /arrearPromiseAmountLabel|promised_amount|promise_amount/i);
  assert.doesNotMatch(card, /ttlock-expired|source_ref|dedupe_key/i);
});

test("main card keeps the business title to bed and amount", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractLastFunction(js, "renderOwnerArrearsTaskCard");

  assert.match(card, /<strong>\$\{bed\}<\/strong><b>｜\$\{amount\}<\/b>/);
  assert.match(card, /arrearBedLabel/);
  assert.match(card, /arrearAmountLabel/);
});

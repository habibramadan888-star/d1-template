import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const argsOpen = source.indexOf("(", start);
  let parenDepth = 0;
  let argsClose = -1;
  for (let i = argsOpen; i < source.length; i += 1) {
    if (source[i] === "(") parenDepth += 1;
    if (source[i] === ")") parenDepth -= 1;
    if (parenDepth === 0) {
      argsClose = i;
      break;
    }
  }
  const open = source.indexOf("{", argsClose);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("owner arrears business title is bed plus amount only", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");
  const bed = extractFunction(js, "arrearBedLabel");
  const amount = extractFunction(js, "arrearAmountLabel");

  assert.match(card, /data-owner-arrears-business-title/);
  assert.match(card, /选择欠款任务 \$\{bed\} \$\{amount\}/);
  assert.doesNotMatch(card, /<strong>\$\{customer\}<\/strong>/);
  assert.doesNotMatch(card, /<span>｜\$\{bed\}<\/span>/);

  assert.match(bed, /roomBed/);
  assert.match(bed, /bedNo|bed_no/);
  assert.match(bed, /roomNo|room_no/);
  assert.match(bed, /床位待确认/);

  assert.match(amount, /Number\.isFinite\(amount\)&&amount>0/);
  assert.match(amount, /金额待确认/);
});

test("TTLock source line uses business language, not technical card type", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const label = extractFunction(js, "arrearSourceLabel");
  const dueLine = extractFunction(js, "arrearDueLine");

  assert.match(label, /ttlock_expired_unpaid/);
  assert.doesNotMatch(dueLine, /ttlock_card|ttlock-expired|source_ref|sourceRef/);
  assert.match(dueLine, /截止待确认/);
});

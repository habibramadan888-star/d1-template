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

test("all arrears sources are included in the owner pool", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const load = extractFunction(js, "loadArrearsForOwner");

  assert.match(load, /historicalArrears:rows/);
  assert.match(load, /currentDueUnpaid:currentDueUnpaidForArrearsPool\(\)/);
  assert.match(load, /ttlockExpiredCards:ttlockExpiredCardsForArrearsPool\(\)/);
});

test("source types map to business labels, including TTLock expired cards", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const labels = extractFunction(js, "arrearSourceLabel");

  assert.match(labels, /historical_arrears:'历史欠款'/);
  assert.match(labels, /current_due_unpaid:'到期未收'/);
  assert.match(labels, /ttlock_expired_card:'通通锁过期'/);
  assert.match(js, /function ttlockExpiredCardsForArrearsPool/);
});

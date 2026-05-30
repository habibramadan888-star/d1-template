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

test("owner arrears loader builds the pool from existing arrears first and TTLock after first paint", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const load = extractFunction(js, "loadArrearsForOwner");

  assert.match(load, /existingArrearsRecords:rows/);
  assert.match(load, /buildArrearsFollowupPool/);
  assert.match(load, /ttlockExpiredUnpaid:ttlockRows/);
  assert.match(load, /setTimeout\(async\(\)=>/);
  assert.doesNotMatch(load, /currentDueUnpaid/);
});

test("source types map to the two approved business labels", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const labels = extractFunction(js, "arrearSourceLabel");

  assert.match(labels, /existing_arrears_record:'系统已有欠款'/);
  assert.match(labels, /ttlock_expired_unpaid:'通通锁到期未付'/);
  assert.doesNotMatch(labels, /current_due_unpaid|到期未收|historical_arrears:'/);
  assert.match(js, /function ttlockExpiredCardsForArrearsPool/);
});

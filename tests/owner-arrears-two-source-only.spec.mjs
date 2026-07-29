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

test("owner arrears pool only admits the two approved source types", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const allowed = extractFunction(js, "isAllowedArrearsSource");
  const labels = extractFunction(js, "arrearSourceLabel");
  const pool = extractFunction(js, "buildArrearsFollowupPool");

  assert.match(allowed, /existing_arrears_record/);
  assert.match(allowed, /ttlock_expired_unpaid/);
  assert.doesNotMatch(allowed, /current_due_unpaid|historical_arrears|unknown/);
  assert.match(labels, /existing_arrears_record:'系统已有欠款'/);
  assert.match(labels, /ttlock_expired_unpaid:'通通锁到期未付'/);
  assert.match(pool, /filter\(isAllowedArrearsSource\)/);
});

test("ttlock expired unpaid rows require a bed rent amount", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const ttlock = extractFunction(js, "ttlockExpiredCardsForArrearsPool");

  assert.match(ttlock, /bedRentAmountForArrears/);
  assert.match(ttlock, /filter\(card=>Number\(bedRentAmountForArrears\(card\)\)>0\)/);
  assert.doesNotMatch(ttlock, /金额待核对/);
});

test("backend boss arrears contract exposes the two-source authority only", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /source_authority:\["existing_arrears_record","ttlock_expired_unpaid"\]/);
  assert.match(worker, /source_type:\/ttlock\/i\.test/);
  assert.match(worker, /empLoadTtlockExpiredUnpaidForArrears/);
  assert.doesNotMatch(worker, /source_authority:\[[^\]]*current_due_unpaid/);
});

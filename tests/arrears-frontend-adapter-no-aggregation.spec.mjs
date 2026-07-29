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

test("frontend arrears pool is an API adapter, not a business source merger", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const adapter = extractFunction(js, "buildArrearsFollowupPool");
  const resultAdapter = extractFunction(js, "buildArrearsFollowupPoolResult");

  assert.match(adapter, /unwrapArrearsSotPayload/);
  assert.match(adapter, /payload\.tasks/);
  assert.doesNotMatch(adapter, /existingArrearsRecords/);
  assert.doesNotMatch(adapter, /historicalArrears/);
  assert.doesNotMatch(adapter, /ttlockExpiredUnpaid/);
  assert.doesNotMatch(adapter, /bedRentAmountForArrears/);
  assert.doesNotMatch(adapter, /const seen=new Set/);
  assert.doesNotMatch(adapter, /arrearsPoolDedupeKey/);

  assert.match(resultAdapter, /summary=payload\.summary/);
  assert.match(resultAdapter, /pagination=payload\.pagination/);
  assert.match(resultAdapter, /payload\.sources/);
  assert.doesNotMatch(resultAdapter, /\.reduce\(/);
  assert.doesNotMatch(resultAdapter, /sourceRows/);
});

test("owner arrears loader fetches the backend SOT only", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const loadExisting = extractFunction(js, "loadExistingArrearsForOwner");
  const load = extractFunction(js, "loadArrearsForOwner");

  assert.match(loadExisting, /\/api\/boss\/arrears\/followup-tasks\?limit=\$\{safeLimit\}/);
  assert.doesNotMatch(loadExisting, /\/api\/arrears\?limit=/);
  assert.doesNotMatch(load, /Promise\.allSettled/);
  assert.doesNotMatch(load, /loadTtlockArrearsForOwner/);
  assert.doesNotMatch(load, /existingArrearsRecords/);
  assert.doesNotMatch(load, /ttlockExpiredUnpaid/);
});

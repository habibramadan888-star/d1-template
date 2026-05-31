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

test("backend owns TTLock bed rent mapping and config-missing reporting", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const mapping = extractFunction(worker, "empTtlockRoomsToExpiredArrears");
  const detailed = extractFunction(worker, "empListMergedArrearTasksDetailed");
  const handler = extractFunction(worker, "handleBossArrearsFollowupTasks");

  assert.match(mapping, /empRentForTtlockCard/);
  assert.match(mapping, /amount_fils:Math\.round\(rent\.amount\*100\)/);
  assert.match(mapping, /missingRent\.push/);
  assert.match(detailed, /config_missing_count:ttlockMissingRent\.length/);
  assert.match(handler, /config_missing_count:configMissingCount/);
});

test("frontend does not map rent or call TTLock while loading owner arrears", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const adapter = extractFunction(js, "buildArrearsFollowupPool");
  const load = extractFunction(js, "loadArrearsForOwner");

  assert.doesNotMatch(adapter, /bedRentAmountForArrears/);
  assert.doesNotMatch(adapter, /rentAmount/);
  assert.doesNotMatch(adapter, /ttlockExpiredCards/);
  assert.doesNotMatch(load, /loadTtlockArrearsForOwner/);
});

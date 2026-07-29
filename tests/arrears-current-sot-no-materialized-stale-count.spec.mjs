import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("current SOT resolver does not use materialized rows or directive counts for TTLock count", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const resolver = extractFunction(worker, "resolveCurrentReceivablesSot");
  const detailed = extractFunction(worker, "empListMergedArrearTasksDetailed");

  assert.doesNotMatch(resolver, /directive/i);
  assert.doesNotMatch(resolver, /materialized/i);
  assert.doesNotMatch(detailed, /empLoadTtlockExpiredUnpaidForArrears/);
  assert.match(detailed, /empLoadTtlockConsoleUnresolvedForArrears/);
  assert.doesNotMatch(resolver, /41|23/);
});

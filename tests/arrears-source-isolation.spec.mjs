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

test("backend records source status independently for existing arrears and TTLock", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const detailed = extractFunction(worker, "empListMergedArrearTasksDetailed");
  const handler = extractFunction(worker, "handleBossArrearsFollowupTasks");

  assert.match(detailed, /source_status=\{/);
  assert.match(detailed, /existing_arrears_record:empSourceStatus/);
  assert.match(detailed, /ttlock_expired_unpaid:empSourceStatus/);
  assert.match(handler, /empSourceContract\(detailed\.source_status\?\.existing_arrears_record/);
  assert.match(handler, /empSourceContract\(detailed\.source_status\?\.ttlock_expired_unpaid/);
});

test("frontend partial failure warning reads backend source contract, not local fallbacks", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const notice = extractFunction(js, "ownerArrearsSourceNotice");
  const load = extractFunction(js, "loadArrearsForOwner");

  assert.match(notice, /existing\.status==='error'/);
  assert.match(notice, /ttlock\.status==='error'/);
  assert.match(load, /state\.arrearsSourceStatus=state\.arrearsPoolResult\.sources/);
  assert.doesNotMatch(load, /clientTtlockRows/);
});

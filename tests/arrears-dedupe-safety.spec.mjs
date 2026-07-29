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

test("backend dedupe is source-aware and reports dropped duplicate count", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const key = extractFunction(worker, "empBossArrearDedupeKey");
  const detailed = extractFunction(worker, "empListMergedArrearTasksDetailed");
  const handler = extractFunction(worker, "handleBossArrearsFollowupTasks");

  assert.match(key, /sourceType/);
  assert.match(key, /sourceRef/);
  assert.match(key, /`\$\{sourceType\}\|\$\{sourceRef\}`/);
  assert.match(detailed, /dedupeDroppedCount\+\+/);
  assert.match(handler, /dedupe_dropped_count:dedupeDroppedCount/);
});

test("frontend adapter no longer performs dedupe", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const adapter = extractFunction(js, "buildArrearsFollowupPool");
  const resultAdapter = extractFunction(js, "buildArrearsFollowupPoolResult");

  assert.doesNotMatch(adapter, /Set\(/);
  assert.doesNotMatch(adapter, /arrearsPoolDedupeKey/);
  assert.doesNotMatch(resultAdapter, /candidateCount/);
});

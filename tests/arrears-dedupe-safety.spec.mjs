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

test("frontend dedupe key is source-aware and cannot collapse TTLock into existing arrears", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const dedupeKey = extractFunction(js, "arrearsPoolDedupeKey");
  const pool = extractFunction(js, "buildArrearsFollowupPool");

  assert.match(dedupeKey, /const sourceType=normalizeArrearsSourceType/);
  assert.match(dedupeKey, /`\$\{sourceType\}\|\$\{sourceRef\}`/);
  assert.match(pool, /const seen=new Set\(\)/);
  assert.match(pool, /seen\.has\(key\)/);
});

test("pool result reports dedupe drops while preserving two-source visibility", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const poolResult = extractFunction(js, "buildArrearsFollowupPoolResult");

  assert.match(poolResult, /dedupe_dropped_count/);
  assert.match(
    poolResult,
    /existing_arrears_record:\{count:sourceRows\.existing_arrears_record\.length/
  );
  assert.match(
    poolResult,
    /ttlock_expired_unpaid:\{count:sourceRows\.ttlock_expired_unpaid\.length/
  );
});

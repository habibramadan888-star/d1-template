import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("comparative owner overview API is read-only and returns required sections", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = extractFunction(worker, "phase0OwnerOverviewComparativeSummary");

  assert.match(worker, /\/api\/owner\/overview\/comparative-summary/);
  assert.match(handler, /comparisons/);
  assert.match(handler, /accounting_separation/);
  assert.match(handler, /occupancy_flow/);
  assert.match(handler, /risk_watch/);
  assert.match(handler, /data_quality/);
  assert.doesNotMatch(handler, /\.run\(/);
  assert.doesNotMatch(handler, /INSERT|UPDATE|DELETE|CREATE\s+TABLE|ALTER\s+TABLE/i);
  assert.match(handler, /PRODUCTION_NO_GO/);
});

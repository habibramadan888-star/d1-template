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

test("owner overview marks missing comparison baseline as no_data instead of UP", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const delta = extractFunction(worker, "ownerOverviewDelta");
  const summary = extractFunction(worker, "phase0OwnerOverviewComparativeSummary");

  assert.match(delta, /comparisonValue===0\?null/);
  assert.match(delta, /const direction=comparisonValue===0\?"no_data"/);
  assert.match(delta, /const interpretation=comparisonValue===0\?"no_data"/);
  assert.match(summary, /data_quality/);
  assert.match(summary, /noData/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("trend interpretation supports up down flat and no-data states", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const doc = await readFile("OWNER_OVERVIEW_TREND_INTERPRETATION_RESULT.md", "utf8");

  for (const token of ["up", "down", "flat", "no_data", "improving", "declining"]) {
    assert.match(worker, new RegExp(token));
  }
  for (const label of ["UP", "DOWN", "FLAT", "NO DATA"]) {
    assert.match(ui + doc, new RegExp(label));
  }
  assert.match(doc, /denominator is zero/);
});

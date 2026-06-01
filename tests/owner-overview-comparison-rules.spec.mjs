import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("comparison windows are explicit and bounded", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const doc = await readFile("OWNER_OVERVIEW_COMPARISON_RULES.md", "utf8");

  for (const fn of [
    "ownerOverviewMonthRange",
    "ownerOverviewQuarterRange",
    "ownerOverviewSameMonthLastYearRange",
    "ownerOverviewSameQuarterLastYearRange"
  ]) {
    assert.match(worker, new RegExp(`function ${fn}\\(`));
  }

  assert.match(doc, /same elapsed day count/);
  assert.match(doc, /Do not generate fake trends/);
});

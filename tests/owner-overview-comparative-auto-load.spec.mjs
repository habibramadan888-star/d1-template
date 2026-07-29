import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview auto-loads comparative cloud summary without manual history action", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ui, /ensureOwnerOverviewComparativeAsync\(\)/);
  assert.match(ui, /setTimeout\(\(\)=>loadOwnerOverviewComparativeSummary\(\),0\)/);
  assert.match(ui, /\/api\/owner\/overview\/comparative-summary\?period=month/);
  assert.match(ui, /renderOwnerOverview\(\)/);
});


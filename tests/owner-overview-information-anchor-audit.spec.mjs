import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview information anchors are documented and preserved", async () => {
  const doc = await readFile("OWNER_OVERVIEW_INFORMATION_ANCHOR_AUDIT.md", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  for (const anchor of [
    "Today received",
    "Outstanding arrears",
    "Action items",
    "Recent handover",
    "Accounting controls",
    "Occupancy flow"
  ]) {
    assert.match(doc, new RegExp(anchor));
  }

  assert.match(js, /ownerOverviewComparativePanel/);
  assert.match(js, /ensureOwnerOverviewComparativeAsync\(\)/);
  assert.match(doc, /PRODUCTION_NO_GO/);
});

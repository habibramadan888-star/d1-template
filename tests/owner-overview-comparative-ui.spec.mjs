import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview UI renders comparative BI sections asynchronously", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /ownerOverviewComparativePanel/);
  assert.match(js, /COMPARATIVE BUSINESS INTELLIGENCE/);
  assert.match(js, /Business Snapshot/);
  assert.match(js, /Accounting Control/);
  assert.match(js, /Occupancy Flow/);
  assert.match(js, /Arrears & Collection/);
  assert.match(js, /Risk Watch/);
  assert.match(js, /\/api\/owner\/overview\/comparative-summary/);
  assert.ok(
    js.indexOf("wrap.innerHTML") < js.indexOf("ensureOwnerOverviewComparativeAsync()"),
    "overview shell must render before comparative async load starts"
  );
});

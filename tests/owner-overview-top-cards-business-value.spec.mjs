import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const start = source.lastIndexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("owner overview active renderer uses current period and cloud arrears cards", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractLastFunction(ui, "renderOwnerOverview");

  for (const label of ["OUTSTANDING COLLECTION", "TODAY ACTIONS", "CURRENT PERIOD RECEIVED", "CLOUD ARREARS COLLECTION"]) {
    assert.match(render, new RegExp(label));
  }
  assert.doesNotMatch(render, /TODAY RECEIVED/);
  assert.doesNotMatch(render, /LATEST HANDOVER/);
  assert.doesNotMatch(render, /MONTH RECEIVED/);
  assert.doesNotMatch(render, /OCCUPANCY NET/);
  assert.match(render, /ownerOverviewCurrentPeriodReceived\(\)/);
  assert.match(render, /ownerOverviewCurrentPeriodRangeLabel\(\)/);
  assert.match(render, /ownerOverviewArrearsCloud\(\)/);
  assert.match(render, /ownerOverviewCloudArrearsCollection\(\)/);
  assert.match(render, /ownerOverviewRiskCloud\(\)/);
});

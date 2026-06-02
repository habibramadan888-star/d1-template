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

test("owner overview top cards use authenticated cloud summary data instead of static zero placeholders", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractLastFunction(ui, "renderOwnerOverview");

  assert.match(render, /ownerOverviewCurrentMonth\(\)/);
  assert.match(render, /ownerOverviewArrearsCloud\(\)/);
  assert.match(render, /ownerOverviewRiskCloud\(\)/);
  assert.match(render, /ownerOverviewFlowCloud\(\)/);
  assert.match(render, /state\.overviewComparativeStatus==='success'\?'来自云端 entry_events':'读取云端中'/);
  assert.doesNotMatch(render, /本月实收[^`]+0/);
});


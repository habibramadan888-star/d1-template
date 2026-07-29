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

test("owner overview contains an async arrears follow-up section", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const overview = extractFunction(js, "renderOwnerOverview");
  const ensure = extractFunction(js, "ensureOwnerOverviewArrearsAsync");
  const panel = extractFunction(js, "renderOwnerOverviewArrearsPanel");

  assert.match(overview, /id="ownerOverviewArrearsPanel"/);
  assert.match(overview, /欠款跟进/);
  assert.match(overview, /ensureOwnerOverviewArrearsAsync\(\)/);
  assert.match(ensure, /setTimeout\(\(\)=>loadArrearsForOwner/);
  assert.match(ensure, /limit:ARREARS_OVERVIEW_PAGE_SIZE/);
  assert.match(panel, /总额/);
  assert.match(panel, /需跟进/);
  assert.match(panel, /系统欠款/);
  assert.match(panel, /通通锁/);
  assert.match(panel, /承诺未回/);
  assert.match(panel, /查看全部/);
  assert.match(panel, /WhatsApp 导出/);
});

test("overview does not block first paint on arrears data", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const overview = extractFunction(js, "renderOwnerOverview");

  assert.doesNotMatch(overview, /await\s+loadArrearsForOwner/);
  assert.doesNotMatch(overview, /await\s+loadHistoricalArrearsForOwner/);
  assert.ok(
    overview.indexOf("wrap.innerHTML") < overview.indexOf("ensureOwnerOverviewArrearsAsync()"),
    "overview shell must render before arrears async load starts"
  );
});

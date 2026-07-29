import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const argsOpen = source.indexOf("(", start);
  let parenDepth = 0;
  let argsClose = -1;
  for (let i = argsOpen; i < source.length; i += 1) {
    if (source[i] === "(") parenDepth += 1;
    if (source[i] === ")") parenDepth -= 1;
    if (parenDepth === 0) {
      argsClose = i;
      break;
    }
  }
  const open = source.indexOf("{", argsClose);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("arrears shell and skeleton render before data fetch completes", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const loading = extractFunction(js, "renderOwnerOverviewArrearsPanel");
  const load = extractFunction(js, "loadArrearsForOwner");

  assert.match(loading, /data-owner-overview-arrears-skeleton="true"/);
  assert.match(loading, /仍在读取，请稍候/);
  assert.match(load, /renderOwnerOverviewArrearsPanel\(\)/);
  assert.ok(
    load.indexOf("renderOwnerOverviewArrearsPanel()") < load.indexOf("loadExistingArrearsForOwner")
  );
});

test("arrears first page has a limit and no duplicate fetch guard regression", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const loadExisting = extractFunction(js, "loadExistingArrearsForOwner");
  const load = extractFunction(js, "loadArrearsForOwner");
  const render = extractFunction(js, "renderArrearsPanel");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(js, /const ARREARS_PAGE_SIZE=20/);
  assert.match(js, /const ARREARS_OVERVIEW_PAGE_SIZE=5/);
  assert.match(loadExisting, /\/api\/boss\/arrears\/followup-tasks\?limit=\$\{safeLimit\}/);
  assert.doesNotMatch(loadExisting, /\/api\/arrears\?limit=/);
  assert.match(loadExisting, /timeoutMs/);
  assert.match(load, /if\(state\.arrearsLoading\)return/);
  assert.match(load, /setTimeout\(\(\)=>/);
  assert.match(render, /slice\(0,visibleLimit\)/);
  assert.match(worker, /function bossArrearsListLimit\(request\)/);
});

test("first paint does not require full history load", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const init = extractFunction(js, "loadAll");

  assert.match(init, /Load cached arrears shell only/);
  assert.doesNotMatch(init, /loadHistoricalArrearsForOwner\(\)/);
  assert.doesNotMatch(init, /refreshArrearsFromCloud\(\)/);
});

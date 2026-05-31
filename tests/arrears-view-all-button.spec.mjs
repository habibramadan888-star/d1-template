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

test("view-all is a deterministic local expand/collapse action", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const toggle = extractFunction(js, "toggleOverviewArrearsAll");

  assert.match(toggle, /state\.arrearsLimit=state\.arrearsExpanded/);
  assert.match(toggle, /!state\.arrearsLoadedFull/);
  assert.match(
    toggle,
    /await loadArrearsForOwner\(\{showLoading:false,limit:ARREARS_PAGE_SIZE\}\)/
  );
  assert.match(toggle, /renderOwnerOverviewArrearsPanel\(\)/);
  assert.match(toggle, /renderArrearsPanel\(\)/);
  assert.doesNotMatch(toggle, /preferCache/);
});

test("overview button label includes total count when collapsed", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const renderer = extractFunction(js, "renderOwnerOverviewArrearsPanel");

  assert.match(renderer, /const viewAllLabel=state\.arrearsExpanded/);
  assert.match(renderer, /查看全部 \$\{sorted\.length\}/);
  assert.match(renderer, /data-owner-arrears-view-all/);
});

test("overview background load uses a full first page, not only the five-card preview", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const ensure = extractFunction(js, "ensureOwnerOverviewArrearsAsync");
  const retry = extractFunction(js, "retryOwnerOverviewArrears");

  assert.match(ensure, /limit:ARREARS_PAGE_SIZE/);
  assert.match(retry, /limit:ARREARS_PAGE_SIZE/);
  assert.doesNotMatch(ensure, /limit:ARREARS_OVERVIEW_PAGE_SIZE/);
  assert.doesNotMatch(retry, /limit:ARREARS_OVERVIEW_PAGE_SIZE/);
});

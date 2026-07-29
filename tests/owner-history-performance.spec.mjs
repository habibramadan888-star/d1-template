import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("history page shows skeleton before network result", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /owner-history-skeleton/);
  assert.match(js, /history-skeleton/);
  assert.match(js, /正在加载最近/);
});

test("history page uses limited first load and load more instead of full blocking render", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /const HISTORY_PAGE_SIZE=20/);
  assert.match(js, /\/api\/history\?limit=/);
  assert.match(js, /btnHistoryLoadMore/);
  assert.match(
    js,
    /state\.historyLimit=\(state\.historyLimit\|\|HISTORY_PAGE_SIZE\)\+HISTORY_PAGE_SIZE/
  );
  assert.doesNotMatch(js, /const r=await apiFetch\('\/api\/history'\);/);
});

test("worker history API supports read-only limit and offset", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const route =
    worker.match(/if \(path === "\/api\/history"\) \{[\s\S]*?return success\(results\);\s*\}/)?.[0] ||
    "";

  assert.match(route, /url\.searchParams\.get\("limit"\)/);
  assert.match(route, /LIMIT \? OFFSET \?/);
  assert.match(route, /SELECT \* FROM sessions/);
  assert.doesNotMatch(route, /\bUPDATE\b|\bINSERT\b|\bDELETE\b|\bDROP\b/i);
});

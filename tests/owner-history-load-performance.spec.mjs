import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("history page renders immediate skeleton and uses timeout feedback", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /owner-history-skeleton/);
  assert.match(js, /const HISTORY_FETCH_TIMEOUT_MS=8000/);
  assert.match(js, /apiFetchWithTimeout/);
  assert.match(js, /owner-history-timeout/);
  assert.match(js, /btnHistoryRetry/);
});

test("history first load is limited to recent records", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /const HISTORY_PAGE_SIZE=20/);
  assert.match(js, /\/api\/history\?limit=\$\{encodeURIComponent\(limit\)\}/);
  assert.match(js, /btnHistoryLoadMore/);
  assert.doesNotMatch(js, /apiFetch\('\/api\/history'\)/);
});

test("worker history route is read-only and does not run schema mutation on GET", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const route =
    worker.match(
      /if \(path === "\/api\/history"\) \{[\s\S]*?return json\(results\);\n    \}/
    )?.[0] || "";

  assert.match(route, /empTableExists\(env,"sessions"\)/);
  assert.doesNotMatch(route, /empEnsureSchema\(env\)/);
  assert.match(route, /LIMIT \? OFFSET \?/);
  assert.doesNotMatch(route, /\bUPDATE\b|\bINSERT\b|\bDELETE\b|\bDROP\b|\bALTER\b|\bCREATE\b/i);
});

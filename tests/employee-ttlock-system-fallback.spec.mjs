import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
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

test("employee TTLock endpoint falls back to materialized cache instead of surfacing live 503", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = extractFunction(worker, "handleEmployeeLockCards");
  const fallback = extractFunction(worker, "empLoadLockCardsWithCacheFallback");

  assert.match(worker, /function empCachedTtlockTaskRows/);
  assert.match(worker, /function empCachedTtlockRoomsDataFromTasks/);
  assert.match(handler, /empLoadLockCardsWithCacheFallback/);
  assert.match(handler, /data_source/);
  assert.match(fallback, /materialized_cache/);
  assert.match(fallback, /fallback_reason/);
  assert.doesNotMatch(handler, /const result=await loadLockCards\(env\)/);
});

test("employee System SOT uses materialized TTLock cache when live TTLock fails", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const resolver = extractFunction(worker, "resolveConsoleReceivablesSot");
  const cachedRows = extractFunction(worker, "empCachedTtlockRowsForConsoleSot");

  assert.match(resolver, /empCachedTtlockRowsForConsoleSot/);
  assert.match(resolver, /cacheFallbackStatus/);
  assert.match(cachedRows, /materialized_cache/);
  assert.match(cachedRows, /console_status="overdue"/);
  assert.match(cachedRows, /byStatus\.overdue\.push/);
});

test("employee UI distinguishes live TTLock and cached TTLock states", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const renderStatus = extractFunction(html, "renderEntryTtlockStatus");
  const loadLock = extractFunction(html, "loadLockFinal");

  assert.match(renderStatus, /Using TTLock cache \/ 使用通通锁缓存/);
  assert.match(loadLock, /data\.data_source/);
  assert.match(loadLock, /materialized_cache/);
  assert.match(loadLock, /Using TTLock cache/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

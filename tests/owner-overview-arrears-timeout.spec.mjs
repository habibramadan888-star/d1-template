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

test("arrears API calls use limit and bounded timeout budgets", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const loadHistorical = extractFunction(js, "loadHistoricalArrearsForOwner");
  const lockHydration = extractFunction(js, "ensureOwnerLockCardsForArrearsPool");

  assert.match(loadHistorical, /limit=ARREARS_PAGE_SIZE/);
  assert.match(loadHistorical, /timeoutMs=ARREARS_FETCH_TIMEOUT_MS/);
  assert.match(loadHistorical, /safeLimit/);
  assert.match(loadHistorical, /\/api\/arrears\/followup\/tasks\?limit=\$\{safeLimit\}/);
  assert.match(loadHistorical, /\/api\/arrears\?limit=\$\{safeLimit\}/);
  assert.match(loadHistorical, /Math\.min\(6500,remaining\(\)\)/);
  assert.match(loadHistorical, /TimeoutError/);
  assert.match(lockHydration, /apiFetchWithTimeout/);
  assert.match(lockHydration, /3000/);
});

test("timeout and error states are isolated inside the arrears overview module", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const panel = extractFunction(js, "renderOwnerOverviewArrearsPanel");

  assert.match(panel, /欠款模块失败不会影响总览其他模块/);
  assert.match(panel, /读取超时，请重试/);
  assert.match(panel, /欠款数据加载失败，请重试/);
  assert.match(panel, /data-owner-overview-arrears-error="true"/);
});

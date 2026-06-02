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

test("console receivables SOT directly follows owner console current view", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const resolver = extractFunction(worker, "resolveConsoleReceivablesSot");
  const compat = extractFunction(worker, "resolveCurrentReceivablesSot");

  assert.match(worker, /function consoleSotStatus/);
  assert.match(worker, /function consoleSotRowsFromLockCards/);
  assert.match(resolver, /loadLockCards\(env\)/);
  assert.match(resolver, /consoleSotRowsFromLockCards/);
  assert.match(resolver, /source:"owner_console_current_view"/);
  assert.match(resolver, /source_function:"cp_getStatus_cp_computeMetrics"/);
  assert.match(resolver, /overdue_count/);
  assert.match(resolver, /due_today_count/);
  assert.match(resolver, /due_soon_count/);
  assert.match(compat, /return resolveConsoleReceivablesSot\(env,user,opts\)/);
  assert.doesNotMatch(resolver, /owner_console_unresolved_missing/);
  assert.match(resolver, /production_cutover:"PRODUCTION_NO_GO"/);
});

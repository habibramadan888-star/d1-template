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

test("owner arrears read paths use console SOT resolver and expose status counts", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const boss = extractFunction(worker, "handleBossArrearsFollowupTasks");

  assert.match(worker, /\/api\/owner\/console-receivables-sot/);
  assert.match(worker, /return success\(await resolveConsoleReceivablesSot/);
  assert.match(boss, /resolveCurrentReceivablesSot/);
  assert.match(boss, /overdue_count/);
  assert.match(boss, /due_today_count/);
  assert.match(boss, /due_soon_count/);
  assert.match(boss, /outstanding_amount_fils/);
});

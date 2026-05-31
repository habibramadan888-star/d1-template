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

test("backend exposes the boss arrears SOT route and final response contract", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = extractFunction(worker, "handleBossArrearsFollowupTasks");

  assert.match(worker, /\/api\/boss\/arrears\/followup-tasks/);
  assert.match(worker, /\/api\/arrears\/followup\/tasks/);
  assert.match(handler, /summary:\{/);
  assert.match(handler, /promised_unpaid_count:promisedUnpaidCount/);
  assert.match(handler, /config_missing_count:configMissingCount/);
  assert.match(handler, /dedupe_dropped_count:dedupeDroppedCount/);
  assert.match(handler, /preview_tasks:previewTasks/);
  assert.match(handler, /tasks:pageTasks/);
  assert.match(handler, /pagination/);
  assert.match(handler, /sources/);
});

test("backend contract keeps list, pagination, and source status under server authority", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const params = extractFunction(worker, "bossArrearsListParams");
  const handler = extractFunction(worker, "handleBossArrearsFollowupTasks");
  const sourceContract = extractFunction(worker, "empSourceContract");

  assert.match(params, /offset/);
  assert.match(params, /previewLimit/);
  assert.match(handler, /const fullTasks=detailed\.mapped/);
  assert.match(
    handler,
    /const pageTasks=fullTasks\.slice\(params\.offset,params\.offset\+params\.limit\)/
  );
  assert.match(handler, /total_count:detailed\.total_count/);
  assert.match(handler, /has_more:params\.offset\+params\.limit<detailed\.total_count/);
  assert.match(sourceContract, /status:ok\?"ok":"error"/);
  assert.match(sourceContract, /error_code/);
});

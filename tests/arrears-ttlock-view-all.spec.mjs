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

test("backend TTLock rows are returned in all_tasks and source counts", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = extractFunction(worker, "handleBossArrearsFollowupTasks");

  assert.match(handler, /const ttlockTasks=detailed\.mapped\.filter/);
  assert.match(handler, /ttlock_expired_unpaid:\{count:ttlockTasks\.length,tasks:ttlockTasks\}/);
  assert.match(handler, /all_tasks:detailed\.mapped/);
});

test("frontend accepts backend TTLock rows with bed-rent-mapped amounts", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const pool = extractFunction(js, "buildArrearsFollowupPool");

  assert.match(pool, /backendAmount/);
  assert.match(pool, /backendMapped/);
  assert.match(pool, /bed_rent_mapping/);
  assert.match(pool, /ttlockExpiredUnpaid/);
});

test("overview view-all button exposes the complete loaded TTLock list", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const toggle = extractFunction(js, "toggleOverviewArrearsAll");
  const renderer = extractFunction(js, "renderOwnerOverviewArrearsPanel");

  assert.match(toggle, /state\.arrearsExpanded=!state\.arrearsExpanded/);
  assert.match(toggle, /ownerArrearsActiveRows\(\)\.length/);
  assert.match(renderer, /data-owner-arrears-total-count/);
  assert.match(renderer, /data-owner-arrears-view-all/);
});

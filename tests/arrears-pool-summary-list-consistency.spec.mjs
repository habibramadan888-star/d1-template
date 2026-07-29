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

test("backend returns one explicit summary/preview/full-list arrears contract", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = extractFunction(worker, "handleBossArrearsFollowupTasks");

  assert.match(handler, /summary:/);
  assert.match(handler, /all_tasks:detailed\.mapped/);
  assert.match(handler, /preview_tasks:previewTasks/);
  assert.match(handler, /sources:/);
  assert.match(handler, /total_count:detailed\.total_count/);
  assert.match(handler, /visible_preview_count:previewTasks\.length/);
});

test("owner overview displays visible count and total count from the full pool", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const loader = extractFunction(js, "loadExistingArrearsForOwner");
  const renderer = extractFunction(js, "renderOwnerOverviewArrearsPanel");

  assert.match(loader, /\['all_tasks','tasks','arrears'\]/);
  assert.match(renderer, /data-owner-arrears-visible-count/);
  assert.match(renderer, /data-owner-arrears-total-count/);
  assert.match(renderer, /data-owner-arrears-preview-count/);
  assert.match(renderer, /viewAllLabel/);
});

test("frontend pool result computes summary, preview_tasks, all_tasks from the same array", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const poolResult = extractFunction(js, "buildArrearsFollowupPoolResult");

  assert.match(poolResult, /const allTasks=buildArrearsFollowupPool/);
  assert.match(poolResult, /summary:/);
  assert.match(poolResult, /preview_tasks:allTasks\.slice/);
  assert.match(poolResult, /all_tasks:allTasks/);
  assert.match(poolResult, /has_more:allTasks\.length>previewLimit/);
});

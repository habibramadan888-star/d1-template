import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}(`);
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

test("owner directive API resolves selected IDs from persisted rows and boss SOT", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const fn = extractFunction(worker, "handleBossArrearsDirectives");

  assert.match(fn, /empResolveBossSotTaskMap/);
  assert.match(fn, /materializeArrearsTaskFromSot/);
  assert.match(fn, /materialization_version:"v1"/);
  assert.match(fn, /requested_count/);
  assert.match(fn, /materialized_count/);
  assert.match(fn, /skipped_already_assigned_count/);
  assert.match(fn, /blocked_count/);
  assert.match(fn, /created_task_ids/);
});

test("owner directive API blocks unsafe mixed source batches before assignment", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const fn = extractFunction(worker, "handleBossArrearsDirectives");

  assert.match(fn, /if\(blocked\.length\)/);
  assert.match(fn, /all_or_nothing:true/);
  assert.match(fn, /materialization_blocked/);
  assert.match(fn, /not_found_in_boss_sot/);
});

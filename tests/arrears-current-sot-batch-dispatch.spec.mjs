import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("current SOT batch dispatch remains write-gated and reports real counts", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /if\(!arrearsDirectiveWriteApproved\(env\)\)return arrearsDirectiveApprovalRequired/);
  assert.match(worker, /requested_count:uniqueIds\.length/);
  assert.match(worker, /created_count:createdCount/);
  assert.match(worker, /skipped_already_assigned_count:skippedDuplicateCount/);
  assert.match(worker, /blocked_count:notFound\.length/);
  assert.match(worker, /created_task_ids:createdTaskIds/);
});

test("production cutover remains no-go", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

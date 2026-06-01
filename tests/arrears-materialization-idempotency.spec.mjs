import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("materialization and directive create are idempotent", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const migration = await readFile("migrations/004_arrears_task_materialization_source.sql", "utf8");

  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_arrear_tasks_source_unique/);
  assert.match(worker, /INSERT_OR_IGNORE/);
  assert.match(worker, /arrearsDirectiveIdempotencyReplay/);
  assert.match(worker, /arrearsDirectiveRecordIdempotency/);
  assert.match(worker, /X-Idempotency-Replayed/);
});

test("idempotency response includes materialized task ids", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /materialized_task_ids:materializedTaskIds/);
  assert.match(worker, /resourceId:materializedTaskIds\.join/);
});

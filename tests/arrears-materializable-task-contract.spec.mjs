import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("materializable arrears task contract supports existing and TTLock sources", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const migration = await readFile("migrations/004_arrears_task_materialization_source.sql", "utf8");

  assert.match(worker, /function empMaterializableTaskContract/);
  assert.match(worker, /function empNormalizeMaterializedSourceType/);
  assert.match(worker, /existing_arrears_record/);
  assert.match(worker, /ttlock_expired_unpaid/);

  for (const field of [
    "stable_task_id",
    "source_type",
    "source_ref",
    "source_fingerprint",
    "room_bed",
    "customer_code",
    "amount_fils",
    "due_date",
    "overdue_days",
    "idempotency_scope"
  ]) {
    assert.match(worker, new RegExp(field));
  }

  assert.match(migration, /source_type TEXT/);
  assert.match(migration, /source_ref TEXT/);
  assert.match(migration, /source_fingerprint TEXT/);
  assert.match(migration, /materialized_from TEXT/);
});

test("unstable TTLock source references are blocked before write", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /BLOCKED_TASK_ID_UNSTABLE/);
  assert.match(worker, /BLOCKED_MISSING_REQUIRED_FIELDS/);
  assert.match(worker, /materialization_blocked/);
});

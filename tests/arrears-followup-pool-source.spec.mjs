import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildArrearsFollowupPool } from "../modules/finance/arrears-followup-pool.mjs";
import { arrearsFollowupPoolFixture } from "./fixtures/arrears-followup-pool.fixture.mjs";

test("arrears follow-up pool only includes existing arrears and TTLock expired unpaid", () => {
  const pool = buildArrearsFollowupPool(arrearsFollowupPoolFixture, { today: "2026-05-30" });
  const sourceTypes = new Set(pool.map((row) => row.sourceType));

  assert.equal(pool.length, 2);
  assert.deepEqual([...sourceTypes].sort(), ["existing_arrears_record", "ttlock_expired_unpaid"]);
  assert.equal(sourceTypes.has("current_due_unpaid"), false);
  assert.equal(sourceTypes.has("unsupported_arrears_source"), false);
});

test("TTLock expired unpaid rows use bed rent amount and missing-rent rows stay out of default pool", () => {
  const pool = buildArrearsFollowupPool(arrearsFollowupPoolFixture, { today: "2026-05-30" });
  const ttlock = pool.find((row) => row.sourceType === "ttlock_expired_unpaid");

  assert.ok(ttlock);
  assert.equal(ttlock.remain, 630);
  assert.equal(ttlock.amountAuthorityStatus, "bed_rent_mapping");
  assert.equal(
    pool.some((row) => row.room === "702 / 5"),
    false
  );
});

test("closed existing arrears are excluded and random customer rows are ignored", () => {
  const pool = buildArrearsFollowupPool(
    {
      ...arrearsFollowupPoolFixture,
      existingArrearsRecords: [
        ...arrearsFollowupPoolFixture.existingArrearsRecords,
        ...arrearsFollowupPoolFixture.unknownSourceRows
      ]
    },
    { today: "2026-05-30" }
  );

  assert.equal(
    pool.some((row) => row.taskId === "hist-closed"),
    false
  );
  assert.equal(
    pool.some((row) => row.id === "unknown-001"),
    false
  );
});

test("owner frontend uses the same two-source names and visibly calls buildArrearsFollowupPool", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /function buildArrearsFollowupPool/);
  assert.match(js, /existingArrearsRecords/);
  assert.match(js, /ttlockExpiredCardsForArrearsPool/);
  assert.match(js, /ttlock_expired_unpaid/);
  assert.doesNotMatch(js, /currentDueUnpaidForArrearsPool/);
});

test("commercial launch gate remains PRODUCTION_NO_GO", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");

  assert.match(gate, /COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO/);
  assert.match(gate, /Overall: `PRODUCTION_NO_GO`/);
});

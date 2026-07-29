import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildArrearsFollowupPool } from "../modules/finance/arrears-followup-pool.mjs";

const fixture = {
  existingArrearsRecords: [
    {
      id: "existing-1",
      source: "arrear_tasks",
      room: "3-103",
      tenant_card_id: "325",
      remain: 630,
      due_date: "2026-05-07"
    }
  ],
  currentDueUnpaid: [
    {
      id: "current-1",
      source: "current_due_unpaid",
      room: "3-104",
      remaining: 700,
      dueDate: "2026-05-08"
    }
  ],
  ttlockExpiredCards: [
    {
      source: "ttlock_expired_card",
      room: "6-126",
      cardName: "641",
      dueDate: "2026-05-01",
      bedRentAmount: 880
    },
    {
      source: "ttlock_expired_card",
      room: "6-127",
      cardName: "642",
      dueDate: "2026-05-01"
    }
  ],
  unknownRows: [
    {
      source_type: "random_customer_record",
      room: "debug-1",
      remain: 999,
      due_date: "2026-05-01"
    }
  ]
};

test("only existing arrears and TTLock expired unpaid enter the default arrears pool", () => {
  const pool = buildArrearsFollowupPool(
    {
      ...fixture,
      existingArrearsRecords: [...fixture.existingArrearsRecords, ...fixture.unknownRows]
    },
    { today: "2026-05-31" }
  );

  assert.deepEqual([...new Set(pool.map((row) => row.sourceType))].sort(), [
    "existing_arrears_record",
    "ttlock_expired_unpaid"
  ]);
  assert.equal(
    pool.some((row) => row.sourceType === "current_due_unpaid"),
    false
  );
  assert.equal(
    pool.some((row) => row.room === "debug-1"),
    false
  );
});

test("TTLock expired unpaid uses bed rent and missing rent is excluded from default list", () => {
  const pool = buildArrearsFollowupPool(fixture, { today: "2026-05-31" });
  const ttlock = pool.find((row) => row.sourceType === "ttlock_expired_unpaid");

  assert.ok(ttlock);
  assert.equal(ttlock.remain, 880);
  assert.equal(
    pool.some((row) => row.room === "6-127"),
    false
  );
  assert.equal(
    pool.some((row) => row.remain === null),
    false
  );
});

test("owner frontend locks source labels to the final two-source model", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");

  assert.match(js, /existing_arrears_record:'系统已有欠款'/);
  assert.match(js, /ttlock_expired_unpaid:'通通锁到期未付'/);
  assert.doesNotMatch(js, /currentDueUnpaidForArrearsPool|到期未收/);
  assert.match(worker, /source_authority:\["existing_arrears_record","ttlock_expired_unpaid"\]/);
  assert.match(gate, /COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO/);
});

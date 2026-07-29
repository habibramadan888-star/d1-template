import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildArrearsFollowupPool } from "../modules/finance/arrears-followup-pool.mjs";

test("TTLock card without bed rent is excluded from default arrears total", () => {
  const pool = buildArrearsFollowupPool(
    {
      ttlockExpiredCards: [
        { room: "1-102", cardName: "102 D100", dueDate: "2026-05-01" },
        { room: "2-219", cardName: "219 D100", dueDate: "2026-05-01", bedRentAmount: 700 }
      ]
    },
    { today: "2026-05-31" }
  );

  assert.equal(pool.length, 1);
  assert.equal(pool[0].room, "2-219");
  assert.equal(pool[0].remain, 700);
});

test("backend rent lookup supports bed, lock room, and room-bed keys", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /function empRentLookupKeys/);
  assert.match(worker, /\$\{room\}-\$\{bedKey\}/);
  assert.match(worker, /\$\{room\}\/\$\{bedKey\}/);
  assert.match(worker, /\$\{room\} \/ \$\{bedKey\}/);
  assert.match(worker, /missing_rent_count/);
});

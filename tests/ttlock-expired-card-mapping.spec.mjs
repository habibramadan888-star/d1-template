import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildArrearsFollowupPool } from "../modules/finance/arrears-followup-pool.mjs";

test("TTLock expired card maps to arrears task fields with bed-rent authority", () => {
  const pool = buildArrearsFollowupPool(
    {
      ttlockExpiredCards: [
        {
          room: "8-202",
          cardName: "325 D100 0520",
          dueDate: "2026-05-01",
          sourceRef: "card-325",
          bedRentAmount: 630
        }
      ]
    },
    { today: "2026-05-31" }
  );

  assert.equal(pool.length, 1);
  assert.equal(pool[0].sourceType, "ttlock_expired_unpaid");
  assert.equal(pool[0].sourceRef, "card-325");
  assert.equal(pool[0].roomBed, "8-202");
  assert.equal(pool[0].remain, 630);
  assert.equal(pool[0].amountAuthorityStatus, "bed_rent_mapping");
  assert.equal(pool[0].accountingStatus, "open");
});

test("backend mapping marks TTLock amount as bed-rent mapping, not TTLock amount", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /source_type:"ttlock_expired_unpaid"/);
  assert.match(worker, /amount_source:"bed_rent_mapping"/);
  assert.match(worker, /amount_authority_status:"bed_rent_mapping"/);
  assert.match(worker, /accounting_status:"unverified"/);
});

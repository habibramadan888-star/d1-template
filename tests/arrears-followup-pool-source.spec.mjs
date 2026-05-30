import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildArrearsFollowupPool } from "../modules/finance/arrears-followup-pool.mjs";
import { arrearsFollowupPoolFixture } from "./fixtures/arrears-followup-pool.fixture.mjs";

test("arrears follow-up pool includes historical, current-due, and TTLock expired-card sources", () => {
  const pool = buildArrearsFollowupPool(arrearsFollowupPoolFixture, { today: "2026-05-30" });
  const sourceTypes = new Set(pool.map((row) => row.sourceType));

  assert.equal(pool.length, 3);
  assert.ok(sourceTypes.has("historical_arrears"));
  assert.ok(sourceTypes.has("current_due_unpaid"));
  assert.ok(sourceTypes.has("ttlock_expired_card"));
});

test("TTLock expired-card tasks remain in pool even when amount authority is unknown", () => {
  const pool = buildArrearsFollowupPool(arrearsFollowupPoolFixture, { today: "2026-05-30" });
  const ttlock = pool.find((row) => row.sourceType === "ttlock_expired_card");

  assert.ok(ttlock);
  assert.equal(ttlock.remain, null);
  assert.equal(ttlock.amountAuthorityStatus, "unknown");
  assert.match(ttlock.note, /金额待核对/);
});

test("closed historical arrears are excluded but unpaid current-due rows are retained", () => {
  const pool = buildArrearsFollowupPool(arrearsFollowupPoolFixture, { today: "2026-05-30" });

  assert.equal(
    pool.some((row) => row.taskId === "hist-closed"),
    false
  );
  assert.equal(
    pool.some((row) => row.sourceType === "current_due_unpaid" && row.remain === 700),
    true
  );
});

test("owner frontend uses the same source names and visibly calls buildArrearsFollowupPool", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /function buildArrearsFollowupPool/);
  assert.match(js, /historicalArrears/);
  assert.match(js, /currentDueUnpaid/);
  assert.match(js, /ttlockExpiredCards/);
  assert.match(js, /ttlock_expired_card/);
});

test("commercial launch gate remains PRODUCTION_NO_GO", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");

  assert.match(gate, /COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO/);
  assert.match(gate, /Overall: `PRODUCTION_NO_GO`/);
});

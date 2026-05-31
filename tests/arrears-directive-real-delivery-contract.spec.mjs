import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("real directive delivery model is defined but production writes stay gated", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const approval = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");

  assert.match(worker, /function arrearsDirectiveWriteApproved\(env\)/);
  assert.match(worker, /ARREARS_DIRECTIVE_WRITE_APPROVED/);
  assert.match(worker, /ARREARS_DIRECTIVE_WRITE_MODE/);
  assert.match(worker, /function arrearsDirectiveApprovalRequired/);
  assert.match(worker, /production_write_approval_required/);
  assert.match(worker, /handleBossArrearsDirectives/);
  assert.match(worker, /handleEmployeeArrearsDirectives/);
  assert.match(worker, /handleEmployeeArrearsDirectiveFollowup/);
  assert.match(approval, /PRODUCTION_NO_GO/);
});

test("directive lifecycle statuses are locked", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  for (const status of [
    "assigned",
    "viewed",
    "promised",
    "followed_up",
    "needs_review",
    "closed",
    "cancelled"
  ]) {
    assert.match(worker, new RegExp(`"${status}"`));
  }
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview current period received card is backed by owner-visible sessions", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(ui, /ownerOverviewCurrentPeriodReceived/);
  assert.match(ui, /CURRENT PERIOD RECEIVED/);
  assert.match(ui, /ownerOverviewCurrentPeriodRangeLabel/);
  assert.doesNotMatch(ui, /MONTH RECEIVED/);
  assert.match(worker, /function ownerOverviewBillingPeriodRange/);
  assert.match(worker, /function ownerOverviewFetchSessionPeriodSummary/);
  assert.match(worker, /current_period_received:currentPeriodReceived/);
  assert.match(worker, /source_table:"sessions"/);
  assert.match(worker, /owner_visible_sessions_summary/);
  assert.doesNotMatch(worker, /current_period_received:\{\.\.\.billingPeriod/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview current period received uses owner-visible session summaries", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(worker, /function ownerOverviewBillingPeriodRange/);
  assert.match(worker, /if\(p\.d<3\)/);
  assert.match(worker, /Date\.UTC\(year,month-1,3\)/);
  assert.match(worker, /Date\.UTC\(startYear,startMonth,3\)/);
  assert.match(worker, /function ownerOverviewFetchSessionPeriodSummary/);
  assert.match(worker, /FROM sessions WHERE corpid=\?/);
  assert.match(worker, /export_text, entries_json FROM sessions/);
  assert.match(worker, /COALESCE\(voided_at,''\)=''/);
  assert.match(worker, /COALESCE\(handover_status,''\)<>'VOID'/);
  assert.match(worker, /current_period_received:currentPeriodReceived/);
  assert.match(worker, /billing_period_3_to_2_owner_visible_sessions/);
  assert.match(worker, /owner_history_projection_snapshot/);
  assert.match(worker, /projectRawHeldSessionReadModel\(row\)/);
  assert.match(worker, /rawHeld\?\.ok\?rawHeld\.total_received/);
  assert.match(worker, /active_owner_history_raw_held_session/);
  assert.match(worker, /active_owner_history_sessions_including_raw_held/);
  const periodSummary=worker.slice(worker.indexOf("async function ownerOverviewFetchSessionPeriodSummary"),worker.indexOf("__name(ownerOverviewFetchSessionPeriodSummary"));
  assert.doesNotMatch(periodSummary, /source==="employee_entry_raw_held"/);
  assert.doesNotMatch(periodSummary, /RAW_ACCEPTED_HELD_FOR_REVIEW/);
  assert.match(worker, /const lightweightPeriods=\[-5,-4,-3,-2,-1,0\]/);
  const summaryHandler=worker.slice(worker.indexOf("async function phase0OwnerOverviewComparativeSummary"),worker.indexOf("__name(phase0OwnerOverviewComparativeSummary"));
  assert.ok(
    summaryHandler.indexOf('rule:"owner_history_projection_snapshot"') < summaryHandler.indexOf('resolveCurrentReceivablesSot(env,user'),
    "lightweight history response must return before expensive TTLock and projection work"
  );
  assert.doesNotMatch(worker, /current_period_received:\{\.\.\.billingPeriod/);
  assert.match(ui, /CURRENT PERIOD RECEIVED/);
  assert.match(ui, /ownerOverviewCurrentPeriodReceived/);
});

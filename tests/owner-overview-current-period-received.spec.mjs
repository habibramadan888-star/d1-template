import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview current period received uses 3rd to 2nd billing range", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(worker, /function ownerOverviewBillingPeriodRange/);
  assert.match(worker, /if\(p\.d<3\)/);
  assert.match(worker, /Date\.UTC\(year,month-1,3\)/);
  assert.match(worker, /Date\.UTC\(startYear,startMonth,3\)/);
  assert.match(worker, /current_billing_period:currentBillingPeriod/);
  assert.match(worker, /current_period_received:\{\.\.\.billingPeriod,range:currentBillingPeriod,rule:"billing_period_3_to_2"\}/);
  assert.match(ui, /Current Period Received|CURRENT PERIOD RECEIVED/);
  assert.match(ui, /Billing period 3rd → 2nd/);
});

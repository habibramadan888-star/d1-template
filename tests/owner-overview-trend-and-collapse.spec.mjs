import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview uses real billing-period statement trend without fake zero points", async () => {
  const worker=await readFile("deploy-worker/src/index.js","utf8");
  const ui=await readFile("deploy-worker/public/index-51-main.js","utf8");
  assert.match(worker,/billing_period_trend:billingPeriodTrend/);
  assert.match(worker,/!summary\.rows_checked\|\|ownerOverviewMoney\(summary\.gross_received\)<=0/);
  assert.match(ui,/function ownerOverviewBillingPeriodTrendChart/);
  assert.match(ui,/账期实收趋势/);
  assert.match(ui,/不使用缺失数据补零/);
  assert.doesNotMatch(ui.slice(ui.lastIndexOf("function renderOwnerOverviewComparativePanel"),ui.indexOf("async function loadOwnerOverviewComparativeSummary")),/data-owner-overview-accounting-separation|data-owner-bed-transfer-records|data-owner-overview-arrears-collection|data-owner-overview-risk-watch/);
});

test("large owner overview detail modules are collapsed by default", async () => {
  const ui=await readFile("deploy-worker/public/index-51-main.js","utf8");
  const active=ui.slice(ui.lastIndexOf("function renderOwnerOverview()"),ui.indexOf("/* ── ANALYSIS IMPORT"));
  assert.match(active,/<details class="card hl-card owner-overview-section"[\s\S]*换床财务生命周期/);
  assert.match(active,/<details class="card hl-card owner-overview-section"[\s\S]*欠款跟进/);
  assert.doesNotMatch(active,/card-title">异常提醒/);
});

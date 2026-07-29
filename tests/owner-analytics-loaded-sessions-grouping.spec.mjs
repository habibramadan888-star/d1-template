import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () => readFile("deploy-worker/public/index-51-main.js", "utf8");

function fnLast(js, name) {
  const start = js.lastIndexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const brace = js.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < js.length; i += 1) {
    if (js[i] === "{") depth += 1;
    if (js[i] === "}") depth -= 1;
    if (depth === 0) return js.slice(start, i + 1);
  }
  throw new Error(`could not extract ${name}`);
}

test("loaded analysis sessions render as billing-period groups, not flat chips", async () => {
  const js = await source();
  const render = fnLast(js, "renderAnalysisChips");

  assert.match(js, /function analysisLoadedPeriodInfo\(dateValue\)/);
  assert.match(js, /function analysisLoadedGroups\(\)/);
  assert.match(render, /analysis-loaded-groups/);
  assert.match(render, /data-analysis-period=/);
  assert.match(render, /移除本账期/);
  assert.match(render, /移除当天/);
  assert.match(render, /data-analysis-session-remove/);
  assert.match(render, /清空全部/);
  assert.doesNotMatch(render, /class="chip/);
});

test("loaded session grouping uses 3rd-to-2nd billing period helper", async () => {
  const js = await source();
  const info = fnLast(js, "analysisLoadedPeriodInfo");

  assert.match(info, /getClientCreditBillingPeriod/);
  assert.match(info, /2,0,0,0/);
  assert.match(info, /账期/);
});

test("period, date, and single-session removals recompute analysis immediately", async () => {
  const js = await source();
  const remove = fnLast(js, "analysisRemoveAnchors");
  const render = fnLast(js, "renderAnalysisChips");

  assert.match(remove, /saveAnalysis\(\)/);
  assert.match(remove, /renderFilterControls\(\)/);
  assert.match(remove, /renderAnalysis\(\)/);
  assert.match(render, /data-analysis-period-remove/);
  assert.match(render, /data-analysis-date-remove/);
  assert.match(render, /data-analysis-session-remove/);
  assert.match(render, /confirm\(`移除 \$\{g\.info\.label\}/);
  assert.match(render, /confirm\(`移除 \$\{date\}/);
});

test("loaded group summary includes session count, transaction count, and gross income", async () => {
  const js = await source();
  const groups = fnLast(js, "analysisLoadedGroups");
  const gross = fnLast(js, "analysisSessionGross");
  const render = fnLast(js, "renderAnalysisChips");

  assert.match(gross, /totals/);
  assert.match(gross, /cashIn/);
  assert.match(gross, /bankIn/);
  assert.match(groups, /entries/);
  assert.match(groups, /gross/);
  assert.match(render, /总收入 \$\{fmtMoney\(g\.gross\)\} AED/);
});

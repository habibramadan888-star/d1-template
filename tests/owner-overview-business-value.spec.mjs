import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("overview page contains business-relevant owner sections", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const overview = js.match(/function renderOwnerOverview\(\)\{[\s\S]*?\n\}/)?.[0] || js;

  for (const text of [
    "今日实收",
    "待收尾款",
    "今日待处理",
    "最近交接",
    "异常提醒",
    "最近流水摘要",
    "快速进入"
  ]) {
    assert.match(overview, new RegExp(text));
  }
  assert.match(overview, /待接入/);
  assert.match(overview, /switchView\('history'\)/);
  assert.match(overview, /switchView\('clients'\)/);
  assert.match(overview, /switchView\('analysis'\)/);
});

test("overview redesign does not change dashboard formulas", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /const totalDue =r\(ie\.reduce/);
  assert.match(js, /const totalPaid=r\(ie\.reduce/);
  assert.match(js, /const totalDef =r\(ie\.reduce/);
  assert.match(js, /const netIncome=t\.total/);
});

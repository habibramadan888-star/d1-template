import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("analysis is driven only by paginated cloud history", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");

  assert.match(ui, /dateMode:'billing'/);
  assert.match(ui, /state\.analysisSessions=\[\]/);
  assert.match(ui, /function refreshAnalysisFromHistory\(\)/);
  assert.match(ui, /\/api\/history\?limit=30&offset=\$\{offset\}/);
  assert.match(ui, /state\.analysisSessions=dedupSessions\(loaded\)/);
  assert.match(ui, /if\(state\.dateMode==='billing'\)return analysisLoadedPeriodInfo\(d\)\.current/);
  assert.match(html, /data-mode="billing"/);
  assert.match(html, /data-mode="all"/);
  assert.match(html, /data-mode="range"/);
  assert.match(html, /class="import-panel" style="display:none" aria-hidden="true"/);
});

test("analysis shows only core statistical outputs", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = ui.slice(ui.indexOf("function renderAnalysis(){"), ui.indexOf("function dList(", ui.indexOf("function renderAnalysis(){")));

  for (const label of ["总收入", "现金收入", "银行收入", "总支出", "现金净额", "净资金增加", "记录数", "收入与支出趋势"]) {
    assert.match(render, new RegExp(label));
  }
  for (const removed of ["逐会话对比", "人员变动", "所有交易明细", "平均每次交接"]) {
    assert.doesNotMatch(render, new RegExp(removed));
  }
});

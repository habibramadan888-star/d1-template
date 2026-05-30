import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("owner overview does not render QUICK ACTIONS or quick-entry shortcuts", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const overview = extractFunction(js, "renderOwnerOverview");

  assert.doesNotMatch(overview, /QUICK ACTIONS/i);
  assert.doesNotMatch(overview, /快速进入/);
  assert.doesNotMatch(overview, /历史快捷按钮|客户快捷按钮|分析快捷按钮|网络快捷按钮/);
  assert.doesNotMatch(overview, /data-quick-action|quick-action|quickActions/i);
});

test("owner overview keeps only business summary sections, not duplicate nav buttons", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const overview = extractFunction(js, "renderOwnerOverview");

  for (const required of [
    "今日实收",
    "待收尾款",
    "今日待处理",
    "最近交接",
    "异常提醒",
    "最近会话",
    "最近流水摘要"
  ]) {
    assert.match(overview, new RegExp(required));
  }

  for (const forbidden of ["ADD ENTRY", "录入收款", "录入押金", "作废"]) {
    assert.doesNotMatch(overview, new RegExp(forbidden));
  }
});

test("top navigation still exposes real owner modules outside overview shortcuts", async () => {
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");

  for (const view of ["overview", "arrears", "history", "analysis", "clients", "wifi"]) {
    assert.match(html, new RegExp(`data-view="${view}"`));
  }
});

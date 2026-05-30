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

test("owner arrears page renders complete follow-up information pool", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractFunction(js, "renderArrearsPanel");

  for (const required of [
    "欠款管理",
    "ARREARS FOLLOW-UP",
    "待下发",
    "跟进中",
    "承诺逾期",
    "待核对",
    "欠款任务列表",
    "下发员工",
    "WhatsApp 导出",
    "筛选状态",
    "客户编号",
    "房间/床位",
    "逾期天数",
    "套餐/卡片",
    "任务状态",
    "负责人",
    "承诺还款日期",
    "最近备注",
    "老板审核动作",
    "data-owner-arrears-info-pool",
    "data-owner-arrear-task-card",
    "data-owner-review-action"
  ]) {
    assert.match(render, new RegExp(required));
  }
});

test("owner arrears main list does not render raw debug field labels or write shortcuts", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractFunction(js, "renderArrearsPanel");

  for (const forbidden of [
    "directive:",
    "promise:",
    "staff:",
    "录入收款</button>",
    "录入押金</button>",
    "作废</button>"
  ]) {
    assert.doesNotMatch(render, new RegExp(forbidden));
  }
});

test("commercial launch gate remains PRODUCTION_NO_GO", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");

  assert.match(gate, /COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO/);
  assert.match(gate, /Overall: `PRODUCTION_NO_GO`/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const argsOpen = source.indexOf("(", start);
  let parenDepth = 0;
  let argsClose = -1;
  for (let i = argsOpen; i < source.length; i += 1) {
    if (source[i] === "(") parenDepth += 1;
    if (source[i] === ")") parenDepth -= 1;
    if (parenDepth === 0) {
      argsClose = i;
      break;
    }
  }
  const open = source.indexOf("{", argsClose);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("owner arrears loader builds a unified follow-up pool from all required sources", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const load = extractFunction(js, "loadArrearsForOwner");

  assert.match(load, /loadHistoricalArrearsForOwner/);
  assert.match(load, /buildArrearsFollowupPool/);
  assert.match(load, /currentDueUnpaidForArrearsPool/);
  assert.match(load, /ttlockExpiredCardsForArrearsPool/);
  assert.match(load, /ensureOwnerLockCardsForArrearsPool/);
});

test("owner arrears cards expose source type and unknown TTLock amount review state", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractFunction(js, "renderArrearsPanel");

  for (const required of [
    "data-owner-arrears-info-pool",
    "data-owner-arrear-task-card",
    "arrear-task-card",
    "来源类型",
    "arrearSourceLabel",
    "金额待核对",
    "客户编号",
    "房间/床位",
    "逾期天数",
    "套餐/卡片",
    "任务状态",
    "负责人",
    "承诺还款日期",
    "最近备注"
  ]) {
    assert.match(render, new RegExp(required));
  }
  assert.match(js, /ttlock_expired_card/);
  assert.match(js, /通通锁过期/);
});

test("owner arrears main list does not reintroduce debug labels or direct write shortcuts", async () => {
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

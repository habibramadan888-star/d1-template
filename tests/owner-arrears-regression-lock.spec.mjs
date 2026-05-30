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

test("owner arrears cards expose business source labels and unknown TTLock amount review state", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractFunction(js, "renderArrearsPanel");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");
  const amountLabel = extractFunction(js, "arrearAmountLabel");

  for (const required of [
    "data-owner-arrears-info-pool",
    "data-owner-arrears-card-list",
    "renderOwnerArrearsTaskCard"
  ]) {
    assert.match(render, new RegExp(required));
  }

  for (const required of [
    "data-owner-arrear-task-card",
    "owner-arrears-task-card",
    "arrearAmountLabel",
    "来源",
    "状态",
    "负责人",
    "承诺还款",
    "备注"
  ]) {
    assert.match(card, new RegExp(required));
  }
  assert.match(amountLabel, /金额待核对/);
  assert.match(js, /ttlock_expired_card/);
  assert.match(js, /通通锁过期/);
});

test("owner arrears main list does not reintroduce debug labels or direct write shortcuts", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractFunction(js, "renderArrearsPanel");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  for (const source of [render, card]) {
    for (const forbidden of [
      "directive:",
      "promise:",
      "staff:",
      "Overdue: promised",
      "录入收款</button>",
      "录入押金</button>",
      "作废</button>"
    ]) {
      assert.doesNotMatch(source, new RegExp(forbidden));
    }
  }
});

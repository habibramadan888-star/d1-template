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

test("owner arrears loader avoids duplicate fetches and keeps TTLock aggregation off first paint", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const load = extractFunction(js, "loadArrearsForOwner");

  assert.match(load, /if\(state\.arrearsLoading\)return/);
  assert.match(load, /showArrearsLoading\(\)/);
  assert.match(load, /loadHistoricalArrearsForOwner/);
  assert.match(load, /setTimeout\(async\(\)=>/);
  assert.match(load, /ensureOwnerLockCardsForArrearsPool/);
  assert.doesNotMatch(load, /currentDueUnpaidForArrearsPool/);
});

test("owner arrears cards expose only final business labels and no unknown amount state", async () => {
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
    "hist-card owner-arrears-task-card",
    "arrearAmountLabel",
    "承诺金额",
    "承诺日期",
    "备注",
    "状态"
  ]) {
    assert.match(card, new RegExp(required));
  }
  assert.doesNotMatch(amountLabel, /金额待核对/);
  assert.match(js, /ttlock_expired_unpaid/);
  assert.match(js, /通通锁到期未付/);
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
      "作废</button>",
      "source_type",
      "followup_status"
    ]) {
      assert.doesNotMatch(source, new RegExp(forbidden, "i"));
    }
  }
});

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
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");
  const dueLine = extractFunction(js, "arrearDueLine");

  for (const required of [
    "欠款管理",
    "ARREARS FOLLOW-UP",
    "待跟进",
    "已承诺",
    "待核对",
    "欠款任务列表",
    "下发员工",
    "WhatsApp 导出",
    "筛选状态",
    "data-owner-arrears-info-pool",
    "data-owner-arrears-card-list"
  ]) {
    assert.match(render, new RegExp(required));
  }

  for (const required of [
    "owner-arrears-identity",
    "arrearCustomerLabel",
    "arrearBedLabel",
    "arrearAmountLabel",
    "arrearDueLine",
    "来源",
    "状态",
    "负责人",
    "承诺还款",
    "备注",
    "data-owner-arrear-task-card"
  ]) {
    assert.match(card, new RegExp(required));
  }
  assert.match(dueLine, /逾期/);
});

test("owner arrears main list does not render raw debug labels or direct write shortcuts", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractFunction(js, "renderArrearsPanel");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  for (const source of [render, card]) {
    for (const forbidden of [
      "directive:",
      "promise:",
      "staff:",
      "录入收款</button>",
      "录入押金</button>",
      "作废</button>"
    ]) {
      assert.doesNotMatch(source, new RegExp(forbidden));
    }
  }
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("arrears export uses accounting-friendly summary-first format", async () => {
  const js = await readFile("deploy-worker/public/index-51-cp.js", "utf8");

  assert.match(js, /function cp_buildArrearsReport/);
  assert.match(js, /青旅｜\$\{title\}/);
  assert.match(js, /生成时间：/);
  assert.match(js, /总计：\$\{list\.length\} 人/);
  assert.match(js, /一、逾期汇总/);
  assert.match(js, /逾期 1-7 天/);
  assert.match(js, /逾期 8-14 天/);
  assert.match(js, /逾期 15 天以上/);
  assert.match(js, /二、明细/);
});

test("arrears export contains required details without ASCII box art or empty update fields", async () => {
  const js = await readFile("deploy-worker/public/index-51-cp.js", "utf8");
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");

  assert.match(js, /房间\/床位：/);
  assert.match(js, /租客\/卡片：/);
  assert.match(js, /截止日期：/);
  assert.match(js, /逾期天数：/);
  assert.match(js, /金额未接入/);
  assert.doesNotMatch(js, /cp_buildRoomBox/);
  assert.doesNotMatch(js, /update:/);
  assert.doesNotMatch(js, /╔|╚|║/);
  assert.match(readiness, /PRODUCTION_NO_GO/);
});

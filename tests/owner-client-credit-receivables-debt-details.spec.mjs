import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () => readFile("deploy-worker/public/index-51-main.js", "utf8");

function fn(js, name) {
  const start = js.indexOf(`function ${name}`);
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

test("client credit reads TTLock loaded state and exposes recompute", async () => {
  const js = await source();

  assert.match(js, /function ccTtlockStatus\(\)/);
  assert.match(js, /TTLock \$\{tt\.loaded\?'已加载':'未加载'\}/);
  assert.match(js, /cards.*rooms/s);
  assert.match(js, /function ccEnsureClientData\(force=false\)/);
  assert.match(js, /typeof cp_loadAll==='function'/);
  assert.match(js, /function ccRecomputeClientCredit\(\)/);
  assert.match(js, /重新计算/);
});

test("client page auto-loads client credit source data before rendering", async () => {
  const js = await source();
  const open = fn(js, "ccOpenView");

  assert.match(open, /ccShowLoading\(\)/);
  assert.match(open, /await ccEnsureClientData\(false\)/);
  assert.match(open, /ccRender\(true\)/);
});

test("unpaid debt card opens searchable glass detail modal", async () => {
  const js = await source();

  assert.match(js, /function ccDebtRows\(\)/);
  assert.match(js, /function ccOutstandingDebtSummary\(\)/);
  assert.match(js, /onclick="ccOpenDebtDetailModal\(\)"/);
  assert.match(js, /function ccOpenDebtDetailModal\(\)/);
  assert.match(js, /未缴清欠款明细/);
  assert.match(js, /id="ccDebtSearch"/);
  assert.match(js, /id="ccDebtSort"/);
  assert.match(js, /按金额/);
  assert.match(js, /暂无欠款明细/);
  assert.match(js, /function ccCloseDebtDetailModal\(\)/);
});

test("debt detail rows include business evidence and can open payment chain", async () => {
  const js = await source();
  const rows = fn(js, "ccDebtRows");
  const render = fn(js, "ccRenderDebtDetailRows");

  assert.match(rows, /monthly/);
  assert.match(rows, /paid/);
  assert.match(rows, /remain/);
  assert.match(rows, /lastPayment/);
  assert.match(rows, /ttlockEnd/);
  assert.match(render, /月租/);
  assert.match(render, /已收/);
  assert.match(render, /未缴/);
  assert.match(render, /最近收款/);
  assert.match(render, /TTLock/);
  assert.match(js, /function ccOpenDebtEvidence\(bed\)/);
  assert.match(js, /rc_openPaymentContinuityModal\(bed\)/);
});

test("rent continuity still owns its original check path", async () => {
  const js = await source();
  const rc = fn(js, "rc_cardContinuityRun");

  assert.match(rc, /const period=getBillingPeriod\(\)/);
  assert.doesNotMatch(rc, /getClientCreditBillingPeriod/);
});

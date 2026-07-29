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

function fnLast(js, name) {
  const start = js.lastIndexOf(`function ${name}`);
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

test("client credit auto-loads shared owner core read data", async () => {
  const js = await source();
  const shell = fn(js, "showOwnerAppShell");
  const open = fn(js, "ccOpenView");

  assert.match(js, /function ensureOwnerCoreReadData\(\{force=false,reason=''\}=\{\}\)/);
  assert.match(js, /function ownerHydrateHistoryForClientCredit\(force=false\)/);
  assert.match(js, /OWNER_CORE_HISTORY_AUTOLOAD_LIMIT/);
  assert.match(js, /await updateHistCount\(\)/);
  assert.match(js, /typeof cp_loadAll==='function'/);
  assert.match(js, /正在加载历史流水/);
  assert.match(js, /正在加载 TTLock/);
  assert.match(js, /正在计算客户信用/);
  assert.match(shell, /ensureOwnerCoreReadData\(\{force:false,reason:'owner_app_open'\}\)/);
  assert.match(open, /ccShowLoading\(\)/);
  assert.match(open, /await ccEnsureClientData\(false\)/);
  assert.match(open, /ccRender\(true\)/);
});

test("client credit exposes manual reload of core data", async () => {
  const js = await source();

  assert.match(js, /function ccRecomputeClientCredit\(\)/);
  assert.match(js, /ccEnsureClientData\(true\)/);
  assert.match(js, /重新加载核心数据/);
});

test("historical arrears are derived from ledger signals, not current receivables", async () => {
  const js = await source();
  const rows = fnLast(js, "ccDebtRows");
  const ledger = fnLast(js, "ccBuildHistoricalArrearsLedger");

  assert.match(js, /function ccExplicitHistoricalArrearsAmount\(e\)/);
  assert.match(js, /function ccHistoricalArrearsRepaymentAmount\(e\)/);
  assert.match(js, /欠租\|欠款\|差额\|short\|deficit/);
  assert.match(js, /was\\s\+balance\\s\+from\\s\+rent/);
  assert.match(ledger, /rc_allLedgerSessions\(\)/);
  assert.doesNotMatch(rows, /state\.arrears/);
  assert.match(rows, /ccBuildHistoricalArrearsLedger\(\)\.open/);
  assert.match(rows, /历史尾款\/欠款未结清/);
});

test("historical debt detail modal is searchable and shows arrears ledger evidence", async () => {
  const js = await source();
  const render = fnLast(js, "ccRenderDebtDetailRows");

  assert.match(js, /function ccOpenDebtDetailModal\(\)/);
  assert.match(js, /历史尾款\/欠款未结清明细/);
  assert.match(js, /id="ccDebtSearch"/);
  assert.match(js, /id="ccDebtSort"/);
  assert.match(js, /按金额/);
  assert.match(js, /暂无历史尾款\/欠款未清明细/);
  assert.match(render, /原欠款日期/);
  assert.match(render, /原欠款/);
  assert.match(render, /已补/);
  assert.match(render, /剩余未清/);
  assert.match(render, /原始流水行/);
  assert.match(js, /function ccOpenDebtEvidence\(bed\)/);
  assert.match(js, /rc_openPaymentContinuityModal\(bed\)/);
});

test("rent continuity still owns its original check path", async () => {
  const js = await source();
  const rc = fn(js, "rc_cardContinuityRun");

  assert.match(rc, /const period=getBillingPeriod\(\)/);
  assert.doesNotMatch(rc, /getClientCreditBillingPeriod/);
});

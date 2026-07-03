import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () => readFile("deploy-worker/public/index-51-main.js", "utf8");

function functionBody(sourceText, name) {
  const start = sourceText.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const next = sourceText.indexOf("\nfunction ", start + 10);
  return sourceText.slice(start, next === -1 ? undefined : next);
}

test("rent continuity table renders payment continuity chips", async () => {
  const js = await source();

  assert.match(js, /付款连续性/);
  assert.match(js, /function rc_buildBedPaymentContinuityIndex\(sessions\)/);
  assert.match(js, /function rc_renderPaymentContinuity\(card\)/);
  assert.match(js, /function rc_openPaymentContinuityModal\(bed\)/);
  assert.match(js, /_rcPaymentContinuityIndex=rc_buildBedPaymentContinuityIndex\(sessions\)/);
  assert.match(js, /rc_renderPaymentContinuity\(c\)/);
  assert.match(js, /rc-pay-chip-\$\{s\.tone\}/);
  assert.match(js, /tone:'red'/);
  assert.match(js, /tone=\(hasBalance\|\|short\)\?'yellow':'green'/);
});

test("payment continuity uses loaded ledger sessions without per-bed API calls", async () => {
  const js = await source();
  const body = functionBody(js, "rc_buildBedPaymentContinuityIndex");

  assert.match(body, /\(sessions\|\|\[\]\)\.forEach/);
  assert.doesNotMatch(body, /apiFetch|fetch\(/);
  assert.match(body, /rc_normBedKey\(e\.room\)/);
  assert.match(body, /rc_entryRentPaid\(e\)/);
});

test("payment continuity detail keeps balance evidence without treating balance date as coverage end", async () => {
  const js = await source();

  assert.match(js, /尾款\/balance/);
  assert.match(js, /尾款场景：本月合计/);
  assert.match(js, /尾款补交日期不作为覆盖截止日/);
  assert.match(js, /覆盖期待人工核对/);
  assert.match(js, /TTLock 截止/);
});

test("missing ledger handling remains available after adding payment continuity", async () => {
  const js = await source();

  assert.match(js, /function rc_openResolveModal\(rkey,bed,cardName,amount\)/);
  assert.match(js, /const actionBtn=isResolvable/);
  assert.match(js, /rc_openResolveModal\(/);
  assert.match(js, /rc_closeResolveModal/);
});

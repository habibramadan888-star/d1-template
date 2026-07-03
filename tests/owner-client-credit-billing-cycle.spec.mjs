import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () => readFile("deploy-worker/public/index-51-main.js", "utf8");

function extractFunction(sourceText, name) {
  const start = sourceText.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const brace = sourceText.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < sourceText.length; i += 1) {
    if (sourceText[i] === "{") depth += 1;
    if (sourceText[i] === "}") depth -= 1;
    if (depth === 0) return sourceText.slice(start, i + 1);
  }
  throw new Error(`could not extract ${name}`);
}

test("client credit billing period uses 3rd-to-2nd cycle", async () => {
  const js = await source();
  const fnSource = `${extractFunction(js, "getClientCreditBillingPeriod")}; return getClientCreditBillingPeriod;`;
  const getClientCreditBillingPeriod = new Function(fnSource)();

  const july2 = getClientCreditBillingPeriod(new Date("2026-07-02T12:00:00+04:00"));
  assert.equal(july2.label, "2026年6月账期");
  assert.equal(july2.startStr, "6月3日");
  assert.equal(july2.endStr, "7月2日");
  assert.ok(new Date("2026-07-02T12:00:00+04:00") >= july2.start);
  assert.ok(new Date("2026-07-02T12:00:00+04:00") < july2.end);

  const july3 = getClientCreditBillingPeriod(new Date("2026-07-03T00:00:00+04:00"));
  assert.equal(july3.label, "2026年7月账期");
  assert.equal(july3.startStr, "7月3日");
  assert.equal(july3.endStr, "8月2日");
  assert.ok(new Date("2026-07-02T23:59:59+04:00") < july3.start);
});

test("client credit widget uses dedicated billing period while rent continuity remains unchanged", async () => {
  const js = await source();

  assert.match(js, /const p=targetId==='billingWidget2'\?getClientCreditBillingPeriod\(\):getBillingPeriod\(\)/);
  const rcPeriod = extractFunction(js, "rc_periodSessions");
  assert.match(rcPeriod, /const p=getBillingPeriod\(\)/);
  assert.doesNotMatch(rcPeriod, /getClientCreditBillingPeriod/);
});

test("client page opens with loading state and forced recompute", async () => {
  const js = await source();

  assert.match(js, /function ccShowLoading\(\)/);
  assert.match(js, /正在计算客户信用档案/);
  assert.match(js, /function ccOpenView\(\)/);
  assert.match(js, /requestAnimationFrame\(\(\)=>ccRender\(true\)\)/);
  assert.match(js, /if\(v==='clients'\)\{ccOpenView\(\);\}/);
});

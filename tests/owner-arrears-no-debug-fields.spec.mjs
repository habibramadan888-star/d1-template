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

test("owner arrears render path has no raw debug labels", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractFunction(js, "renderArrearsPanel");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");
  const promiseAmount = extractFunction(js, "arrearPromiseAmountLabel");
  const promiseDate = extractFunction(js, "arrearPromiseDateLabel");
  const followupNote = extractFunction(js, "arrearFollowupNoteLabel");

  for (const source of [render, card]) {
    assert.doesNotMatch(source, />\s*(directive|promise|staff|source)\s*:/i);
    assert.doesNotMatch(source, /source_type|followup_status|accounting_status/);
    assert.doesNotMatch(source, /Overdue: promised/i);
    assert.doesNotMatch(source, />\s*(none|undefined|null)\s*</i);
    assert.doesNotMatch(source, /debug/i);
  }

  for (const required of ["承诺金额", "承诺日期", "备注", "状态"]) {
    assert.match(card, new RegExp(required));
  }
  assert.match(`${promiseAmount}\n${promiseDate}`, /未填写/);
  assert.match(followupNote, /暂无/);
});

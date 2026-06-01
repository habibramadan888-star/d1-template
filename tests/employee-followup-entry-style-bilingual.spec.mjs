import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const signature = `function ${name}(`;
  const start = source.lastIndexOf(signature);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("employee Follow-up uses short English-first bilingual copy", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");
  const status = extractLastFunction(html, "employeeDirectiveStatusLabel");

  for (const phrase of [
    "Entry",
    "Follow-up",
    "Logout",
    "Bed / 床位",
    "Amount / 金额",
    "Due Date / 截止日期",
    "Saved / 已保存",
    "Submit Feedback / 提交反馈",
    "Expand Details / 展开详情"
  ]) {
    assert.match(html + card + status, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("final directive card does not keep long instructional copy", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.doesNotMatch(card, /你只要填写承诺付款日期和跟进备注/);
  assert.doesNotMatch(card, /金额不可在这里修改/);
  assert.match(card, /Only update promise date and note/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

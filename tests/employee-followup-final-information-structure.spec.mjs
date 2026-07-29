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

test("Follow-up page keeps the final two-module information architecture", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /Follow-up \/ 跟进/);
  assert.match(html, /Boss tasks \+ system reminders \/ 老板下发任务 \+ 系统提醒/);
  assert.match(html, /Boss Assigned Tasks \/ 老板下发任务/);
  assert.match(html, /System Reminders \/ 系统提醒/);
});

test("Boss directive default card shows only task execution essentials", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.match(card, /Bed \/ 床位/);
  assert.match(card, /Amount \/ 金额/);
  assert.match(card, /Due Date \/ 截止日期/);
  assert.match(card, /directiveStatus_/);
  assert.match(card, /data-toggle-directive-details/);
});

test("Expanded card contains only date, note, boss note, source, and submit state", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.match(card, /Promise Date \/ 承诺日期/);
  assert.match(card, /Note \/ 备注/);
  assert.match(card, /Boss Note \/ 老板备注/);
  assert.match(card, /Source \/ 来源/);
  assert.doesNotMatch(card, /promised_amount|amount_fils|close|void/i);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

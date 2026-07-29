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

test("boss assigned task summary keeps only execution-critical fields", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.match(card, /data-directive-card-collapsed="true"/);
  assert.match(card, /Bed \/ 床位/);
  assert.match(card, /followup-money/);
  assert.match(card, /Boss Assigned \/ 老板下发/);
  assert.match(card, /Due Date \/ 截止日期/);
  assert.match(card, /Not overdue \/ 未逾期|Overdue/);
  assert.match(card, /directiveStatus_/);
  assert.doesNotMatch(card, /customer_code/);
  assert.doesNotMatch(card, /directive_id|source_ref|dedupe_key/i);
});

test("boss assigned task card removes non-actionable helper/source/boss-note content", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.doesNotMatch(card, /Only update promise date and note/);
  assert.doesNotMatch(card, /Source \/ 来源/);
  assert.doesNotMatch(card, /Boss Note \/ 老板备注/);
  assert.doesNotMatch(card, /employee-directive-hint/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

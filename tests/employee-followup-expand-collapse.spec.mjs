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

test("directive card has explicit expand and collapse controls", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");
  const bind = extractLastFunction(html, "bindEmployeeDirectiveActions");

  assert.match(card, /Expand Details \/ 展开详情/);
  assert.match(bind, /data-toggle-directive-details/);
  assert.match(bind, /Collapse Details \/ 收起详情/);
  assert.match(bind, /details\.hidden=!open/);
  assert.match(bind, /aria-expanded/);
});

test("expanded detail keeps write fields limited to date and note", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.match(card, /Promise Date \/ 承诺日期/);
  assert.match(card, /Note \/ 备注/);
  assert.doesNotMatch(card, /promised_amount_fils|amount_fils|actual_received|close|void/i);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

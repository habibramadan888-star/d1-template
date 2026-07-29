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

test("boss directive card defaults to minimal task execution fields", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.match(card, /data-directive-card-collapsed="true"/);
  assert.match(card, /Bed \/ 床位/);
  assert.match(card, /Due Date \/ 截止日期/);
  assert.match(card, /followup-money/);
  assert.match(card, /directiveStatus_/);
  assert.match(card, /data-toggle-directive-details/);
});

test("default card does not expose inputs until details are expanded", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.match(card, /employee-directive-details"[^>]*hidden/);
  assert.match(card, /Promise Date \/ 承诺日期/);
  assert.match(card, /Note \/ 备注/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

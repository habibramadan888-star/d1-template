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

test("Follow-up page uses the Entry page shell, panel, card, and action tokens", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /id="view-entry"/);
  assert.match(html, /id="view-arrears" class="hidden employee-followup-view employee-panel"/);
  assert.match(html, /class="card employee-panel-card"/);
  assert.match(html, /class="btn primary employee-action-button" id="btnRefreshTasks"/);
  assert.match(html, /\.employee-followup-view \.card\{border-radius:var\(--r2\)\}/);
  assert.match(html, /\.employee-followup-view \.head\{padding:22px 26px\}/);
});

test("Follow-up directive cards reuse Entry card structure instead of a separate style system", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.match(card, /employee-directive-card employee-card step/);
  assert.match(card, /employee-directive-summary/);
  assert.match(card, /followup-money" aria-label="Amount \/ 金额"/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

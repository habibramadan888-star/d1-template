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

test("Follow-up view switching uses the same active tab feedback as Entry", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const switcher = extractLastFunction(html, "showEmployeeView");

  assert.match(switcher, /classList\.toggle\('active'/);
  assert.match(switcher, /\['entry','arrears'\]/);
  assert.match(switcher, /loadEmployeeArrearsDirectives\(true\)/);
  assert.match(switcher, /loadTasks\(true\)/);
});

test("Follow-up expand/collapse and inputs keep Entry-style controls", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const bind = extractLastFunction(html, "bindEmployeeDirectiveActions");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.match(bind, /data-toggle-directive-details/);
  assert.match(bind, /details\.hidden=!open/);
  assert.match(bind, /aria-expanded/);
  assert.match(card, /directive-followup-actions/);
  assert.match(card, /Promise Date \/ 承诺日期/);
  assert.match(card, /Note \/ 备注/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

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

test("default directive card does not render customer code or internal ids", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.doesNotMatch(card, /\$\{esc\(d\.customer_code\)\}/);
  assert.doesNotMatch(card, /customer_code\?/);
  assert.doesNotMatch(card, /source_ref|directive_id|139780080/);
});

test("customer code may remain in data normalization but not in the card renderer", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const normalize = extractLastFunction(html, "normalizeEmployeeDirective");
  const card = extractLastFunction(html, "employeeDirectiveCard");

  assert.match(normalize, /customer_code/);
  assert.doesNotMatch(card, /customer_code/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

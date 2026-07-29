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

test("directive date normalization accepts mobile slash and padded variants", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const valueFn = extractLastFunction(html, "directiveFollowupValue");
  const normalizeFn = extractLastFunction(html, "normalizeDirectiveDate");
  const normalize = new Function(`${valueFn}\n${normalizeFn}\nreturn normalizeDirectiveDate;`)();

  assert.equal(normalize("2026/6/10"), "2026-06-10");
  assert.equal(normalize("2026-6-1"), "2026-06-01");
  assert.equal(normalize("2026-06-10"), "2026-06-10");
  assert.equal(normalize(""), "");
});

test("dirty comparison uses normalized promised dates on both sides", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const current = extractLastFunction(html, "employeeDirectiveCurrentValues");
  const original = extractLastFunction(html, "employeeDirectiveOriginalValues");

  assert.match(current, /promised:normalizeDirectiveDate/);
  assert.match(original, /promised:normalizeDirectiveDate/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

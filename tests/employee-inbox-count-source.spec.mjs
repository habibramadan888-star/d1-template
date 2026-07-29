import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name, prefix = "function") {
  const start = source.lastIndexOf(`${prefix} ${name}(`);
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

test("employee inbox count comes from persisted directive API rows", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const load = extractLastFunction(html, "loadEmployeeArrearsDirectives", "async function");
  const render = extractLastFunction(html, "renderEmployeeDirectiveInbox");

  assert.match(load, /\/api\/employee\/arrears\/directives/);
  assert.match(load, /state\.employeeDirectives=\(data\.directives\|\|data\.tasks\|\|\[\]\)/);
  assert.match(render, /const rows=state\.employeeDirectives\|\|\[\]/);
  assert.match(render, /\$\{rows\.length\} ASSIGNED/);
  assert.match(render, /rows\.map\(employeeDirectiveCard\)/);
  assert.doesNotMatch(render, /ownerArrears|selectedTaskIds|dry-run|40/);
});

test("employee UI renders all returned directives, not only the first one", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const render = extractLastFunction(html, "renderEmployeeDirectiveInbox");

  assert.match(render, /rows\.map\(employeeDirectiveCard\)\.join\(''\)/);
  assert.doesNotMatch(render, /rows\[0\]|slice\(0,\s*1\)|\.shift\(\)/);
});

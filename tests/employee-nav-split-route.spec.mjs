import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
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

test("employee hash routing maps legacy Follow-up aliases safely", async () => {
  const html = await readFile(htmlPath, "utf8");
  const normalize = extractFunction(html, "normalizeEmployeeView");
  const hash = extractFunction(html, "employeeViewHash");

  assert.match(normalize, /raw==='followup'\|\|raw==='arrears'\|\|raw==='export'/);
  assert.match(normalize, /return 'arrears'/);
  assert.match(normalize, /raw==='system'/);
  assert.match(hash, /next==='arrears'\?'followup':next/);
});

test("view switching loads only the selected page data source", async () => {
  const html = await readFile(htmlPath, "utf8");
  const show = extractFunction(html, "showEmployeeView");

  assert.match(show, /\['entry','arrears','system'\]/);
  assert.match(show, /if\(next==='arrears'\)loadEmployeeArrearsDirectives\(true\)/);
  assert.match(show, /if\(next==='system'\)loadTasks\(true\)/);
  assert.doesNotMatch(show, /if\(next==='arrears'\)loadTasks/);
});

test("legacy export route is redirected to Follow-up instead of restoring Export", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /if\(location\.hash==='#export'\)/);
  assert.match(html, /history\.replaceState\(null,'',location\.pathname\+location\.search\+'#followup'\)/);
  assert.match(html, /hashchange/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

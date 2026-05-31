import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name) {
  const start = source.lastIndexOf(`function ${name}(`);
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

test("batch send button is driven by selected checkbox state, not a stale single id", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const update = extractLastFunction(js, "updateArrearDirectiveButtonState");
  const sync = extractLastFunction(js, "syncArrearSelectAllState");
  const buttons = extractLastFunction(js, "ownerArrearsDirectiveButtons");

  assert.match(sync, /ownerArrearsVisibleCheckboxes\(\)/);
  assert.match(sync, /checked=boxes\.filter\(el=>el\.checked\)\.length/);
  assert.match(buttons, /querySelectorAll\('\[data-arrear-directive-btn\],#arrearDirectiveBtn'\)/);
  assert.match(update, /ownerArrearsDirectiveButtons\(\)\.forEach/);
  assert.match(update, /btn\.disabled=checkedCount===0/);
  assert.doesNotMatch(update, /getElementById\('arrearDirectiveBtn'\)/);
});

test("send button enablement does not depend on removed requested date or employee target fields", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const update = extractLastFunction(js, "updateArrearDirectiveButtonState");

  assert.doesNotMatch(update, /arrearDirectiveDue|requestedDate|employeeSelected|employeeTarget|directiveEnabled/);
  assert.match(update, /下发员工/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});


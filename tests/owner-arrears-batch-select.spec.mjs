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

test("owner arrears batch select selects the current rendered filter scope", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const controls = extractLastFunction(js, "renderOwnerArrearsControls");
  const toggleAll = extractLastFunction(js, "toggleArrearSelectAll");
  const visibleBoxes = extractLastFunction(js, "ownerArrearsVisibleCheckboxes");
  const sync = extractLastFunction(js, "syncArrearSelectAllState");
  const update = extractLastFunction(js, "updateArrearDirectiveButtonState");

  assert.match(controls, /id="arrearSelectAll"/);
  assert.match(controls, /toggleArrearSelectAll\(this\.checked\)/);
  assert.match(controls, /id="arrearSelectionCount"/);
  assert.match(visibleBoxes, /\[data-arrear-select\]/);
  assert.match(toggleAll, /ownerArrearsVisibleCheckboxes\(\)\.forEach/);
  assert.match(sync, /已选择 \$\{checked\} \/ \$\{boxes\.length\}/);
  assert.match(update, /下发员工/);
});

test("readonly admin cannot see batch select controls", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const controls = extractLastFunction(js, "renderOwnerArrearsControls");

  assert.match(controls, /isOwnerWriteRole\(\)\?/);
  assert.match(controls, /id="arrearSelectAll"/);
  assert.match(controls, /id="arrearDirectiveBtn"/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

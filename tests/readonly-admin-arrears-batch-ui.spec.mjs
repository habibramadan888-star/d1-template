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

test("readonly admin can inspect and export but cannot batch assign", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const controls = extractLastFunction(js, "renderOwnerArrearsControls");
  const card = extractLastFunction(js, "renderOwnerArrearsTaskCard");
  const actions = extractLastFunction(js, "renderArrearCardActions");

  assert.match(controls, /isOwnerWriteRole\(\)\?/);
  assert.match(controls, /WhatsApp 导出/);
  assert.match(card, /isOwnerWriteRole\(\)\?/);
  assert.match(actions, /if\(!isOwnerWriteRole\(\)\)return detail/);
  assert.doesNotMatch(controls, /readonly_admin/);
});

test("write requests remain outside readonly UI test scope", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

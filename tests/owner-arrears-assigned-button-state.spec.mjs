import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const signature = `function ${name}(`;
  const start = source.indexOf(signature);
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

test("assigned and viewed owner arrears tasks do not render clickable assign buttons", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const actions = extractFunction(js, "renderArrearCardActions");

  assert.match(actions, /\['assigned','viewed'\]\.includes\(directive\)/);
  assert.match(actions, /data-arrear-write-action="assigned-state"/);
  assert.match(actions, /disabled aria-disabled="true"/);
});

test("followed-up owner arrears tasks show feedback state, not primary send action", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const actions = extractFunction(js, "renderArrearCardActions");

  assert.match(actions, /directive==='followed_up'/);
  assert.match(actions, /data-arrear-write-action="followed-up-state"/);
  assert.match(actions, /disabled aria-disabled="true"/);
  assert.match(actions, /data-arrear-write-action="assign"/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

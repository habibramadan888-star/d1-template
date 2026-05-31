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

test("owner live action renderer blocks resend for assigned and viewed tasks", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const actions = extractFunction(js, "renderArrearCardActions");

  assert.match(actions, /arrearDirectiveStatus\(a\)/);
  assert.match(actions, /\['assigned','viewed'\]\.includes\(directive\)/);
  assert.match(actions, /data-arrear-write-action="assigned-state"/);
  assert.match(actions, /disabled aria-disabled="true"/);
});

test("owner live action renderer blocks resend for followed-up tasks", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const actions = extractFunction(js, "renderArrearCardActions");

  assert.match(actions, /directive==='followed_up'/);
  assert.match(actions, /data-arrear-write-action="followed-up-state"/);
  assert.match(actions, /员工已反馈|宸插弽棣/);
});

test("owner live action renderer still allows assign only for waiting tasks", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const actions = extractFunction(js, "renderArrearCardActions");

  const assignedIndex = actions.indexOf('data-arrear-write-action="assigned-state"');
  const followedIndex = actions.indexOf('data-arrear-write-action="followed-up-state"');
  const assignIndex = actions.lastIndexOf('data-arrear-write-action="assign"');
  assert.ok(assignedIndex > -1);
  assert.ok(followedIndex > -1);
  assert.ok(assignIndex > assignedIndex);
  assert.ok(assignIndex > followedIndex);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

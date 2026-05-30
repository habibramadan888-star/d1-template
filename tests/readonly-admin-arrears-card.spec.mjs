import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("readonly_admin arrears cards only expose details action", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const actions = extractFunction(js, "renderArrearCardActions");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  assert.match(actions, /if\(!isOwnerWriteRole\(\)\)return detail/);
  assert.match(actions, />详情<\/button>/);
  assert.match(actions, />下发员工<\/button>/);
  assert.match(actions, />确认关闭<\/button>/);
  assert.match(card, /isOwnerWriteRole\(\)\?/);
});

test("backend write guard stays enforced for readonly_admin role", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /function denyReadonlyAdminWrite/);
  assert.match(js, /function isOwnerWriteRole/);
  assert.match(js, /readonly_admin/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractLastFunction(source, name, asyncKeyword = false) {
  const signature = `${asyncKeyword ? "async " : ""}function ${name}(`;
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

test("button copy distinguishes saved, submit feedback, and submit changes", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const update = extractLastFunction(html, "updateEmployeeDirectivePersistedState");

  assert.match(update, /textContent='.*'/);
  assert.match(update, /hasPersisted&&!dirty/);
  assert.match(update, /hasPersisted\?'提交修改':'提交反馈'/);
  assert.match(update, /aria-disabled/);
});

test("gate-off warning is only reached by an attempted write and has dirty-copy branch", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const save = extractLastFunction(html, "saveEmployeeDirectiveFollowup", true);

  assert.match(save, /hasPersisted&&!dirty/);
  assert.match(save, /production_write_approval_required/);
  assert.match(save, /hasPersisted\?/);
  assert.match(save, /当前修改/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

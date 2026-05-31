import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name, asyncKeyword = false) {
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

test("employee directive status copy separates historical feedback from unsaved edits", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const statusLabel = extractFunction(html, "employeeDirectiveStatusLabel");
  const card = extractFunction(html, "employeeDirectiveCard");
  const bind = extractFunction(html, "bindEmployeeDirectiveActions");
  const update = extractFunction(html, "updateEmployeeDirectivePersistedState");

  assert.match(statusLabel, /followed_up:/);
  assert.match(card, /data-directive-status-tag/);
  assert.match(card, /data-directive-edit/);
  assert.match(bind, /updateEmployeeDirectivePersistedState/);
  assert.match(update, /当前修改未提交/);
  assert.match(update, /已有反馈/);
});

test("write gate off copy states that no production write happened", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const save = extractFunction(html, "saveEmployeeDirectiveFollowup", true);

  assert.match(save, /production_write_approval_required/);
  assert.match(save, /真实反馈写入未启用/);
  assert.match(save, /当前修改/);
  assert.doesNotMatch(save, /提交反馈需要生产写入审批/);
  assert.doesNotMatch(save, /已反馈成功|提交成功/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

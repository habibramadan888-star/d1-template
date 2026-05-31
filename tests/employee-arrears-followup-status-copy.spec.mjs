import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name, asyncKeyword = false) {
  const signature = `${asyncKeyword ? "async " : ""}function ${name}(`;
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

test("employee directive status copy separates historical feedback from unsaved edits", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const statusLabel = extractFunction(html, "employeeDirectiveStatusLabel");
  const card = extractFunction(html, "employeeDirectiveCard");
  const bind = extractFunction(html, "bindEmployeeDirectiveActions");

  assert.match(statusLabel, /followed_up:'已有反馈'/);
  assert.doesNotMatch(statusLabel, /followed_up:'已反馈'/);
  assert.match(card, /data-directive-status-tag/);
  assert.match(card, /data-directive-edit/);
  assert.match(bind, /当前修改未提交/);
});

test("write gate off copy states that no production write happened", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const save = extractFunction(html, "saveEmployeeDirectiveFollowup", true);

  assert.match(save, /production_write_approval_required/);
  assert.match(save, /真实反馈写入未启用；当前不会写入生产/);
  assert.doesNotMatch(save, /提交反馈需要生产写入审批；当前未写入生产/);
  assert.doesNotMatch(save, /已提交成功|已反馈成功/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

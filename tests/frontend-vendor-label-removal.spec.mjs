import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicFiles = [
  "deploy-worker/public/employee-v3.html",
  "deploy-worker/public/index-51-main.js",
  "deploy-worker/public/index-51-cp.js",
  "deploy-worker/public/index.html",
  "deploy-worker/public/index-51.html",
];

test("public frontend does not expose card vendor labels", async () => {
  for (const file of publicFiles) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /TTLock|TTLOCK|TT lock|通通锁|\\u901a\\u901a\\u9501/, file);
  }
});

test("employee card loading and reminder labels are English-first", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  for (const copy of [
    "Load Cards / 加载卡片",
    "Loading Access Cards / 正在加载卡片",
    "Card Data Loaded / 门禁卡已加载",
    "Access Card Expired / \\u95e8\\u7981\\u5361\\u8fc7\\u671f",
    "Pending Follow-up",
    "Save Follow-up",
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(html, /pending_followup \/ system status/);
});

test("owner card controls use neutral English-first copy", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /Reload Cards \/ 重新读取卡片/);
  assert.match(js, /Load Cards \/ 加载卡片/);
  assert.match(js, /Card Data Loaded \/ 卡片数据已加载/);
  assert.match(js, /Access Card Expired|门禁卡到期未付/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

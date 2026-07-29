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

const zh = {
  loadCards: "\u52a0\u8f7d\u5361\u7247",
  loadingCards: "\u6b63\u5728\u52a0\u8f7d\u5361\u7247",
  cardDataLoaded: "\u95e8\u7981\u5361\u5df2\u52a0\u8f7d",
  reloadCards: "\u91cd\u65b0\u8bfb\u53d6\u5361\u7247",
  ownerCardLoaded: "\u5361\u7247\u6570\u636e\u5df2\u52a0\u8f7d",
  ownerCardExpired: "\u95e8\u7981\u5361\u5230\u671f\u672a\u4ed8",
};

test("public frontend does not expose card vendor labels", async () => {
  for (const file of publicFiles) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /TTLock|TTLOCK|TT lock|\u901a\u901a\u9501|\\u901a\\u901a\\u9501/, file);
  }
});

test("employee card loading and reminder labels are English-first", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  for (const copy of [
    `renderEmployeeButtonLabel('Load Cards','${zh.loadCards}')`,
    `Loading Access Cards / ${zh.loadingCards}`,
    `Card Data Loaded / ${zh.cardDataLoaded}`,
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

  assert.match(js, new RegExp(`Reload Cards / ${zh.reloadCards}`));
  assert.match(js, new RegExp(`Load Cards / ${zh.loadCards}`));
  assert.match(js, new RegExp(`Card Data Loaded / ${zh.ownerCardLoaded}`));
  assert.match(js, new RegExp(`Access Card Expired|${zh.ownerCardExpired}`));
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

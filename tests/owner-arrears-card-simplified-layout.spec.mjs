import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const argsOpen = source.indexOf("(", start);
  let parenDepth = 0;
  let argsClose = -1;
  for (let i = argsOpen; i < source.length; i += 1) {
    if (source[i] === "(") parenDepth += 1;
    if (source[i] === ")") parenDepth -= 1;
    if (parenDepth === 0) {
      argsClose = i;
      break;
    }
  }
  const open = source.indexOf("{", argsClose);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("owner arrears card has simplified business hierarchy", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  assert.match(card, /data-owner-arrears-business-title/);
  assert.match(card, /<strong>\$\{bed\}<\/strong><b>｜\$\{amount\}<\/b>/);
  assert.match(card, /owner-arrears-due-line/);
  assert.match(card, /承诺日期/);
  assert.match(card, /备注/);
  assert.match(card, /状态/);

  for (const forbidden of [
    "承诺金额",
    "arrearPromiseAmountLabel",
    "directive:",
    "promise:",
    "staff:",
    "source_type",
    "ttlock_card",
    "none",
    "undefined",
    "null"
  ]) {
    assert.doesNotMatch(card, new RegExp(forbidden, "i"));
  }
});

test("owner arrears page subtitle describes date and note only", async () => {
  const index51 = await readFile("deploy-worker/public/index-51.html", "utf8");
  const index = await readFile("deploy-worker/public/index.html", "utf8");

  for (const html of [index51, index]) {
    assert.match(html, /员工承诺日期\/备注/);
    assert.doesNotMatch(html, /员工承诺金额\/日期\/备注/);
  }
});

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

test("owner arrears tasks render through history-style mobile cards", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractFunction(js, "renderArrearsPanel");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  assert.match(render, /renderOwnerArrearsTaskCard\(a,today\)/);
  assert.doesNotMatch(render, /class="arrear-row arrear-task-card/);
  assert.match(card, /class="hist-card owner-arrears-task-card/);
  assert.match(card, /owner-arrears-identity/);
  assert.match(card, /hist-anchor owner-arrears-due-line/);
  assert.match(card, /hist-stat/);
  assert.match(card, /owner-arrears-card-actions/);
});

test("mobile card includes the owner-readable business blocks only", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  for (const required of [
    "arrearBedLabel",
    "arrearAmountLabel",
    "arrearSourceLabel",
    "arrearDueLine",
    "arrearPromiseDateLabel",
    "arrearFollowupNoteLabel",
    "承诺日期",
    "备注",
    "状态"
  ]) {
    assert.match(card, new RegExp(required));
  }

  for (const forbidden of ["directive:", "promise:", "staff:", "source_type", "金额待核对"]) {
    assert.doesNotMatch(card, new RegExp(forbidden, "i"));
  }
  assert.doesNotMatch(card, /arrearPromiseAmountLabel|承诺金额/);
  assert.doesNotMatch(card, /arrearCustomerLabel/);
  assert.match(card, /data-owner-arrears-business-title/);
  assert.match(card, /选择欠款任务 \$\{bed\} \$\{amount\}/);
});

test("owner arrears mobile CSS uses one-column cards, not table rows", async () => {
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");

  assert.match(html, /\.owner-arrears-list\{display:grid;grid-template-columns:1fr/);
  assert.match(html, /\.owner-arrears-task-card\{width:100%;box-sizing:border-box;display:block/);
  assert.match(html, /\.owner-arrears-task-card \*\{writing-mode:horizontal-tb\}/);
  assert.match(html, /@media \(max-width:720px\)/);
  assert.doesNotMatch(html, /table-layout|display:table|writing-mode:\s*vertical/i);
});

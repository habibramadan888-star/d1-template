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

test("owner arrears tasks render through a dedicated mobile card component", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const render = extractFunction(js, "renderArrearsPanel");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  assert.match(render, /renderOwnerArrearsTaskCard\(a,today\)/);
  assert.doesNotMatch(render, /class="arrear-row arrear-task-card/);
  assert.match(card, /<article class="owner-arrears-task-card/);
  assert.match(card, /owner-arrears-identity/);
  assert.match(card, /owner-arrears-due-line/);
  assert.match(card, /owner-arrears-followup-grid/);
  assert.match(card, /owner-arrears-card-actions/);
});

test("mobile card includes the core readable business blocks", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const card = extractFunction(js, "renderOwnerArrearsTaskCard");

  for (const required of [
    "arrearCustomerLabel",
    "arrearBedLabel",
    "arrearAmountLabel",
    "arrearDueLine",
    "来源",
    "状态",
    "负责人",
    "承诺还款",
    "备注"
  ]) {
    assert.match(card, new RegExp(required));
  }
});

test("owner arrears mobile CSS uses one-column cards, not table rows", async () => {
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");

  assert.match(html, /\.owner-arrears-list\{display:grid;grid-template-columns:1fr/);
  assert.match(html, /\.owner-arrears-task-card\{width:100%;box-sizing:border-box;display:block/);
  assert.match(html, /\.owner-arrears-followup-grid\{display:grid;grid-template-columns:1fr/);
  assert.match(html, /@media \(max-width:720px\)/);
  assert.match(html, /\.owner-arrears-task-card \*\{writing-mode:horizontal-tb\}/);
});

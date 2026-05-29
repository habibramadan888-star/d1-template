import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner cards, overview cards, and page titles follow employee card system", async () => {
  const owner = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(owner, /\.owner-ui-unified \.card,\r?\n\.owner-ui-unified \.hist-card/);
  assert.match(owner, /border-radius:var\(--radius-xl\)/);
  assert.match(owner, /background:rgba\(255,255,255,\.94\)/);
  assert.match(owner, /box-shadow:var\(--shadow-card\)/);
  assert.match(owner, /\.owner-ui-unified \.owner-overview-grid/);
  assert.match(owner, /\.owner-ui-unified \.owner-overview-card/);
  assert.match(owner, /\.owner-ui-unified \.page-title\{\r?\n  font-size:34px/);
  assert.match(owner, /\.owner-ui-unified \.card-title\{\r?\n  font-size:20px/);
});

test("owner analysis import tool is card-like instead of old backend form", async () => {
  const owner = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(owner, /\.owner-ui-unified \.import-actions\{\r?\n  display:grid/);
  assert.match(owner, /\.owner-ui-unified \.import-tab\{\r?\n  min-height:72px/);
  assert.match(owner, /\.owner-ui-unified \.import-body textarea,\r?\n\.owner-ui-unified \.ta\{/);
  assert.match(owner, /border-radius:24px/);
});

test("owner mobile rows use card-like treatment", async () => {
  const owner = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(
    owner,
    /\.owner-ui-unified \.detail-row,\r?\n\.owner-ui-unified \.entry-row,\r?\n\.owner-ui-unified \.cc-pay-row\{/
  );
  assert.match(owner, /border-radius:18px/);
  assert.match(owner, /background:rgba\(255,255,255,\.72\)/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Legacy red-line Follow-up card styling is not active", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.doesNotMatch(html, /\.followup-card\{[^}]*border-left:5px/s);
  assert.doesNotMatch(html, /\.followup-card\.overdue\{border-left-color/s);
  assert.doesNotMatch(html, /\.followup-card\.force\{border-left-color/s);
  assert.doesNotMatch(html, /\.followup-card\.history\{border-left-color/s);
  assert.doesNotMatch(html, /border-left-width:4px!important/);
});

test("Follow-up-specific CSS is limited to parity overrides, not a separate visual system", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /Final parity layer: Follow-up uses the Entry layout system/);
  assert.match(html, /\.employee-followup-view \.followup-card,\s*\.employee-followup-view \.followup-card\.step/s);
  assert.match(html, /border-left:1px solid rgba\(207,216,220,\x2e85\)/);
});

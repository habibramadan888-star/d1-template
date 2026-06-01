import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Follow-up mobile spacing uses compact Entry-aligned tokens", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /\.employee-followup-view \.employee-card\{\r?\n  border-left:0;[\s\S]*?padding:20px;/);
  assert.match(html, /@media\(max-width:720px\)\{[\s\S]*?\.employee-followup-view \.employee-card\{[\s\S]*?padding:16px;/);
  assert.match(html, /\.employee-followup-view \.followup-dashboard\{\r?\n  gap:10px;/);
  assert.match(html, /\.employee-followup-view \.followup-metric\{\r?\n  padding:12px 14px;/);
});

test("Follow-up page no longer has a visible standalone export panel consuming mobile space", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.doesNotMatch(html, /id="view-export"/);
  assert.match(html, /\.employee-export-buffer\{display:none!important\}/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

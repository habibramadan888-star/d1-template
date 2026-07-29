import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("boss assigned card uses compact spacing tokens", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /\.employee-followup-view \.employee-directive-card\{\r?\n  padding:14px;/);
  assert.match(html, /\.employee-followup-view \.employee-directive-card \.employee-directive-meta\{[\s\S]*?gap:5px;/);
  assert.match(html, /\.employee-followup-view \.employee-directive-card \.followup-tag\{[\s\S]*?min-height:20px;/);
  assert.match(html, /\.employee-followup-view \.employee-directive-card \.employee-directive-details\{[\s\S]*?margin-top:10px;/);
});

test("expanded form remains compact and action-focused", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /\.employee-followup-view \.employee-directive-card \.directive-followup-actions\{[\s\S]*?gap:8px;[\s\S]*?margin-top:0;/);
  assert.match(html, /\.employee-followup-view \.employee-directive-card \.directive-followup-actions textarea\{[\s\S]*?height:42px;/);
  assert.match(html, /\.employee-followup-view \.employee-directive-card \.directive-followup-actions \.mini-btn/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

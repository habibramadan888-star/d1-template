import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner arrears card CSS prevents vertical text and squeezed columns", async () => {
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");

  assert.doesNotMatch(html, /writing-mode:\s*vertical/i);
  assert.match(html, /\.owner-arrears-task-card\{[^}]*writing-mode:horizontal-tb/);
  assert.match(html, /\.owner-arrears-identity\{[^}]*flex-wrap:wrap/);
  assert.match(html, /\.owner-arrears-followup-grid\{[^}]*grid-template-columns:1fr/);
  assert.match(html, /\.owner-arrears-card-actions\{[^}]*flex-wrap:wrap/);
  assert.doesNotMatch(html, /\.owner-arrears-task-card\{[^}]*display:flex/);
});

test("owner arrears render path no longer emits the legacy row wrapper", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const start = js.indexOf("function renderArrearsPanel");
  const end = js.indexOf("function enterPaymentForArrear", start);
  const render = js.slice(start, end);

  assert.doesNotMatch(render, /class="arrear-row/);
  assert.match(render, /data-owner-arrears-card-list/);
});

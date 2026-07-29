import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Follow-up page carries the hard Entry parity layer and shared primitives", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /EMPLOYEE-FOLLOWUP-FULL-ENTRY-PARITY-LAYOUT-FIX-002/);
  assert.match(html, /id="view-arrears" class="hidden employee-followup-view employee-panel"/);
  assert.match(html, /class="card employee-panel-card"/);
  assert.match(html, /class="boss-directive-title step-title/);
  assert.match(html, /class="kpi-grid followup-dashboard"/);
  assert.match(html, /class="kpi-card followup-metric/);
  assert.match(html, /followup-card step employee-card/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

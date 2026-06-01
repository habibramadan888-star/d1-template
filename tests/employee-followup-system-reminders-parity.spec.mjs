import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("System Reminders uses Entry step title and KPI card primitives", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /employee-system-reminders-title/);
  assert.match(html, /boss-directive-title step-title employee-system-reminders-title/);
  assert.match(html, /kpi-grid followup-dashboard/);
  assert.match(html, /kpi-card followup-metric/);
});

test("system reminder cards avoid internal CID/deposit debug text in default renderer", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const start = html.lastIndexOf("function followupCard(");
  const end = html.indexOf("function renderTasks", start);
  const card = html.slice(start, end);

  assert.match(card, /followup-card step/);
  assert.doesNotMatch(card, /CID:|DEPOSIT:|tenant_card_id|deposit/);
});

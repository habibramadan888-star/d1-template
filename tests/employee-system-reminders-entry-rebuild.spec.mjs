import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("System Reminders use Entry KPI grid and step title primitives", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /employee-system-reminders-title/);
  assert.match(html, /boss-directive-title step-title employee-system-reminders-title/);
  assert.match(html, /kpi-grid followup-dashboard/);
  assert.match(html, /kpi-card followup-metric/);
  assert.match(html, /followup-list/);
});

test("System follow-up cards hide secondary form controls behind details", async () => {
  const html = await readFile(htmlPath, "utf8");
  const start = html.indexOf("function followupCard(item)");
  const end = html.indexOf("function renderTasks", start);
  const card = html.slice(start, end);

  assert.match(card, /Expand Details/);
  assert.match(card, /followup-details/);
  assert.match(card, /Save Follow-up/);
  assert.doesNotMatch(card, /tenant_card_id|deposit|source_ref|CID:/);
});

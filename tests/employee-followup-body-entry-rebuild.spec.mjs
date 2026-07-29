import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Follow-up body uses Entry section, step, card, and form structures", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /employee-followup-view employee-panel/);
  assert.match(html, /employee-panel-card/);
  assert.match(html, /boss-directive-title step-title/);
  assert.match(html, /followup-card directive employee-directive-card employee-card step/);
  assert.match(html, /data-directive-card-collapsed="true"/);
  assert.match(html, /employee-directive-details/);
});

test("Follow-up system cards default to collapsed details", async () => {
  const html = await readFile(htmlPath, "utf8");
  const start = html.indexOf("function followupCard(item)");
  const end = html.indexOf("function renderTasks", start);
  const card = html.slice(start, end);

  assert.match(card, /data-followup-card-collapsed="true"/);
  assert.match(card, /id="followupDetails_\$\{id\}" hidden/);
  assert.match(card, /data-toggle-followup-details/);
});

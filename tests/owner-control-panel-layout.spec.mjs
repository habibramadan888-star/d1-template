import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("control panel mobile shell avoids compressed topbar layout", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(
    html,
    /#cp-overlay \.topbar-inner\{display:grid!important;grid-template-columns:1fr!important/
  );
  assert.match(
    html,
    /#cp-overlay \.topbar-actions\{display:grid!important;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/
  );
  assert.match(
    html,
    /#cp-overlay \.filter-pills\{display:grid!important;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/
  );
});

test("control panel room details become readable cards on mobile", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");
  const cp = await readFile("deploy-worker/public/index-51-cp.js", "utf8");

  assert.match(
    html,
    /#cp-overlay \.room-body table,[\s\S]*#cp-overlay \.room-body td\{display:block!important/
  );
  assert.match(cp, /data-label="卡片 \/ 租客"/);
  assert.match(cp, /data-label="截止日期"/);
  assert.match(cp, /data-label="状态"/);
});

test("control panel combines the three due-state metrics into one compact card", async () => {
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");

  assert.match(html, /#cp-overlay \.kpi-alerts \{[\s\S]*grid-template-columns:repeat\(3,1fr\);[\s\S]*gap:0;[\s\S]*border:1px solid var\(--border\);[\s\S]*overflow:hidden;/);
  assert.match(html, /#cp-overlay \.kpi-alerts \.kpi\{[^}]*border-right:1px solid var\(--border\);[^}]*box-shadow:none/);
  assert.match(html, /#cp-overlay \.kpi-alerts\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important;gap:0!important\}/);
  assert.match(html, /#cp-overlay \.kpi-alerts \.kpi-tap\{display:none\}/);
  assert.match(html, /id="kpiOverdue"/);
  assert.match(html, /id="kpiToday"/);
  assert.match(html, /id="kpiSoon"/);
});

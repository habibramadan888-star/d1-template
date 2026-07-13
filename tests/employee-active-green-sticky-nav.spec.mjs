import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const path = "deploy-worker/public/employee-v3.html";

test("employee selected controls inherit the one brand-green computed-style token set", async () => {
  const source = await readFile(path, "utf8");
  assert.match(source, /--employee-active-background:linear-gradient\(180deg,#10ad5a,#078d42\);--employee-active-border:rgba\(9,166,79,.7\);--employee-active-shadow:0 12px 26px rgba\(9,166,79,.24\);--employee-active-text:#fff/);
  const ruleStart = source.lastIndexOf('.tab.active,.employee-workspace-switch');
  const rule = source.slice(ruleStart, ruleStart + 420);
  for (const selector of ['.tab.active', '.employee-workspace-switch button.active', '.event-chip.active', '.pay-option.active', '.btn.primary:not(:disabled)']) {
    assert.ok(rule.includes(selector), `shared active rule includes ${selector}`);
  }
  assert.match(rule, /background:var\(--employee-active-background\)!important/);
  assert.match(rule, /border-color:var\(--employee-active-border\)!important/);
  assert.match(rule, /box-shadow:var\(--employee-active-shadow\)!important/);
  assert.match(rule, /color:var\(--employee-active-text\)!important/);
});

test("one workspace switch uses a real sticky offset below the measured global navigation", async () => {
  const source = await readFile(path, "utf8");
  const start = source.lastIndexOf('.top{z-index:20}.employee-workspace-switch');
  const rule = source.slice(start, start + 540);
  assert.match(rule, /position:sticky!important/);
  assert.match(rule, /top:var\(--employee-global-nav-height,106px\)!important/);
  assert.match(source, /html,body\.employee-ui\{overflow:visible!important\}/);
  assert.match(rule, /z-index:12/);
  assert.match(rule, /isolation:isolate/);
  assert.match(rule, /#view-entry\{padding-top:0!important\}/);
  assert.match(source, /function syncEmployeeWorkspaceStickyOffset\(\)/);
  assert.match(source, /--employee-global-nav-height/);
  assert.equal((source.match(/class="employee-workspace-switch"/g) || []).length, 1);
  assert.ok(source.indexOf('class="employee-workspace-switch"') < source.indexOf('<section id="view-entry">'));
});

test("entry and current-session visual layers use one card language without duplicate system panels", async () => {
  const source = await readFile(path, "utf8");
  const visualSystem = source.slice(source.lastIndexOf('/* Employee visual system'), source.lastIndexOf('/* Employee visual system') + 2900);
  assert.match(visualSystem, /--employee-card-radius:18px/);
  assert.match(visualSystem, /\.employee-entry-card\{background:transparent!important;border:0!important/);
  assert.match(visualSystem, /\.employee-entry-card \.step\{background:transparent!important;border:0!important/);
  assert.match(visualSystem, /\.employee-entry-card #verifyContextStep,.employee-entry-card #entrySummary,.employee-entry-card #objectHint,#ttlockEntryStatus,#view-entry \.employee-collapsible-step\[data-employee-collapsed-step="8"\]\{display:none!important\}/);
  assert.match(visualSystem, /\.employee-session-card#employeeSessionSummaryCard \.head\{display:none!important\}/);
  assert.match(visualSystem, /\.employee-entry-card #systemCalculation\{margin:0 0 12px!important;padding:12px!important\}/);
});

test("current-session cards default to a safe compact summary and hide duplicate card-load status", async () => {
  const source = await readFile(path, "utf8");
  const finalPreviewStart = source.lastIndexOf('renderSessionPreview=function()');
  const finalPreview = source.slice(finalPreviewStart, source.indexOf('renderSummary=function()', finalPreviewStart));
  assert.doesNotMatch(finalPreview, /tenant_name\|\|''/);
  assert.match(finalPreview, /employee-session-record-details/);
  assert.match(finalPreview, /<summary>Details<\/summary>/);
  assert.match(source, /#ttlockEntryStatus,#view-entry \.employee-collapsible-step\[data-employee-collapsed-step="8"\]\{display:none!important\}/);
});

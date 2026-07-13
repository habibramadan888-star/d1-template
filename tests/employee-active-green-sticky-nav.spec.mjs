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

test("workspace switch uses a fixed, below-navigation mobile-safe offset with layout compensation", async () => {
  const source = await readFile(path, "utf8");
  const start = source.lastIndexOf('.top{z-index:20}.employee-workspace-switch');
  const rule = source.slice(start, start + 290);
  assert.match(rule, /position:fixed!important/);
  assert.match(rule, /top:134px!important/);
  assert.match(rule, /z-index:12/);
  assert.match(rule, /isolation:isolate/);
  assert.match(source, /@media\(max-width:720px\)\{\.employee-workspace-switch\{top:106px!important;left:10px;width:calc\(100vw - 20px\)\}#view-entry\{padding-top:64px\}\}/);
  assert.match(rule, /#view-entry\{padding-top:64px\}/);
});

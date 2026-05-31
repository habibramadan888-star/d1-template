import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner primary nav is capped at five visible modules and keeps network on the first row", async () => {
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");
  const nav = html.match(/<nav class="nav" id="navTabs">[\s\S]*?<\/nav>/)?.[0] || "";

  assert.doesNotMatch(nav, /id="navArrears"|data-view="arrears"|>欠款<span/);
  assert.match(html, /id="navAnalysis"/);
  assert.match(html, /id="navWifi"/);
  assert.match(html, /\.owner-ui-unified \.nav\{display:flex!important;flex-wrap:nowrap!important/);
  assert.match(html, /\.owner-ui-unified #navClients\{display:flex!important\}/);
  assert.match(html, /\.owner-ui-unified \.topbar-row2\{overflow-x:auto/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Entry, Follow-up, and System nav is explicitly centered and has three tabs only", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /class="tabs employee-tabs" data-entry-parity-tabs="true"/);
  assert.match(html, /\.employee-tabs\{\s*justify-content:center;/);
  assert.match(html, /\.employee-tabs \.tab\{/);
  assert.match(html, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\);/);

  const matches = [...html.matchAll(/<button class="tab[^"]*" data-view="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(matches, ["entry", "arrears", "system"]);
  assert.doesNotMatch(html, /data-view="export"/);
});

test("Employee tabs override the legacy horizontal scroll behavior", async () => {
  const html = await readFile(htmlPath, "utf8");
  const start = html.indexOf(".employee-tabs{");
  const end = html.indexOf(".employee-tabs .tab{", start);
  const block = html.slice(start, end);

  assert.match(block, /justify-content:center/);
  assert.match(block, /overflow:visible/);
});

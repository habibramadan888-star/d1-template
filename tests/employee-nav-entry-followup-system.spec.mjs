import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("employee navigation exposes Entry, Follow-up, and System only", async () => {
  const html = await readFile(htmlPath, "utf8");
  const tabs = [...html.matchAll(/<button class="tab[^"]*" data-view="([^"]+)"/g)].map((m) => m[1]);

  assert.deepEqual(tabs, ["entry", "arrears", "system"]);
  assert.match(html, /data-view="entry"/);
  assert.match(html, /data-view="arrears"/);
  assert.match(html, /data-view="system"/);
  assert.doesNotMatch(html, /data-view="export"/);
  assert.doesNotMatch(html, /id="view-export"/);
});

test("three-tab employee navigation stays fixed without horizontal scrolling", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /class="tabs employee-tabs" data-entry-parity-tabs="true"/);
  assert.match(html, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\);/);
  assert.match(html, /\.employee-tabs\{\s*justify-content:center;/);
  assert.match(html, /overflow:hidden/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

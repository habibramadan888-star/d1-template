import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner network/WiFi entry remains available in the owner shell", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(html, /id="navWifi"/);
  assert.match(html, /data-view="wifi"/);
  assert.match(html, /NETWORK/);
  assert.match(js, /document\.getElementById\('navWifi'\)\?\.classList\.remove\('locked'\)/);
  assert.match(js, /if\(v==='wifi'\)\{wmRenderPage\(\);\}/);
});

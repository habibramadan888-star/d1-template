import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner network control entry is visible in the owner shell", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(html, /id="navWifi"/);
  assert.match(html, /data-view="wifi"/);
  assert.match(html, />网络<span class="en-sub">NETWORK<\/span>/);
  assert.match(html, /id="view-wifi"/);
  assert.match(js, /document\.getElementById\('navWifi'\)\?\.classList\.remove\('locked'\)/);
  assert.match(js, /if\(v==='wifi'\)\{wmRenderPage\(\);\}/);
});

test("network control remains owner-authorized and does not change settings during tests", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /if \(path === "\/api\/wifi\/accounts" && method === "GET"\)/);
  assert.match(worker, /if \(!requireManager\(user\)\) return forbidden\(\);/);
  assert.match(worker, /if \(path === "\/api\/wifi\/accounts" && method === "POST"\)/);
});

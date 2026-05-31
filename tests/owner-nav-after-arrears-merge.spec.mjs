import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function nav(html) {
  return html.match(/<nav class="nav" id="navTabs">[\s\S]*?<\/nav>/)?.[0] || "";
}

async function assertFinalNav(file) {
  const html = await readFile(file, "utf8");
  const n = nav(html);
  const order = ["navOverview", "navHistory", "navAnalysis", "navClients", "navWifi"];

  assert.equal([...n.matchAll(/class="nav-btn/g)].length, 5);
  assert.doesNotMatch(n, /navArrears|data-view="arrears"|>欠款<span/);
  for (const id of order) assert.match(n, new RegExp(`id="${id}"`));
  assert.ok(
    order.every((id, index) => index === 0 || n.indexOf(id) > n.indexOf(order[index - 1])),
    "owner nav order must remain stable after arrears merge"
  );
  assert.match(n, />分析<span class="en-sub">ANALYSIS<\/span>/);
  assert.match(n, />网络<span class="en-sub">NETWORK<\/span>/);
  assert.match(html, /flex-wrap:nowrap!important/);
}

test("index-51 owner nav removes arrears tab but keeps all other modules", async () => {
  await assertFinalNav("deploy-worker/public/index-51.html");
});

test("index owner nav mirrors the final arrears-merged nav", async () => {
  await assertFinalNav("deploy-worker/public/index.html");
});

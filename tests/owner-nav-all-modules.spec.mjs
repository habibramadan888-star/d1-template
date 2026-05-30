import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function nav(html) {
  return html.match(/<nav class="nav" id="navTabs">[\s\S]*?<\/nav>/)?.[0] || "";
}

async function assertOwnerNav(file) {
  const html = await readFile(file, "utf8");
  const n = nav(html);
  const order = ["navOverview", "navArrears", "navHistory", "navAnalysis", "navClients", "navWifi"];

  assert.equal([...n.matchAll(/class="nav-btn/g)].length, 6);
  for (const id of order) assert.match(n, new RegExp(`id="${id}"`));
  assert.ok(
    order.every((id, index) => index === 0 || n.indexOf(id) > n.indexOf(order[index - 1])),
    "owner nav order must remain stable"
  );
  assert.match(n, />分析<span class="en-sub">ANALYSIS<\/span>/);
  assert.doesNotMatch(n, /欠款管理/);

  const hideIndex = html.lastIndexOf(".owner-ui-unified #navClients{display:none!important}");
  const restoreIndex = html.lastIndexOf(".owner-ui-unified #navClients{display:flex!important}");
  assert.ok(restoreIndex > hideIndex, "clients nav must be restored by final regression lock CSS");
  assert.match(html, /flex-wrap:nowrap!important/);
}

test("index-51 owner nav exposes all modules without wrapping", async () => {
  await assertOwnerNav("deploy-worker/public/index-51.html");
});

test("index owner nav stays in sync with index-51", async () => {
  await assertOwnerNav("deploy-worker/public/index.html");
});

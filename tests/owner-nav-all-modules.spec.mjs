import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function nav(html) {
  return html.match(/<nav class="nav" id="navTabs">[\s\S]*?<\/nav>/)?.[0] || "";
}

function ownerNavCss(html) {
  return html
    .split("\n")
    .filter(
      (line) =>
        line.includes("OWNER NAV LOCK") ||
        line.includes(".owner-ui-unified .topbar-row2") ||
        line.includes(".owner-ui-unified .nav{") ||
        line.includes(".owner-ui-unified #navClients")
    )
    .join("\n");
}

async function assertOwnerNav(file) {
  const html = await readFile(file, "utf8");
  const n = nav(html);
  const css = ownerNavCss(html);
  const order = ["navOverview", "navHistory", "navAnalysis", "navClients", "navWifi"];

  assert.equal([...n.matchAll(/class="nav-btn/g)].length, 5);
  assert.doesNotMatch(n, /navArrears|data-view="arrears"/);
  for (const id of order) assert.match(n, new RegExp(`id="${id}"`));
  assert.ok(
    order.every((id, index) => index === 0 || n.indexOf(id) > n.indexOf(order[index - 1])),
    "owner nav order must remain stable"
  );
  assert.match(n, />分析<span class="en-sub">ANALYSIS<\/span>/);
  assert.match(n, />网络<span class="en-sub">NETWORK<\/span>/);
  assert.doesNotMatch(n, /欠款管理|娆犳绠＄悊/);

  const hideIndex = html.lastIndexOf(".owner-ui-unified #navClients{display:none!important}");
  const restoreIndex = html.lastIndexOf(".owner-ui-unified #navClients{display:flex!important}");
  assert.ok(restoreIndex > hideIndex, "clients nav must be restored by final regression lock CSS");
  assert.match(css, /OWNER NAV LOCK: fixed centered tabs, no horizontal scroll/);
  assert.match(
    css,
    /\.owner-ui-unified \.topbar-row2\{display:flex;justify-content:center;overflow:hidden\}/
  );
  assert.match(
    css,
    /\.owner-ui-unified \.nav\{display:grid!important;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/
  );
  assert.match(css, /width:min\(100%,430px\)!important/);
  assert.doesNotMatch(css, /overflow-x\s*:\s*auto/i);
  assert.doesNotMatch(css, /width\s*:\s*max-content/i);
}

test("index-51 owner nav exposes all modules without wrapping", async () => {
  await assertOwnerNav("deploy-worker/public/index-51.html");
});

test("index owner nav stays in sync with index-51", async () => {
  await assertOwnerNav("deploy-worker/public/index.html");
});

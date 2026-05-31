import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = ["deploy-worker/public/index.html", "deploy-worker/public/index-51.html"];

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

for (const file of files) {
  test(`${file} owner primary nav uses fixed centered grid without wrapping`, async () => {
    const html = await readFile(file, "utf8");
    const n = nav(html);
    const css = ownerNavCss(html);
    const order = ["navOverview", "navHistory", "navAnalysis", "navClients", "navWifi"];

    assert.equal([...n.matchAll(/class="nav-btn/g)].length, 5);
    assert.ok(
      order.every((id, index) => index === 0 || n.indexOf(id) > n.indexOf(order[index - 1])),
      "owner nav order must remain overview/history/analysis/clients/network"
    );
    assert.doesNotMatch(n, /id="navArrears"|data-view="arrears"/);
    assert.match(n, /id="navAnalysis"/);
    assert.match(n, /id="navHistory"/);
    assert.match(n, /id="navClients"/);
    assert.match(n, /id="navWifi"/);

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
    assert.match(css, /\.owner-ui-unified #navClients\{display:flex!important\}/);
    assert.doesNotMatch(css, /overflow-x\s*:\s*auto/i);
    assert.doesNotMatch(css, /width\s*:\s*max-content/i);
  });
}

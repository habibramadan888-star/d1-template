import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readOwner() {
  return readFile("deploy-worker/public/index.html", "utf8");
}

test("owner top nav uses contained mobile layout and stable non-emoji controls", async () => {
  const owner = await readOwner();
  const topbar = owner.match(/<header class="topbar hl-header"[\s\S]*?<\/header>/)?.[0] || "";

  assert.match(owner, /\.owner-ui-unified \.topbar\{overflow:hidden\}/);
  assert.match(owner, /grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(owner, /\.owner-ui-unified \.topbar-right\{justify-content:flex-end/);
  assert.match(owner, /\.owner-ui-unified \.owner-dashboard-btn\{max-width:118px/);
  assert.match(owner, /\.owner-ui-unified \.nav-btn\{min-width:0!important;width:100%/);
  assert.match(topbar, /<span class="btn-label">控制台<\/span>/);
  assert.doesNotMatch(topbar, /🔐|馃|鎺|褰曞|閫€|�/);
});

test("owner right side controls remain inside mobile viewport by CSS contract", async () => {
  const owner = await readOwner();

  assert.match(owner, /\.owner-ui-unified \.brand\{min-width:0\}/);
  assert.match(owner, /\.owner-ui-unified \.topbar-right\{min-width:0;flex-shrink:1\}/);
  assert.match(
    owner,
    /\.owner-ui-unified \.brand-name\{font-size:22px;min-width:0;overflow:hidden/
  );
  assert.match(owner, /\.owner-ui-unified \.role-badge\{max-width:58px;overflow:hidden/);
  assert.match(owner, /\.owner-ui-unified \.topbar-right \.btn-ghost\{min-width:44px/);
});

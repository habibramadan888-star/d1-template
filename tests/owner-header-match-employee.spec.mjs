import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner header matches employee header structure and avoids backend topbar density", async () => {
  const owner = await readFile("deploy-worker/public/index.html", "utf8");
  const header = owner.match(/<header class="topbar hl-header"[\s\S]*?<\/header>/)?.[0] || "";

  assert.match(header, /class="brand"/);
  assert.match(header, /class="brand-icon"/);
  assert.match(header, /class="brand-name"/);
  assert.match(header, /class="brand-business">流水管理<\/span>/);
  assert.match(header, /id="roleBadge"/);
  assert.match(header, /id="btnDashboard"/);
  assert.doesNotMatch(header, /馃|鎺|�|录入/);

  assert.match(
    owner,
    /\.owner-ui-unified \.topbar-row1,\n\.owner-ui-unified \.topbar-row2\{\n  width:min\(980px,100%\)/
  );
  assert.match(owner, /\.owner-ui-unified \.brand-icon\{\n  width:70px;\n  height:70px/);
  assert.match(owner, /\.owner-ui-unified \.brand-name\{\n  display:flex/);
});

test("owner mobile header has the same compact employee shell behavior", async () => {
  const owner = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(owner, /@media\(max-width:720px\)/);
  assert.match(
    owner,
    /\.owner-ui-unified \.topbar-row1\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/
  );
  assert.match(owner, /\.owner-ui-unified \.brand-icon\{width:42px;height:42px/);
  assert.match(
    owner,
    /\.owner-ui-unified \.brand-name\{font-size:20px;min-width:0;overflow:hidden/
  );
  assert.match(owner, /\.owner-ui-unified \.topbar-right\{justify-content:flex-end/);
});

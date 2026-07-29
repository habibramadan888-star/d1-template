import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("control panel mobile shell avoids compressed topbar layout", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(
    html,
    /#cp-overlay \.topbar-inner\{display:grid!important;grid-template-columns:1fr!important/
  );
  assert.match(
    html,
    /#cp-overlay \.topbar-actions\{display:grid!important;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/
  );
  assert.match(
    html,
    /#cp-overlay \.filter-pills\{display:grid!important;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/
  );
});

test("control panel room details become readable cards on mobile", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");
  const cp = await readFile("deploy-worker/public/index-51-cp.js", "utf8");

  assert.match(
    html,
    /#cp-overlay \.room-body table,[\s\S]*#cp-overlay \.room-body td\{display:block!important/
  );
  assert.match(cp, /data-label="卡片 \/ 租客"/);
  assert.match(cp, /data-label="截止日期"/);
  assert.match(cp, /data-label="状态"/);
});

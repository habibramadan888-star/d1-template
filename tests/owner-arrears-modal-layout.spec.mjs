import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("arrears detail modal uses mobile cards instead of a narrow table", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");
  const cp = await readFile("deploy-worker/public/index-51-cp.js", "utf8");

  assert.match(html, /<div class="modal-list" id="modalBody"><\/div>/);
  assert.doesNotMatch(html, /<tbody id="modalBody"><\/tbody>/);
  assert.match(cp, /arrears-compact-row/);
  assert.match(cp, /arrears-compact-meta/);
  assert.match(cp, /cp_overdueText/);
  assert.match(cp, /cp_modalAmount/);
});

test("arrears detail modal keeps copy export close controls readable on mobile", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(html, /#modalOverlay \.modal-actions\{display:flex;gap:8px;flex-wrap:wrap/);
  assert.match(
    html,
    /#modalOverlay \.modal-actions\{width:100%;display:grid!important;grid-template-columns:1fr 1fr 42px/
  );
  assert.match(html, /#modalOverlay \.modal-close\{min-height:38px!important/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner mobile typography and spacing are compact enough for business use", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(
    html,
    /\.owner-ui-unified \.nav-btn\{min-width:0!important;width:100%;height:58px;font-size:15px/
  );
  assert.match(html, /\.owner-ui-unified \.page-title\{font-size:28px\}/);
  assert.match(
    html,
    /\.owner-ui-unified \.page-sub\{font-size:13px;margin-bottom:16px!important\}/
  );
  assert.match(
    html,
    /\.owner-ui-unified \.card-head,\.owner-ui-unified \.card-body\{padding:14px\}/
  );
  assert.match(html, /\.owner-ui-unified \.kpi\{min-height:82px;padding:12px;border-radius:18px\}/);
});

test("owner density keeps employee visual shell and avoids oversized backend display", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(html, /body class="hl-page owner-ui-unified"/);
  assert.match(
    html,
    /\.owner-ui-unified \.owner-overview-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/
  );
  assert.match(html, /\.owner-ui-unified \.role-badge\{display:none!important/);
});

test("financial formula remains unchanged", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /cashBal:r2\(ci-cashOut\),bankBal:r2\(bi-bankOut\),total:r2\(ci\+bi\)/);
  assert.match(js, /const netIncome=t\.total/);
});

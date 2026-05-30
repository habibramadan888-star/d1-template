import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PRODUCTION_CUTOVER_STATUS,
  getCommercialLaunchStatusForUnifiedLogin
} from "../modules/auth/unified-login-routing.mjs";

async function readAssets() {
  const [owner, ownerJs, employee] = await Promise.all([
    readFile("deploy-worker/public/index.html", "utf8"),
    readFile("deploy-worker/public/index-51-main.js", "utf8"),
    readFile("deploy-worker/public/employee-v3.html", "utf8")
  ]);
  return { owner, ownerJs, employee };
}

function ownerNav(owner) {
  return owner.match(/<nav class="nav" id="navTabs">[\s\S]*?<\/nav>/)?.[0] || "";
}

function ownerDefaultShell(owner) {
  return (
    owner.match(/<header class="topbar hl-header"[\s\S]*?<main class="container hl-shell"/)?.[0] ||
    ""
  );
}

test("owner primary navigation is compact and does not expose employee entry", async () => {
  const { owner } = await readAssets();
  const nav = ownerNav(owner);

  assert.doesNotMatch(nav, /data-view="entry"/);
  assert.doesNotMatch(nav, />\s*录入\s*</);
  assert.match(nav, /data-view="overview" id="navOverview"/);
  assert.match(nav, />总览<span class="en-sub">OVERVIEW<\/span>/);
  assert.match(nav, /data-view="arrears" id="navArrears"/);
  assert.match(nav, />欠款<span class="en-sub">ARREARS<\/span>/);
  assert.doesNotMatch(nav, /data-view="analysis" id="navAnalysis"|ANALYTICS|欠款管理/);
});

test("owner homepage shell does not show Add Entry or direct payment buttons", async () => {
  const { owner } = await readAssets();
  const shell = ownerDefaultShell(owner);

  assert.doesNotMatch(shell, /添加记录|ADD ENTRY|现金收款|银行转账/);
  assert.match(
    owner,
    /id="view-entry" class="view hidden owner-entry-disabled" aria-hidden="true"/
  );
  assert.match(
    owner,
    /\.owner-ui-unified #view-entry\.owner-entry-disabled\{display:none!important\}/
  );
});

test("owner entry route is hidden and guarded for owner roles", async () => {
  const { owner, ownerJs } = await readAssets();

  assert.match(owner, /id="ownerEntryTool"[^>]*hidden aria-hidden="true"/);
  assert.match(owner, /\.owner-ui-unified \.owner-admin-tool\{display:none!important\}/);
  assert.match(ownerJs, /if\(isOwnerShellRole\(\)&&v==='entry'\)/);
  assert.match(ownerJs, /v='overview'/);
});

test("control panel button uses stable inline SVG and no emoji fallback", async () => {
  const { owner } = await readAssets();
  const topbar = owner.match(/<header class="topbar hl-header"[\s\S]*?<\/header>/)?.[0] || "";
  const button =
    topbar.match(/<button class="btn btn-primary owner-dashboard-btn"[\s\S]*?<\/button>/)?.[0] ||
    "";

  assert.match(button, /<svg class="ico"><use href="#i-chart"\/><\/svg>/);
  assert.match(button, /<span class="btn-label">控制台<\/span>/);
  assert.doesNotMatch(button, /📊|⚙️|🔧|📈/);
});

test("mobile topbar remains constrained inside viewport", async () => {
  const { owner } = await readAssets();

  assert.match(owner, /\.owner-ui-unified \.topbar\{overflow:hidden\}/);
  assert.match(owner, /grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(owner, /\.owner-ui-unified \.owner-dashboard-btn\{max-width:96px/);
  assert.match(owner, /\.owner-ui-unified \.topbar-right \.btn-ghost\{min-width:40px/);
});

test("employee page still owns employee entry workflow", async () => {
  const { employee } = await readAssets();

  assert.match(employee, /data-view="entry"/);
  assert.match(employee, /事件录入|添加记录|员工/);
  assert.match(employee, /现金|银行/);
});

test("dashboard and financial formula markers remain unchanged", async () => {
  const { ownerJs } = await readAssets();

  assert.match(ownerJs, /const totalDue =r\(ie\.reduce/);
  assert.match(ownerJs, /const totalPaid=r\(ie\.reduce/);
  assert.match(ownerJs, /const totalDef =r\(ie\.reduce/);
  assert.match(ownerJs, /const netIncome=t\.total/);
});

test("commercial launch remains no-go", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});

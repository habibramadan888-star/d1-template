import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PRODUCTION_CUTOVER_STATUS,
  getCommercialLaunchStatusForUnifiedLogin
} from "../modules/auth/unified-login-routing.mjs";

async function readAssets() {
  const [owner, employee, ownerJs] = await Promise.all([
    readFile("deploy-worker/public/index.html", "utf8"),
    readFile("deploy-worker/public/employee-v3.html", "utf8"),
    readFile("deploy-worker/public/index-51-main.js", "utf8")
  ]);
  return { owner, employee, ownerJs };
}

test("owner and employee use the same mobile product shell primitives", async () => {
  const { owner, employee } = await readAssets();

  assert.match(employee, /<div class="top">/);
  assert.match(employee, /<div class="brand">/);
  assert.match(employee, /<div class="tabs">/);

  assert.match(owner, /<header class="topbar hl-header"/);
  assert.match(owner, /\.owner-ui-unified \.topbar\{/);
  assert.match(owner, /\.owner-ui-unified \.brand\{/);
  assert.match(owner, /\.owner-ui-unified \.nav\{/);
  assert.match(owner, /brand-business">流水管理<\/span>/);
});

test("owner default shell is overview first, not backend analysis first", async () => {
  const { owner, ownerJs } = await readAssets();

  assert.match(owner, /id="view-overview" class="view"/);
  assert.match(owner, /id="ownerOverviewContent"/);
  assert.match(
    ownerJs,
    /function defaultViewForRole\(\)\{return isOwnerShellRole\(\)\?'overview':'entry';\}/
  );
  assert.match(ownerJs, /function renderOwnerOverview\(\)/);
});

test("owner shell keeps entry workflow out of the owner primary experience", async () => {
  const { owner } = await readAssets();
  const nav = owner.match(/<nav class="nav" id="navTabs">[\s\S]*?<\/nav>/)?.[0] || "";
  const overview =
    owner.match(/<section id="view-overview"[\s\S]*?<section id="view-history"/)?.[0] || "";

  assert.doesNotMatch(nav, />\s*录入\s*</);
  assert.doesNotMatch(nav, /ADD ENTRY|data-view="entry"/);
  assert.doesNotMatch(overview, /添加记录|ADD ENTRY|现金收款|银行转账/);
});

test("dashboard and financial formula markers remain unchanged", async () => {
  const { ownerJs } = await readAssets();

  assert.match(ownerJs, /const totalDue =r\(ie\.reduce/);
  assert.match(ownerJs, /const totalPaid=r\(ie\.reduce/);
  assert.match(ownerJs, /const totalDef =r\(ie\.reduce/);
  assert.match(ownerJs, /const netIncome=t\.total/);
});

test("production cutover remains PRODUCTION_NO_GO", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});

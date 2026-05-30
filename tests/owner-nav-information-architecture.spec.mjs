import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner primary nav no longer exposes employee-style entry as a main tab", async () => {
  const owner = await readFile("deploy-worker/public/index.html", "utf8");
  const nav = owner.match(/<nav class="nav" id="navTabs">[\s\S]*?<\/nav>/)?.[0] || "";

  assert.doesNotMatch(nav, /data-view="entry"/);
  assert.doesNotMatch(nav, />\s*录入\s*</);
  assert.match(nav, /data-view="overview" id="navOverview"/);
  assert.match(nav, /data-view="arrears" id="navArrears"/);
  assert.doesNotMatch(nav, /id="navArrears"[^>]*locked/);
  assert.match(nav, />总览<span class="en-sub">OVERVIEW<\/span>/);
  assert.match(nav, />欠款管理<span class="en-sub">ARREARS<\/span>/);
  assert.match(nav, /data-view="history"/);
  assert.match(nav, /data-view="analysis" id="navAnalysis"/);
  assert.match(nav, />分析<span class="en-sub">ANALYTICS<\/span>/);
  assert.match(nav, /data-view="clients"/);
});

test("legacy owner proxy entry remains hidden, not primary navigation", async () => {
  const owner = await readFile("deploy-worker/public/index.html", "utf8");
  const nav = owner.match(/<nav class="nav" id="navTabs">[\s\S]*?<\/nav>/)?.[0] || "";

  assert.match(owner, /id="ownerEntryTool"/);
  assert.match(owner, /hidden aria-hidden="true"/);
  assert.match(owner, /title="[^"]*employee-v3\.html"/);
  assert.doesNotMatch(owner, /title="[^"]*录入[^"]*"/);
  assert.match(owner, /\.owner-ui-unified \.owner-admin-tool\{display:none!important\}/);
  assert.doesNotMatch(nav, /ownerEntryTool|代录入|管理工具/);
});

test("employee page still owns the entry workflow", async () => {
  const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(employee, /id="view-entry"/);
  assert.match(employee, /data-view="entry"/);
  assert.match(employee, /员工/);
});

test("dashboard and financial formula markers remain unchanged", async () => {
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ownerJs, /const totalDue =r\(ie\.reduce/);
  assert.match(ownerJs, /const totalPaid=r\(ie\.reduce/);
  assert.match(ownerJs, /const totalDef =r\(ie\.reduce/);
  assert.match(ownerJs, /const netIncome=t\.total/);
});

test("owner arrears view keeps selected tab during bootstrap and shows loading state", async () => {
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const ownerHtml = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(ownerJs, /const initialView=defaultViewForRole\(\)/);
  assert.match(ownerJs, /switchView\(state\.view\|\|initialView\)/);
  assert.match(ownerJs, /if\(v==='arrears'\)\{loadArrearsForOwner\(\{showLoading:true\}\);\}/);
  assert.match(ownerJs, /function showArrearsLoading\(\)/);
  assert.match(ownerJs, /const active=visible\.filter\(isArrearTaskOpen\)/);
  assert.match(ownerJs, /overdue-row/);
  assert.match(ownerHtml, /\.arrear-row\.overdue-row/);
});

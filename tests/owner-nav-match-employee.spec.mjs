import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner nav uses employee-style pill tabs and owner information architecture", async () => {
  const owner = await readFile("deploy-worker/public/index.html", "utf8");
  const nav = owner.match(/<nav class="nav" id="navTabs">[\s\S]*?<\/nav>/)?.[0] || "";

  assert.match(nav, /data-view="overview" id="navOverview"/);
  assert.match(nav, />总览<span class="en-sub">OVERVIEW<\/span>/);
  assert.match(nav, />历史<span class="en-sub">HISTORY<\/span>/);
  assert.match(nav, />分析<span class="en-sub">ANALYTICS<\/span>/);
  assert.match(nav, />客户<span class="en-sub">CLIENTS<\/span>/);
  assert.doesNotMatch(nav, />\s*录入\s*</);
  assert.doesNotMatch(nav, /网络<span class="en-sub">TOOLS<\/span>/);

  assert.match(owner, /\.owner-ui-unified \.nav\{\n  display:grid/);
  assert.match(owner, /\.owner-ui-unified \.nav-btn\{\n  min-width:0!important/);
  assert.match(
    owner,
    /\.owner-ui-unified \.nav-btn\.active\{\n  background:linear-gradient\(180deg,#10ad5a,#078d42\)/
  );
});

test("employee entry nav remains intact on employee-v3", async () => {
  const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(employee, /data-view="entry">录入<span class="en">ENTRY<\/span>/);
  assert.match(employee, /data-view="arrears">跟进<span class="en">FOLLOW-UP<\/span>/);
  assert.match(employee, /data-view="export">导出<span class="en">EXPORT<\/span>/);
});

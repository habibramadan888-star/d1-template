import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const argsOpen = source.indexOf("(", start);
  let parenDepth = 0;
  let argsClose = -1;
  for (let i = argsOpen; i < source.length; i += 1) {
    if (source[i] === "(") parenDepth += 1;
    if (source[i] === ")") parenDepth -= 1;
    if (parenDepth === 0) {
      argsClose = i;
      break;
    }
  }
  const open = source.indexOf("{", argsClose);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("overview preview uses backend preview and shows N over backend total", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const renderOverview = extractFunction(js, "renderOwnerOverviewArrearsPanel");

  assert.match(renderOverview, /pool\.preview_tasks/);
  assert.match(renderOverview, /state\.arrearsSummary/);
  assert.match(renderOverview, /pagination\.total_count/);
  assert.match(renderOverview, /data-owner-arrears-preview-count="true"/);
  assert.match(renderOverview, /预览 \$\{pageRows\.length\} \/ 共 \$\{totalCount\}/);
});

test("view all and load more are backed by API limit state", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const toggle = extractFunction(js, "toggleOverviewArrearsAll");
  const renderOverview = extractFunction(js, "renderOwnerOverviewArrearsPanel");
  const renderPanel = extractFunction(js, "renderArrearsPanel");

  assert.match(toggle, /targetTotal/);
  assert.match(toggle, /loadArrearsForOwner\(\{showLoading:false,limit:state\.arrearsLimit\}\)/);
  assert.match(renderOverview, /state\.arrearsPoolResult\?\.has_more/);
  assert.match(renderPanel, /state\.arrearsPoolResult\?\.has_more/);
  assert.match(
    renderPanel,
    /loadArrearsForOwner\(\{showLoading:false,limit:state\.arrearsLimit\}\)/
  );
});

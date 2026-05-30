import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function visiblePortal(html) {
  return html.slice(html.indexOf("<main"), html.indexOf("<script>"));
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("owner internal navigation contains arrears management entry", async () => {
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(html, /data-view="arrears"/);
  assert.match(html, /id="navArrears"/);
  assert.match(html, /欠款管理/);
  assert.match(js, /if\(v==='arrears'\)\{loadArrearsForOwner\(\{showLoading:true\}\);\}/);
});

test("main three-door portal does not expose arrears as login identity", async () => {
  const portal = await readFile("deploy-worker/public/portal.html", "utf8");
  const visible = visiblePortal(portal);

  assert.equal([...visible.matchAll(/data-portal="/g)].length, 3);
  assert.doesNotMatch(visible, /欠款管理/);
  assert.doesNotMatch(visible, /ARREARS FOLLOW-UP/i);
  assert.doesNotMatch(visible, /data-portal="arrears"/);
});

test("overview arrears summary is a summary, not the full arrears page", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const overview = extractFunction(js, "renderOwnerOverview");

  assert.match(overview, /OUTSTANDING FOLLOW-UP/);
  assert.doesNotMatch(overview, /data-owner-arrears-info-pool/);
  assert.doesNotMatch(overview, /WhatsApp 导出/);
});

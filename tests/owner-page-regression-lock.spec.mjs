import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("owner overview remains a dashboard and does not reintroduce quick action boxes", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const overview = extractFunction(js, "renderOwnerOverview");

  assert.doesNotMatch(overview, /QUICK ACTIONS/i);
  assert.doesNotMatch(overview, /快速进入/);
  assert.doesNotMatch(overview, /data-quick-action|quick-action|quickActions/i);
});

test("arrears remains inside owner internal navigation, not root portal", async () => {
  const ownerHtml = await readFile("deploy-worker/public/index-51.html", "utf8");
  const portalHtml = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.match(ownerHtml, /data-view="arrears"/);
  assert.match(ownerHtml, />欠款<span class="en-sub">ARREARS<\/span>/);
  assert.doesNotMatch(portalHtml, /欠款管理|ARREARS FOLLOW-UP|要求员工更新|下发员工/);
});

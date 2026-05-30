import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function ownerNav(html) {
  return html.match(/<nav class="nav" id="navTabs">[\s\S]*?<\/nav>/)?.[0] || "";
}

test("three-door portal exposes only employee owner and admin entrances", async () => {
  const portal = await readFile("deploy-worker/public/portal.html", "utf8");
  const doors = [...portal.matchAll(/data-portal="([^"]+)"/g)].map((m) => m[1]);

  assert.deepEqual(doors, ["employee", "owner", "admin"]);
  assert.doesNotMatch(portal, /quick action|QUICK ACTIONS|快速进入|欠款管理/);
});

test("owner page contains all primary modules and no employee entry tab", async () => {
  const html = await readFile("deploy-worker/public/index-51.html", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const nav = ownerNav(html);

  for (const view of ["overview", "arrears", "history", "analysis", "clients", "wifi"]) {
    assert.match(nav, new RegExp(`data-view="${view}"`));
    assert.match(js, new RegExp(`'${view}'`));
    assert.match(html, new RegExp(`id="view-${view}"`));
  }

  assert.doesNotMatch(nav, /data-view="entry"/);
  assert.match(js, /function switchView\(v\)/);
});

test("owner regression blockers remain locked", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");

  assert.doesNotMatch(js, /signal is aborted without reason/);
  assert.doesNotMatch(js, /QUICK ACTIONS|快速进入/);
  assert.match(gate, /Overall: `PRODUCTION_NO_GO`/);
});

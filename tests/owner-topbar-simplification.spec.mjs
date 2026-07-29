import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner topbar no longer shows owner role badge", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const topbar = html.match(/<header class="topbar hl-header"[\s\S]*?<\/header>/)?.[0] || "";

  assert.match(topbar, /id="roleBadge" hidden aria-hidden="true"/);
  assert.match(html, /\.owner-ui-unified \.role-badge\{\s*display:none!important/);
  assert.doesNotMatch(topbar, />老板</);
  assert.doesNotMatch(js, /badge\.textContent\s*=\s*['"]老板['"]/);
  assert.match(js, /badge\.hidden=true/);
});

test("role authority logic remains server/session based", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(js, /function defaultViewForRole/);
  assert.match(js, /isOwnerShellRole\(\)/);
  assert.match(js, /fetchCurrentAuthUser/);
});

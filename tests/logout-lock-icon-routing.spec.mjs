import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner lock icon uses unified logout routing", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(html, /onclick="logout\(\)"/);
  assert.match(js, /async function logout\(\)/);
  assert.match(js, /\/api\/logout/);
  assert.match(js, /clearLegacyAuthStorage\(\)/);
  assert.match(js, /redirectToUnifiedLogin\('signed_out'\)/);
  assert.doesNotMatch(js, /showOwnerLoginFallback\(\);\s*document\.getElementById\('topbar'\)/);
});

test("logout clears legacy role and employee auth caches", async () => {
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const unified = await readFile("deploy-worker/public/unified-login.html", "utf8");

  for (const key of ["homelink:cloud_token", "empv3:user", "empv3:operator", "owner:role"]) {
    assert.match(js, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(unified, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

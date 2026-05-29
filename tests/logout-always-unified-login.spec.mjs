import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner lock/logout clears auth state and routes only to root portal", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(html, /onclick="logout\(\)"/);
  assert.match(js, /async function logout\(\)/);
  assert.match(js, /\/auth\/logout/);
  assert.match(js, /clearLegacyAuthStorage\(\)/);
  assert.match(js, /redirectToUnifiedLogin\('signed_out'\)/);
  assert.match(js, /const UNIFIED_LOGIN_DESTINATION='\/'/);
  assert.doesNotMatch(js, /location\.href\s*=\s*['"]\.\/employee-v3\.html['"]/);
});

test("employee auth routing also uses root portal for sign-out/session failure", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /const UNIFIED_LOGIN_DESTINATION='\/'/);
  assert.match(html, /redirectToUnifiedLogin\('employee_session_required'\)/);
  assert.match(html, /redirectToUnifiedLogin\('employee_session_check_failed'\)/);
});

test("unified clear session clears legacy role caches without storing password", async () => {
  const unified = await readFile("deploy-worker/public/unified-login.html", "utf8");

  for (const key of ["homelink:role", "owner:role", "empv3:user", "empv3:operator"]) {
    assert.match(unified, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(unified, /localStorage\.setItem\([^)]*password/i);
  assert.doesNotMatch(unified, /localStorage\.setItem\([^)]*pin/i);
});

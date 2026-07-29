import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("old employee PIN login remains hidden and normal flow redirects to root", async () => {
  const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(employee, /<div class="login-overlay hidden" id="loginOverlay" aria-hidden="true">/);
  assert.match(employee, /const UNIFIED_LOGIN_DESTINATION='\/'/);
  assert.doesNotMatch(employee, /classList\.remove\('hidden'\)/);
});

test("old owner login fallback cannot authenticate users", async () => {
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const fn = ownerJs.match(/async function submitCode\(\)\{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(ownerJs, /const UNIFIED_LOGIN_DESTINATION='\/'/);
  assert.match(fn, /redirectToUnifiedLogin\('legacy_owner_login_disabled'\)/);
  assert.doesNotMatch(fn, /\/auth\/login/);
});

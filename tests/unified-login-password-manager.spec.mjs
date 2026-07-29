import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("unified login exposes browser password manager fields", async () => {
  const html = await readFile("deploy-worker/public/unified-login.html", "utf8");

  assert.match(
    html,
    /id="browserUsername" name="username" autocomplete="username" value="homelink-owner"/
  );
  assert.match(html, /id="accountId" name="accountId" autocomplete="username"/);
  assert.match(html, /id="secret" name="secret" type="password" autocomplete="current-password"/);
  assert.match(html, /const OWNER_PASSWORD_MANAGER_USERNAME = "homelink-owner"/);
  assert.match(html, /browserUsername\.value = id \|\| OWNER_PASSWORD_MANAGER_USERNAME/);
});

test("unified login never stores password or PIN in web storage", async () => {
  const html = await readFile("deploy-worker/public/unified-login.html", "utf8");
  const storageWrites = [
    ...html.matchAll(/(?:localStorage|sessionStorage)\.setItem\(([^)]*)\)/g)
  ].map((m) => m[0]);
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");

  assert.ok(storageWrites.every((write) => !/password|pin|secret/i.test(write)));
  assert.match(html, /localStorage\.setItem\(REMEMBER_ACCOUNT_KEY,\s*account\)/);
  assert.doesNotMatch(html, /sessionStorage\.setItem\([^)]*(password|pin|secret)/i);
  assert.match(readiness, /PRODUCTION_NO_GO/);
});

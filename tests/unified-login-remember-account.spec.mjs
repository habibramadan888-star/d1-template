import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/unified-login.html";

test("unified login can remember username only", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /id="rememberAccount"/);
  assert.match(html, />记住账号</);
  assert.match(html, /const REMEMBER_ACCOUNT_KEY = "homelink:remember_account"/);
  assert.match(html, /localStorage\.setItem\(REMEMBER_ACCOUNT_KEY,\s*account\)/);
  assert.match(html, /accountId\.value = remembered/);
});

test("unified login never stores password or PIN", async () => {
  const html = await readFile(htmlPath, "utf8");
  const storageWrites = [
    ...html.matchAll(/(?:localStorage|sessionStorage)\.setItem\(([^)]*)\)/g)
  ].map((m) => m[1]);

  assert.ok(storageWrites.some((write) => write.includes("REMEMBER_ACCOUNT_KEY")));
  assert.ok(storageWrites.every((write) => !/password|pin|secret/i.test(write)));
  assert.match(html, /autocomplete="username"/);
  assert.match(html, /autocomplete="current-password"/);
});

test("clear session does not leak password", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /async function clearSession\(\)/);
  assert.match(html, /"homelink:cloud_token"/);
  assert.match(html, /localStorage\.removeItem\(key\)/);
  assert.match(html, /sessionStorage\.removeItem\(key\)/);
  assert.match(html, /secret\.value = ""/);
  assert.doesNotMatch(html, /localStorage\.setItem\([^)]*(password|pin|secret)/i);
});

test("production cutover remains PRODUCTION_NO_GO", async () => {
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");

  assert.match(readiness, /PRODUCTION_NO_GO/);
});

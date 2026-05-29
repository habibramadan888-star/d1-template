import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("root portal uses employee-login-equivalent premium card and background", async () => {
  const html = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.match(html, /<main class="shell"/);
  assert.match(html, /radial-gradient\(circle at 78% 12%,rgba\(21,196,107,\.2\)/);
  assert.match(html, /backdrop-filter:blur\(20px\) saturate\(160%\)/);
  assert.match(html, /width:min\(430px,100%\)/);
  assert.match(html, /border-radius:30px/);
});

test("root portal keeps one three-door entry without technical notes", async () => {
  const html = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.match(html, /data-portal="employee"/);
  assert.match(html, /data-portal="owner"/);
  assert.match(html, /data-portal="admin"/);
  assert.match(html, /请选择入口/);
  assert.doesNotMatch(html, /PRODUCTION_NO_GO|DB = homelink|server role|D1|cutover/i);
});

test("root portal keeps server-authority role routing", async () => {
  const html = await readFile("deploy-worker/public/portal.html", "utf8");

  assert.match(html, /\/auth\/employee-login/);
  assert.match(html, /\/auth\/login/);
  assert.match(html, /\/api\/me/);
  assert.match(html, /location\.replace\(target\)/);
  assert.doesNotMatch(html, /localStorage\.getItem\(["']role["']\)/);
});

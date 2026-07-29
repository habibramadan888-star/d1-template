import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Header account and logout controls use one compact size/token strategy", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /\.employee-identity-card,\s*\.employee-logout\{/);
  assert.match(html, /width:106px;/);
  assert.match(html, /min-width:106px;/);
  assert.match(html, /max-width:106px;/);
  assert.match(html, /min-height:36px;/);
  assert.match(html, /border-radius:15px;/);
  assert.match(html, /width:82px;/);
  assert.match(html, /min-height:32px;/);
});

test("Header keeps one identity display and one explicit logout action", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /id="employeeIdentityCard"/);
  assert.match(html, /id="btnEmployeeLogoutTop"/);
  assert.match(html, /employee-user-button\{\s*display:none!important/);
  assert.doesNotMatch(html, /data-view="export"/);
});

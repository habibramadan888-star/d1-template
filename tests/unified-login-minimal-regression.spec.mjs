import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PRODUCTION_CUTOVER_STATUS,
  getCommercialLaunchStatusForUnifiedLogin
} from "../modules/auth/unified-login-routing.mjs";

test("unified-login remains a minimal login page with no technical notes", async () => {
  const html = await readFile("deploy-worker/public/unified-login.html", "utf8");
  const visible = html.slice(html.indexOf("<main"), html.indexOf("<script>"));

  assert.match(visible, /Homelink 登录/);
  assert.match(visible, /id="accountId"/);
  assert.match(visible, /id="secret"/);
  assert.match(visible, /id="loginButton"/);
  assert.match(visible, /id="logoutButton"/);

  for (const forbidden of [
    /PRODUCTION_NO_GO/,
    /DB = homelink/i,
    /write-style QA/i,
    /server role/i,
    /employee-v3\.html|index\.html/,
    /One login for every internal role/i,
    /Production cutover/i,
    /D1|staging|cutover/i
  ]) {
    assert.doesNotMatch(visible, forbidden);
  }
});

test("production cutover remains PRODUCTION_NO_GO", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});

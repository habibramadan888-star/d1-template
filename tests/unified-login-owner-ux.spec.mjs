import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PRODUCTION_CUTOVER_STATUS,
  getCommercialLaunchStatusForUnifiedLogin,
  resolveOwnerBootstrapUx,
  resolveUnifiedExistingSessionUx
} from "../modules/auth/unified-login-routing.mjs";

test("owner destination initially shows loading state, not old login form", () => {
  const decision = resolveOwnerBootstrapUx({ mePending: true });

  assert.equal(decision.action, "SHOW_AUTH_LOADING");
  assert.equal(decision.showLegacyLogin, false);
  assert.equal(decision.authority, "/api/me");
});

test("valid owner /api/me enters dashboard", () => {
  const decision = resolveOwnerBootstrapUx({
    meStatus: 200,
    meClaim: { role: "manager" }
  });

  assert.equal(decision.action, "ENTER_OWNER_APP");
  assert.equal(decision.showLegacyLogin, false);
});

test("/api/me 401 shows login form only after check", () => {
  const decision = resolveOwnerBootstrapUx({ meStatus: 401 });

  assert.equal(decision.action, "SHOW_LOGIN");
  assert.equal(decision.showLegacyLogin, true);
});

test("employee session does not enter owner dashboard", () => {
  const decision = resolveOwnerBootstrapUx({
    meStatus: 200,
    meClaim: { role: "employee" }
  });

  assert.equal(decision.action, "REDIRECT");
  assert.equal(decision.showLegacyLogin, false);
});

test("unified-login with existing owner session shows signed-in panel", () => {
  const decision = resolveUnifiedExistingSessionUx({
    meStatus: 200,
    meClaim: { role: "owner" }
  });

  assert.equal(decision.action, "SHOW_SIGNED_IN_PANEL");
  assert.equal(decision.autoRedirect, false);
  assert.equal(decision.destination, "/index.html");
});

test("unified-login supports explicit auto redirect only", () => {
  const decision = resolveUnifiedExistingSessionUx({
    meStatus: 200,
    meClaim: { role: "owner" },
    autoRedirect: true
  });

  assert.equal(decision.action, "AUTO_REDIRECT");
  assert.equal(decision.autoRedirect, true);
});

test("invalid /api/me does not enter dashboard", () => {
  const decision = resolveOwnerBootstrapUx({
    meStatus: 500,
    meClaim: { role: "contractor" }
  });

  assert.equal(decision.action, "DENY");
  assert.equal(decision.showLegacyLogin, false);
});

test("owner app asset contains loading state and not initial login flicker", async () => {
  const html = await readFile("deploy-worker/public/index.html", "utf8");
  const js = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(html, /ownerAuthLoading/);
  assert.match(html, /ownerLoginPanel" style="display:none"/);
  assert.match(js, /showOwnerAuthChecking/);
  assert.match(js, /showOwnerLoginFallback/);
  assert.match(js, /showOwnerAppShell/);
});

test("unified login asset uses signed-in panel instead of immediate redirect loop", async () => {
  const html = await readFile("deploy-worker/public/unified-login.html", "utf8");

  assert.match(html, /shared-design-tokens\.css/);
  assert.match(html, /hl-page unified-login-page/);
  assert.match(html, /signedInPanel/);
  assert.match(html, /Continue to owner dashboard/);
  assert.match(html, /shouldAutoRedirectExistingSession/);
  assert.match(html, /get\("auto"\) === "1"/);
  assert.match(html, /showSignedInPanel\(me\)/);
});

test("production cutover remains PRODUCTION_NO_GO", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PRODUCTION_CUTOVER_STATUS,
  getCommercialLaunchStatusForUnifiedLogin
} from "../modules/auth/unified-login-routing.mjs";

test("owner client credit page uses shared card, input, select, button, and legend tokens", async () => {
  const owner = await readFile("deploy-worker/public/index.html", "utf8");

  assert.match(owner, /id="ccSummary" class="cc-summary"/);
  assert.match(owner, /class="cc-toolbar"/);
  assert.match(owner, /class="inp hl-input cc-search-input"/);
  assert.match(owner, /class="sel hl-select cc-filter-select"/);
  assert.match(owner, /class="btn btn-ghost hl-button hl-button-secondary cc-refresh-btn"/);
  assert.match(owner, /class="cc-legend"/);
  assert.match(owner, /class="cc-legend-item"/);
  assert.match(owner, /\.owner-ui-unified \.cc-toolbar/);
  assert.match(
    owner,
    /\.owner-ui-unified \.cc-card\{margin-bottom:0;border-radius:var\(--radius-lg\)!important\}/
  );
});

test("client credit controls no longer use old inline input/select/button styling", async () => {
  const owner = await readFile("deploy-worker/public/index.html", "utf8");
  const clients = owner.match(/<section id="view-clients"[\s\S]*?<\/section>/)?.[0] || "";

  assert.doesNotMatch(clients, /id="ccSearch"[^>]*style=/);
  assert.doesNotMatch(clients, /id="ccFilter"[^>]*style=/);
  assert.doesNotMatch(clients, /onclick="ccRender\(true\)">🔄/);
});

test("production cutover remains PRODUCTION_NO_GO", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});

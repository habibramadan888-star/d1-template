import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PRODUCTION_CUTOVER_STATUS,
  getCommercialLaunchStatusForUnifiedLogin
} from "../modules/auth/unified-login-routing.mjs";

const ownerFiles = ["deploy-worker/public/index.html", "deploy-worker/public/index-51.html"];

async function readOwnerAssets() {
  const [tokens, owner, ownerAlt, employee, login, ownerJs] = await Promise.all([
    readFile("deploy-worker/public/shared-design-tokens.css", "utf8"),
    readFile(ownerFiles[0], "utf8"),
    readFile(ownerFiles[1], "utf8"),
    readFile("deploy-worker/public/employee-v3.html", "utf8"),
    readFile("deploy-worker/public/unified-login.html", "utf8"),
    readFile("deploy-worker/public/index-51-main.js", "utf8")
  ]);
  return { tokens, owner, ownerAlt, employee, login, ownerJs };
}

test("shared design tokens expose employee-derived typography, color, radius, and spacing", async () => {
  const { tokens } = await readOwnerAssets();

  for (const token of [
    "--font-family",
    "--font-size-base",
    "--font-size-xl",
    "--font-weight-bold",
    "--line-height-normal",
    "--color-bg",
    "--color-card",
    "--color-primary",
    "--color-text-primary",
    "--color-border",
    "--radius-xl",
    "--shadow-elevated",
    "--space-md",
    "--input-height",
    "--button-height"
  ]) {
    assert.match(tokens, new RegExp(token));
  }

  assert.match(tokens, /PingFang SC/);
  assert.match(tokens, /Microsoft YaHei/);
  assert.match(tokens, /#09a64f/);
});

test("shared component classes exist for owner and employee UI alignment", async () => {
  const { tokens } = await readOwnerAssets();

  for (const className of [
    ".hl-page",
    ".hl-shell",
    ".hl-header",
    ".hl-card",
    ".hl-card-title",
    ".hl-stat-card",
    ".hl-stat-value",
    ".hl-stat-label",
    ".hl-button",
    ".hl-button-primary",
    ".hl-button-secondary",
    ".hl-button-danger",
    ".hl-input",
    ".hl-select",
    ".hl-label",
    ".hl-form-group",
    ".hl-grid",
    ".hl-section",
    ".hl-section-title",
    ".hl-alert",
    ".hl-alert-error",
    ".hl-alert-success",
    ".hl-badge",
    ".hl-loading",
    ".hl-skeleton",
    ".hl-empty-state",
    ".hl-table-card",
    ".hl-mobile-card"
  ]) {
    assert.match(tokens, new RegExp(className.replace(".", "\\.")));
  }
});

test("owner, employee, and unified login pages all load shared design tokens", async () => {
  const { owner, ownerAlt, employee, login } = await readOwnerAssets();

  for (const html of [owner, ownerAlt, employee, login]) {
    assert.match(html, /shared-design-tokens\.css/);
  }

  assert.match(owner, /class="hl-page owner-ui-unified"/);
  assert.match(ownerAlt, /class="hl-page owner-ui-unified"/);
  assert.match(employee, /class="hl-page employee-ui"/);
  assert.match(login, /class="hl-page unified-login-page"/);
});

test("owner uses shared font, button, input, card, and stat card patterns", async () => {
  const { owner, ownerAlt, ownerJs } = await readOwnerAssets();

  for (const html of [owner, ownerAlt]) {
    assert.match(html, /owner-ui-unified/);
    assert.match(html, /font-family:var\(--font-family\)/);
    assert.match(html, /var\(--button-height\)/);
    assert.match(html, /var\(--input-height\)/);
    assert.match(html, /var\(--shadow-elevated\)/);
    assert.match(html, /var\(--radius-xl\)/);
    assert.match(html, /class="topbar hl-header"/);
    assert.match(html, /class="container hl-shell"/);
  }

  assert.match(ownerJs, /hl-stat-card/);
  assert.match(ownerJs, /hl-stat-value/);
  assert.match(ownerJs, /hl-stat-label/);
});

test("owner auth loading and unified login back-button UX remain present", async () => {
  const { owner, login } = await readOwnerAssets();

  assert.match(owner, /ownerAuthLoading/);
  assert.match(owner, /ownerLoginPanel" style="display:none"/);
  assert.match(login, /<form id="loginForm">/);
  assert.match(login, /placeholder="用户名"/);
  assert.match(login, /placeholder="密码"/);
  assert.doesNotMatch(login, /signedInPanel/);
});

test("dashboard calculation and money formula markers are unchanged", async () => {
  const { ownerJs } = await readOwnerAssets();

  assert.match(ownerJs, /const parseMoney=s=>Math\.round\(\(parseFloat\(s\)\|\|0\)\*100\)\/100/);
  assert.match(ownerJs, /const totalDue =r\(ie\.reduce/);
  assert.match(ownerJs, /const totalPaid=r\(ie\.reduce/);
  assert.match(ownerJs, /const totalDef =r\(ie\.reduce/);
  assert.match(ownerJs, /const netIncome=t\.total/);
});

test("production cutover remains PRODUCTION_NO_GO", () => {
  assert.equal(getCommercialLaunchStatusForUnifiedLogin(), PRODUCTION_CUTOVER_STATUS);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function portalHtml() {
  return readFile("deploy-worker/public/portal.html", "utf8");
}

function visiblePortal(html) {
  return html.slice(html.indexOf("<main"), html.indexOf("<script>"));
}

function portalCards(html) {
  return [
    ...html.matchAll(
      /<button class="door"[^>]*data-portal="([^"]+)"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>([^<]*)/g
    )
  ].map((match) => ({
    role: match[1],
    label: match[2],
    english: match[3].trim()
  }));
}

test("main portal renders exactly employee owner admin entry cards", async () => {
  const html = await portalHtml();
  const cards = portalCards(html);

  assert.equal(cards.length, 3);
  assert.deepEqual(
    cards.map((card) => card.role),
    ["employee", "owner", "admin"]
  );
  assert.deepEqual(
    cards.map((card) => card.label),
    ["员工", "老板", "管理员"]
  );
  assert.deepEqual(
    cards.map((card) => card.english.toLowerCase()),
    ["employee", "owner", "admin"]
  );
});

test("main portal does not expose arrears management as a fourth login identity", async () => {
  const html = await portalHtml();
  const visible = visiblePortal(html);

  assert.doesNotMatch(visible, /欠款管理|欠款/);
  assert.doesNotMatch(visible, /新版指令功能/);
  assert.doesNotMatch(visible, /ARREARS FOLLOW-UP/i);
  assert.doesNotMatch(visible, /Arrears follow-up/i);
  assert.doesNotMatch(html, /directive-door/);
  assert.doesNotMatch(html, /data-next-view/);
  assert.doesNotMatch(html, /selectedNextView/);
});

test("owner arrears module remains available inside owner overview", async () => {
  const portal = await portalHtml();
  const ownerHtml = await readFile("deploy-worker/public/index-51.html", "utf8");
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const nav = ownerHtml.match(/<nav class="nav" id="navTabs">[\s\S]*?<\/nav>/)?.[0] || "";

  assert.match(portal, /if\(OWNER_ROLES\.has\(r\)\)return"\/owner"/);
  assert.doesNotMatch(nav, /data-view="arrears"|id="navArrears"|>欠款<span/);
  assert.match(ownerJs, /id="ownerOverviewArrearsPanel"/);
  assert.match(ownerJs, /function renderOwnerOverviewArrearsPanel\(\)/);
  assert.match(ownerJs, /function renderArrearsPanel\(\)/);
  assert.match(ownerJs, /\/api\/boss\/arrears\/followup-tasks/);
  assert.match(worker, /path === "\/api\/arrears"/);
});

test("readonly admin arrears access remains read-only", async () => {
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /READONLY_ADMIN_ROLES/);
  assert.match(worker, /canWrite: canWriteOwnerData\(user\)/);
  assert.match(ownerJs, /function denyReadonlyAdminWrite\(\)/);
  assert.match(ownerJs, /role==='readonly_admin'/);
});

test("production cutover remains blocked by the commercial launch gate", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");

  assert.match(gate, /Overall: `PRODUCTION_NO_GO`/);
  assert.match(gate, /COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO/);
});

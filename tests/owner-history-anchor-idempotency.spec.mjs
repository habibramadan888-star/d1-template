import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = "deploy-worker/src/index.js";
const ownerPath = "deploy-worker/public/index-51-main.js";

test("boss session save is idempotent by stable anchor", async () => {
  const source = await readFile(workerPath, "utf8");
  const start = source.indexOf('if (path === "/api/save_session" && method === "POST")');
  const end = source.indexOf('if (path === "/api/delete_session"', start);
  const route = source.slice(start, end);
  assert.match(route, /WHERE corpid=\? AND anchor_id=\?/);
  assert.match(route, /status: "IDEMPOTENT_REPLAY"/);
  assert.ok(route.indexOf("existingAnchor") < route.indexOf("env.DB.batch(batch)"));
});

test("history list collapses duplicate stable anchors", async () => {
  const source = await readFile(workerPath, "utf8");
  const start = source.indexOf('if (path === "/api/history")');
  const end = source.indexOf('if (path === "/api/session_detail"', start);
  const route = source.slice(start, end);
  assert.match(route, /seenHistoryAnchors/);
  assert.match(route, /seenHistoryAnchors\.has\(anchor\)/);
});

test("legacy history card derives and displays cash balance from export text", async () => {
  const source = await readFile(ownerPath, "utf8");
  const start = source.indexOf("const cardHtml=s=>");
  const end = source.indexOf("wrap.innerHTML=", start);
  const card = source.slice(start, end);
  assert.match(card, /exportParsed=.*parseTXT\(s\.export_text\)/);
  assert.match(card, /hasExportEntries\?totals\(exportEntries\)/);
  assert.match(card, /hasExportEntries\|\|s\._reparsedFromRaw===true/);
  assert.match(card, /现金结余/);
  assert.match(card, /fmtMoney\(t\.cashBal\)/);
});

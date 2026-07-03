import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ledgerFixture, loadLedgerHarness, readOwnerMain } from "./helpers/ledger-history-test-utils.mjs";

test("history load reparses raw ledger source instead of trusting stale transaction rows", async () => {
  const { normalizeLedgerSession, totals } = await loadLedgerHarness();
  const staleCloudSession = {
    id: "session-stale",
    date: "2026-06-02",
    anchorId: "APT-20260602-H6HKWZ",
    entries: [
      { id: "old-row", cat: "cash", room: "old", amount: 4360 }
    ],
    entriesCount: 10,
    export_text: ledgerFixture,
    _cloud: true
  };

  const normalized = normalizeLedgerSession(staleCloudSession);
  const parsedTotals = totals(normalized.entries);

  assert.equal(normalized._reparsedFromRaw, true);
  assert.equal(normalized.entries.length, 13);
  assert.equal(parsedTotals.cashIn, 4860);
  assert.equal(parsedTotals.bankIn, 2160);
  assert.equal(parsedTotals.refundOut, 400);
  assert.equal(parsedTotals.expOut, 5);
  assert.equal(parsedTotals.total, 7020);
  assert.equal(parsedTotals.cashBal, 4455);
});

test("cloud history rows carry export_text and avoid detail-row fallback when raw text exists", async () => {
  const source = await readOwnerMain();

  assert.match(source, /export_text:s\.export_text\|\|''/);
  assert.match(source, /state\.historyViewing=s;/);
  assert.match(source, /!ledgerSessionRawText\(s\)/);
});

test("cloud session archive persists export_text for future fixed-parser reloads", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /const exportText = cleanText\(session\.export_text \|\| session\.exportText/);
  assert.match(worker, /export_text, source\)/);
  assert.match(worker, /exportText,\s*\n\s*"BOSS"/);
});

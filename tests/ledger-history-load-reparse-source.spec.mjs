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

test("owner detail main text uses stored employee export text instead of regenerated rows", async () => {
  const { normalizeLedgerSession, ownerHistoryDetailMainText, employeeExportDisplayText } = await loadLedgerHarness();
  const employeeText = [
    "Statement",
    "Date 0707",
    "Employee Abdul",
    "",
    "💼 ▬▬▬▬▬▬▬▬▬▬▬ 💼",
    "Core Summary",
    "Cash Received 700",
    "Bank Received 0",
    "Gross Received 700",
    "",
    "💵 ▬▬▬▬▬▬▬▬▬▬▬ 💵",
    "Cash Details",
    "[334] paid 700 cash short 80 promise 0710 note 111",
    "",
    "End",
    "Total 700"
  ].join("\n");
  const storedText = `${employeeText}\n\n==== ENTRY ANCHORS JSON ====\n{"entries":[{"event_type":"rent","bed":"334"}]}\n==== END ENTRY ANCHORS JSON ====`;

  const normalized = normalizeLedgerSession({
    id: "S20260707-test",
    date: "2026-07-07",
    anchorId: "EMPV3-20260707-abdul-test",
    source: "employee_entry",
    export_text: storedText,
    entries: [{ cat: "cash", room: "334", amount: 700, type: "R" }],
    entriesCount: 1,
    _cloud: true
  });
  const detail = ownerHistoryDetailMainText(normalized);

  assert.equal(employeeExportDisplayText(normalized), employeeText);
  assert.equal(detail.source, "export_text");
  assert.equal(detail.txt, employeeText);
  assert.doesNotMatch(detail.txt, /ENTRY ANCHORS JSON|##ANCHOR|#334|\sO\s/);
});

test("cloud session archive persists export_text for future fixed-parser reloads", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /const exportText = cleanText\(session\.export_text \|\| session\.exportText/);
  assert.match(worker, /export_text, source\)/);
  assert.match(worker, /exportText,\s*\n\s*"BOSS"/);
});

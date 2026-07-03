import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

export const ledgerFixture = `##ANCHOR:APT-20260602-H6HKWZ
##DATE:2026-06-02

2026-06-02 finance handover
Cash Handover 4,455.00 AED
Bank Transfer 2,160.00 AED
Deposit Refund 400.00 AED
Expense 5.00 AED
Gross Income 7,020.00 AED

STATEMENT 8
#224 800.00 O
#627 680.00 O
#636 730.00 O
#8513 700.00 O
#842 750.00 O
#911-831 500.00 O was balance from rent
#855 700.00 O
#911->831 T waived was in 911 temporary

BANK TRANSFER 3
#821 700.00 O
#321 730.00 N 2026-06-01 deposit 100.00
#628 730.00 O

DEPOSIT RETURN 2
#9115 200.00 went to home
#644 200.00 went to home country

EXPENSE 1
#219 5.00 door battery`;

export async function readOwnerMain() {
  return readFile("deploy-worker/public/index-51-main.js", "utf8");
}

export async function loadLedgerHarness() {
  const source = await readOwnerMain();
  const start = source.indexOf("function parseEnglishStatementDate");
  const end = source.indexOf("/* ── STATE", start);
  assert.ok(start > 0, "parser block must exist");
  assert.ok(end > start, "parser block end marker must exist");

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `
    let __id = 0;
    const console = { warn(){}, log(){}, error(){} };
    const parseMoney = s => Math.round((parseFloat(String(s).replace(/,/g,'')) || 0) * 100) / 100;
    const normTag = t => ({o:'Old',n:'New',t:'Transfer',old:'Old',new:'New',transfer:'Transfer'}[String(t||'Old').toLowerCase()]||t||'Old');
    function newId(){ return 'test-' + (++__id); }
    function pad(n){ return String(n).padStart(2,'0'); }
    function fmtD(){ return '2026-06-02'; }
    function stableAnchor(s){ return s.anchorId || 'STA-TEST'; }
    ${source.slice(start, end)}
    globalThis.parseTXT = parseTXT;
    globalThis.totals = totals;
    globalThis.normalizeLedgerSession = normalizeLedgerSession;
    globalThis.normalizeLedgerSessions = normalizeLedgerSessions;
    `,
    sandbox
  );
  return sandbox;
}

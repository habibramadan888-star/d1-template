import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const fixture = `##ANCHOR:APT-20260602-H6HKWZ
##DATE:2026-06-02

2026-06-02 财务交接
现金结余 4,455.00 AED
银行收款 2,160.00 AED
押金退款 400.00 AED
其他支出 5.00 AED
总收入 7,020.00 AED

🟢现金收款 8笔
#224 800.00 O
#627 680.00 O
#636 730.00 O
#8513 700.00 O
#842 750.00 O
#911-831 500.00 O was balance from rent
#855 700.00 O
#911→831 T 豁免 was in 911 temporary was in 911 temporary

🏦银行转账 3笔
#821 700.00 O
#321 730.00 N 2026-06-01 含押100.00
#628 730.00 O

💸押金退款 2笔
#9115 200.00 went to home
#644 200.00 went to home country

🧾其他支出 1笔
#219 5.00 door battery`;

async function loadLedgerParser() {
  const source = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const start = source.indexOf("function parseEnglishStatementDate");
  const end = source.indexOf("/* ── STATE", start);
  assert.ok(start > 0, "parseEnglishStatementDate must exist");
  assert.ok(end > start, "parser block end marker must exist");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `
    let __id = 0;
    const parseMoney = s => Math.round((parseFloat(String(s).replace(/,/g,'')) || 0) * 100) / 100;
    const normTag = t => ({o:'Old',n:'New',t:'Transfer',old:'Old',new:'New',transfer:'Transfer'}[String(t||'Old').toLowerCase()]||t||'Old');
    function newId(){ return 'test-' + (++__id); }
    function pad(n){ return String(n).padStart(2,'0'); }
    function fmtD(){ return '2026-06-02'; }
    ${source.slice(start, end)}
    globalThis.parseTXT = parseTXT;
    globalThis.totals = totals;
    `,
    sandbox
  );
  return sandbox;
}

test("explicit cash row containing balance is parsed before continuation logic", async () => {
  const { parseTXT, totals } = await loadLedgerParser();
  const parsed = parseTXT(fixture);
  const t = totals(parsed.entries);
  const balanceRow = parsed.entries.find((entry) => entry.room === "911-831");
  const waiverMoneyRows = parsed.entries.filter((entry) => String(entry.room).includes("911→831"));

  assert.ok(balanceRow, "hyphenated balance row must be parsed");
  assert.equal(balanceRow.cat, "cash");
  assert.equal(balanceRow.amount, 500);
  assert.equal(balanceRow.tag, "Old");
  assert.match(balanceRow.note, /was balance from rent/);
  assert.equal(waiverMoneyRows.length, 0, "no-amount transfer waiver note must not be a money row");
  assert.equal(t.cashIn, 4860);
  assert.equal(t.bankIn, 2160);
  assert.equal(t.refundOut, 400);
  assert.equal(t.expOut, 5);
  assert.equal(t.total, 7020);
  assert.equal(t.cashBal, 4455);
});

test("note-only balance continuation remains supported for non-money lines", async () => {
  const { parseTXT, totals } = await loadLedgerParser();
  const parsed = parseTXT(`##DATE:2026-06-02

现金收款 2笔
#224 800.00 O
balance from rent
#225 100.00 O`);
  const t = totals(parsed.entries);

  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.entries[0].room, "224");
  assert.match(parsed.entries[0].note, /balance/);
  assert.equal(parsed.entries[1].room, "225");
  assert.equal(t.cashIn, 900);
});

test("transfer bed money format with ascii arrow is supported", async () => {
  const { parseTXT, totals } = await loadLedgerParser();
  const parsed = parseTXT(`##DATE:2026-06-02

现金收款 1笔
#144->145 bed_transfer 50.00 customer_request`);
  const entry = parsed.entries[0];

  assert.equal(entry.room, "144");
  assert.equal(entry.roomTo, "145");
  assert.equal(entry.tag, "Transfer");
  assert.equal(entry.amount, 50);
  assert.equal(totals(parsed.entries).cashIn, 50);
});


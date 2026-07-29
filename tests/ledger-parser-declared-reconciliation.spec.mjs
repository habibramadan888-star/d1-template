import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const validFixture = `##ANCHOR:APT-20260602-H6HKWZ
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
    `,
    sandbox
  );
  return sandbox;
}

test("declared totals reconcile after balance money row is parsed", async () => {
  const { parseTXT } = await loadLedgerParser();
  const parsed = parseTXT(validFixture);

  assert.deepEqual(JSON.parse(JSON.stringify(parsed.declaredTotals)), {
    cash_handover: 4455,
    bank_receipts: 2160,
    deposit_refund: 400,
    expenses: 5,
    gross_income: 7020
  });
  assert.equal(parsed.parsedTotals.cashIn, 4860);
  assert.equal(parsed.parsedTotals.cashBal, 4455);
  assert.equal(parsed.reconciliation.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.reconciliation.warnings)), []);
});

test("declared total mismatches emit reconciliation warnings", async () => {
  const { parseTXT } = await loadLedgerParser();
  const invalid = validFixture.replace("总收入 7,020.00 AED", "总收入 7,021.00 AED");
  const parsed = parseTXT(invalid);
  const codes = parsed.reconciliation.warnings.map((warning) => warning.code);

  assert.equal(parsed.reconciliation.ok, false);
  assert.ok(codes.includes("DECLARED_GROSS_MISMATCH"));
  assert.ok(codes.includes("CASH_RECONCILIATION_MISMATCH"));
});

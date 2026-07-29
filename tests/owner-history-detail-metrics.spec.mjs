import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const ownerPath = "deploy-worker/public/index-51-main.js";

function fnBlock(source, name, next) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${next}`, start);
  assert.ok(start >= 0 && end > start, `missing ${name}`);
  return source.slice(start, end);
}

test("S20260713-jkqj7 metrics compare like-for-like and do not render a mismatch", async () => {
  const source = await readFile(ownerPath, "utf8");
  const totalsBlock = fnBlock(source, "totals", "balanceTotalFromTotals");
  const mixedTransferBlock = fnBlock(source, "ownerHistoryMixedTransferSession", "ownerHistoryDetailMainText");
  const mismatchBlock = fnBlock(source, "historyDetailMismatchHtml", "ownerArchiveTotalsValue");
  const sandbox = {
    Math,
    Number,
    Array,
    fmtMoney: (n) => Number(n || 0).toFixed(2),
    esc: (value) => String(value)
  };
  vm.createContext(sandbox);
  vm.runInContext(`${totalsBlock}\n${mixedTransferBlock}\n${mismatchBlock}\nresult = historyDetailMismatchHtml;`, sandbox);
  const entries = [
    { cat: "cash", amount: 970 },
    { cat: "bank", amount: 700 },
    { cat: "expense", amount: 250 },
    { cat: "cash", amount: 0 },
    { cat: "cash", amount: 0 }
  ];
  const session = {
    id: "S20260713-jkqj7",
    entries,
    entries_count: 5,
    cash_handover: 720,
    bank_transfer_total: 700,
    gross_received: 1670
  };

  assert.equal(sandbox.totals(entries).cashIn, 970);
  assert.equal(sandbox.totals(entries).cashOut, 250);
  assert.equal(sandbox.totals(entries).cashBal, 720);
  assert.equal(sandbox.totals(entries).bankIn, 700);
  assert.equal(sandbox.totals(entries).total, 1670);
  assert.equal(sandbox.totals(entries).netFunds, 1420);
  assert.equal(sandbox.result(session, 5), "");
  assert.match(source, /cash received .* rendered cash received/);
  assert.match(source, /net cash .* rendered net cash/);
});

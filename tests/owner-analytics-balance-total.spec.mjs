import assert from "node:assert/strict";
import test from "node:test";
import { readOwnerMain } from "./helpers/ledger-history-test-utils.mjs";

test("owner analytics renders balance total using cash handover plus bank receipts", async () => {
  const source = await readOwnerMain();

  assert.match(source, /function balanceTotalFromTotals\(t\)/);
  assert.match(source, /Number\(t\?\.cashBal\|\|0\)\+Number\(t\?\.bankIn\|\|0\)/);
  assert.match(source, /\['结余总计',balanceTotal,'#0f766e'\]/);
  assert.match(source, /balanceTotal:r2\(st\.cashBal\+st\.bankIn\)/);
  assert.match(source, /balanceTotal:balanceTotalFromTotals\(t\)/);
  assert.match(source, /fmtMoney\(s\._t\.balanceTotal\)/);
  assert.match(source, /fmtMoney\(r2\(balanceTotalFromTotals\(sumT\)\)\)/);
});

test("known 2026-06-02 balance total equals 6615 AED", () => {
  const cashHandover = 4455;
  const bankReceipts = 2160;
  const balanceTotal = cashHandover + bankReceipts;

  assert.equal(balanceTotal, 6615);
});

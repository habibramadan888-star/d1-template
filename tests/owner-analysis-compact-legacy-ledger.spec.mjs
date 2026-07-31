import assert from "node:assert/strict";
import test from "node:test";
import { loadLedgerHarness } from "./helpers/ledger-history-test-utils.mjs";

const compactLedger = "##ANCHOR:APT-20260730-DD2P4G##DATE:2026-07-302026-07-30 财务交接现金结余 8,830.00 AED银行收款 980.00 AED押金退款 400.00 AED总收入 10,210.00 AED─────────────────────────────💵现金收款 12笔#335 730.00 O#836 750.00 O#9322 750.00 O#146 770.00 O#123 700.00 O#611 680.00 O#324 780.00 N 2026-07-26 含押100.00#336 780.00 O#411 730.00 O#311 930.00 N 2026-07-30 含押200.00#728 930.00 N 2026-07-29 含押200.00#9117 700.00 O🏦银行转账 2笔#432 780.00 O#9313 200.00 O Deposit booking coming on 1st new💸押金退款 3笔#9313 100.00 changed location#727 200.00 vacations#9314 100.00 changed location─────────────────────────────";

test("compact historical ledger is split into the existing parser contract", async () => {
  const { parseTXT, totals } = await loadLedgerHarness();
  const parsed = parseTXT(compactLedger);
  const result = totals(parsed.entries);

  assert.equal(parsed.anchorId, "APT-20260730-DD2P4G");
  assert.equal(parsed.date, "2026-07-30");
  assert.equal(parsed.entries.length, 17);
  assert.equal(parsed.entries.filter(entry => entry.cat === "cash").length, 12);
  assert.equal(parsed.entries.filter(entry => entry.cat === "bank").length, 2);
  assert.equal(parsed.entries.filter(entry => entry.cat === "refund").length, 3);
  assert.equal(result.cashIn, 9230);
  assert.equal(result.bankIn, 980);
  assert.equal(result.refundOut, 400);
  assert.equal(result.total, 10210);
  assert.equal(result.cashBal, 8830);
  assert.equal(parsed.reconciliation.ok, true);
});

test("normal multiline ledger remains unchanged", async () => {
  const { parseTXT } = await loadLedgerHarness();
  const multiline = compactLedger
    .replaceAll("##DATE:", "\n##DATE:")
    .replace("2026-07-302026-07-30", "2026-07-30\n2026-07-30")
    .replaceAll("💵", "\n💵")
    .replaceAll("🏦", "\n🏦")
    .replaceAll("💸", "\n💸")
    .replaceAll(/(?=#\d)/g, "\n");
  const parsed = parseTXT(multiline);
  assert.equal(parsed.entries.length, 17);
  assert.equal(parsed.anchorId, "APT-20260730-DD2P4G");
});

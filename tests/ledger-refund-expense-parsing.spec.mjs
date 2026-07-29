import assert from "node:assert/strict";
import test from "node:test";
import { ledgerFixture, loadLedgerHarness } from "./helpers/ledger-history-test-utils.mjs";

test("refund and expense sections are included in parsed session totals", async () => {
  const { parseTXT, totals } = await loadLedgerHarness();
  const parsed = parseTXT(ledgerFixture);
  const parsedTotals = totals(parsed.entries);

  assert.equal(parsed.entries.filter((entry) => entry.cat === "refund").length, 2);
  assert.equal(parsed.entries.filter((entry) => entry.cat === "expense").length, 1);
  assert.equal(parsedTotals.refundOut, 400);
  assert.equal(parsedTotals.expOut, 5);
  assert.equal(parsedTotals.cashBal, 4455);
});

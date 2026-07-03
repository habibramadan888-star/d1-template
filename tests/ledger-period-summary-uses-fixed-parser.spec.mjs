import assert from "node:assert/strict";
import test from "node:test";
import { readOwnerMain } from "./helpers/ledger-history-test-utils.mjs";

test("period summary and session table use normalized ledger sessions", async () => {
  const source = await readOwnerMain();
  const start = source.indexOf("function buildSessionTable(sessions)");
  const end = source.indexOf("function anaSessDetail", start);
  assert.ok(start > 0, "buildSessionTable must exist");
  assert.ok(end > start, "buildSessionTable block must be bounded");
  const block = source.slice(start, end);

  assert.match(block, /sessions=normalizeLedgerSessions\(sessions\);/);
  assert.match(block, /const sumT=totals\(sessions\.flatMap/);
  assert.match(block, /balanceTotal:balanceTotalFromTotals\(t\)/);
  assert.match(block, /结余总计/);
  assert.match(block, /repeat\(7,1fr\)/);
  assert.doesNotMatch(block, /4360|6520|4160/);
});

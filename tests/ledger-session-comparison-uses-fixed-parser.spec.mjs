import assert from "node:assert/strict";
import test from "node:test";
import { readOwnerMain } from "./helpers/ledger-history-test-utils.mjs";

test("session comparison normalizes sessions through the fixed ledger parser", async () => {
  const source = await readOwnerMain();
  const start = source.indexOf("function computeAna(sessions)");
  const end = source.indexOf("function renderAnalysisChips", start);
  assert.ok(start > 0, "computeAna must exist");
  assert.ok(end > start, "computeAna block must be bounded");
  const block = source.slice(start, end);

  assert.match(block, /sessions=normalizeLedgerSessions\(sessions\);/);
  assert.match(block, /sessionTrend=sessions\.map/);
  assert.doesNotMatch(block, /4360|6520|4160/);
});

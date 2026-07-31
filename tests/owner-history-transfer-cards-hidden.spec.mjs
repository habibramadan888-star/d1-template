import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile("deploy-worker/public/index-51-main.js", "utf8");

test("standalone transfer cards are hidden from ordinary history", () => {
  const start = source.indexOf("const all=normalizeLedgerSessions([");
  const end = source.indexOf("const hasMoreCloud", start);
  const historyList = source.slice(start, end);
  assert.match(historyList, /\.filter\(s=>!s\.bed_transfer_history\)/);
});

test("bed search keeps the canonical transfer-lineage result", () => {
  assert.match(source, /function ownerHistoryBedControlsHtml\(\)/);
  assert.match(source, /function ownerHistoryTransferLineageHtml\(lineage\)/);
  assert.match(source, /ownerHistoryTransferLineageHtml\(state\.ownerHistoryTransferLineage\)/);
  assert.match(source, /SERVER LINEAGE ONLY/);
});

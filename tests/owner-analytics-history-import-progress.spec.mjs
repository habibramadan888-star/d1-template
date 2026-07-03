import assert from "node:assert/strict";
import test from "node:test";
import { readOwnerMain } from "./helpers/ledger-history-test-utils.mjs";

function importBlock(source) {
  const start = source.indexOf("async function importHistorySessions");
  const end = source.indexOf("async function fromHistory", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

test("history import modal has safe exit controls in every state", async () => {
  const source = await readOwnerMain();

  assert.match(source, /hist-import-progress-bg/);
  assert.match(source, /hist-import-progress-modal/);
  assert.match(source, /hist-import-progress-close/);
  assert.match(source, /btnCloseHistoryImportX/);
  assert.match(source, /btnCancelHistoryImport/);
  assert.match(source, /btnCloseHistoryImportProgress/);
  assert.match(source, /btnRetryHistoryImportFailed/);
  assert.match(source, /Escape/);
  assert.match(source, /e\.target===overlay/);
  assert.match(source, /confirm\('导入正在进行，确定取消并关闭吗？'\)/);
});

test("history import uses real sequential states before marking done", async () => {
  const source = await readOwnerMain();
  const block = importBlock(source);

  assert.match(block, /for\(let idx=0;idx<job\.items\.length;idx\+\+\)/);
  assert.doesNotMatch(block, /Promise\.all/);
  assert.match(block, /item\.status='loading'/);
  assert.match(block, /loadHistoryImportEntries\(cs,job\)/);
  assert.match(block, /item\.status='parsing'/);
  assert.match(block, /normalizeLedgerSession/);
  assert.match(block, /item\.status='updating'/);
  assert.match(block, /state\.analysisSessions\.push\(entry\)/);
  assert.match(block, /renderAnalysis\(\)/);
  assert.match(block, /item\.status='done'/);
  assert.ok(block.indexOf("item.status='done'") > block.indexOf("renderAnalysis()"));
});

test("history import supports timeout, cancellation summary, and retry", async () => {
  const source = await readOwnerMain();

  assert.match(source, /const HISTORY_IMPORT_ITEM_TIMEOUT_MS=30000/);
  assert.match(source, /History detail timed out/);
  assert.match(source, /timeout 30s/);
  assert.match(source, /function cancelHistoryImport\(job\)/);
  assert.match(source, /job\.cancelled=true/);
  assert.match(source, /status='skipped'/);
  assert.match(source, /导入已取消/);
  assert.match(source, /已取消：完成 \$\{success\} 条，取消 \$\{skipped\} 条，失败 \$\{failed\} 条/);
  assert.match(source, /importHistorySessions\(job\.items\.filter\(i=>i\.status==='fail'\)\.map\(i=>i\.session\),\{retry:true\}\)/);
});

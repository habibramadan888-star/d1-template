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
  assert.match(source, /\$\{\(!job\.done&&!job\.cancelled\)\?'<button class="btn btn-ghost" id="btnCancelHistoryImport"/);
  assert.match(source, /\$\{\(job\.done\|\|job\.cancelled\)\?'<button class="btn btn-ghost" id="btnCloseHistoryImportProgress"/);
  assert.match(source, /Escape/);
  assert.match(source, /e\.target===overlay/);
  assert.match(source, /confirm\('导入正在进行，确定取消并关闭吗？'\)/);
});

test("history import modal finalizes when every row reaches terminal state", async () => {
  const source = await readOwnerMain();

  assert.match(source, /function historyImportTerminalItems\(job\)/);
  assert.match(source, /function finalizeHistoryImportIfComplete\(job\)/);
  assert.match(source, /historyImportTerminalItems\(job\)\.length===total/);
  assert.match(source, /job\.done=true/);
  assert.match(source, /job\.finalizedAt=Date\.now\(\)/);
  assert.match(source, /const HISTORY_IMPORT_FINALIZE_WATCHDOG_MS=30000/);
  assert.match(source, /setInterval\(\(\)=>\{if\(finalizeHistoryImportIfComplete\(job\)\)renderHistoryImportProgress\(job\);\},HISTORY_IMPORT_FINALIZE_WATCHDOG_MS\)/);
  assert.match(source, /job\.done\|\|done===total\?'全部处理完成'/);
  assert.match(source, /job\.done\?`导入完成：成功 \$\{success\} 条，失败 \$\{failed\} 条`/);
});

test("history import uses real sequential states before marking done", async () => {
  const source = await readOwnerMain();
  const block = importBlock(source);

  assert.match(block, /for\(let idx=0;idx<job\.items\.length;idx\+\+\)/);
  assert.doesNotMatch(block, /Promise\.all/);
  assert.match(source, /const HISTORY_IMPORT_STAGE_MIN_MS=120/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /async function setHistoryImportItemStatus\(job,item,status,reason=""\)/);
  assert.match(block, /await setHistoryImportItemStatus\(job,item,'loading'\)/);
  assert.match(block, /loadHistoryImportEntries\(cs,job\)/);
  assert.match(block, /await setHistoryImportItemStatus\(job,item,'parsing'\)/);
  assert.match(block, /normalizeLedgerSession/);
  assert.match(block, /await setHistoryImportItemStatus\(job,item,'updating'\)/);
  assert.match(block, /state\.analysisSessions\.push\(entry\)/);
  assert.match(block, /renderAnalysis\(\)/);
  assert.match(block, /await setHistoryImportItemStatus\(job,item,'done'\)/);
  assert.ok(block.indexOf("await setHistoryImportItemStatus(job,item,'done')") > block.indexOf("renderAnalysis()"));
});

test("history import supports timeout, cancellation summary, and retry", async () => {
  const source = await readOwnerMain();

  assert.match(source, /const HISTORY_IMPORT_ITEM_TIMEOUT_MS=30000/);
  assert.match(source, /History detail timed out/);
  assert.match(source, /timeout 30s/);
  assert.match(source, /Math\.max\(0\.1,\(end-item\.startedAt\)\/1000\)/);
  assert.match(source, /historyImportCurrentText/);
  assert.match(source, /正在加载/);
  assert.match(source, /正在解析/);
  assert.match(source, /正在更新汇总/);
  assert.match(source, /function cancelHistoryImport\(job\)/);
  assert.match(source, /job\.cancelled=true/);
  assert.match(source, /status='skipped'/);
  assert.match(source, /导入已取消/);
  assert.match(source, /已取消：完成 \$\{success\} 条，取消 \$\{skipped\} 条，失败 \$\{failed\} 条/);
  assert.match(source, /importHistorySessions\(job\.items\.filter\(i=>i\.status==='fail'\)\.map\(i=>i\.session\),\{retry:true\}\)/);
});

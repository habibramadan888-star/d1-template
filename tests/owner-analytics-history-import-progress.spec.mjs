import assert from "node:assert/strict";
import test from "node:test";
import { readOwnerMain } from "./helpers/ledger-history-test-utils.mjs";

test("history import uses a glass progress modal with per-item states", async () => {
  const source = await readOwnerMain();

  assert.match(source, /hist-import-progress-bg/);
  assert.match(source, /backdrop-filter:blur\(12px\)/);
  assert.match(source, /正在导入历史流水/);
  assert.match(source, /已完成 \$\{done\} \/ 总数 \$\{total\}/);
  assert.match(source, /等待中/);
  assert.match(source, /加载中/);
  assert.match(source, /已完成/);
  assert.match(source, /失败/);
  assert.match(source, /跳过/);
  assert.match(source, /取消导入/);
  assert.match(source, /重试失败项/);
});

test("history import processes selected sessions sequentially without Promise.all", async () => {
  const source = await readOwnerMain();
  const start = source.indexOf("async function importHistorySessions");
  const end = source.indexOf("async function fromHistory", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const block = source.slice(start, end);
  assert.match(block, /for\(let idx=0;idx<job\.items\.length;idx\+\+\)/);
  assert.match(block, /loadHistoryImportEntries\(cs,job\)/);
  assert.doesNotMatch(block, /Promise\.all/);
  assert.match(block, /item\.status='fail'/);
  assert.match(block, /continue/);
});

test("history import has item timeout, cancellation, retry, and button progress copy", async () => {
  const source = await readOwnerMain();

  assert.match(source, /const HISTORY_IMPORT_ITEM_TIMEOUT_MS=30000/);
  assert.match(source, /controller\.abort\(new DOMException\('History detail timed out','TimeoutError'\)\)/);
  assert.match(source, /job\.cancelled=true/);
  assert.match(source, /btn\.textContent=`导入中 \$\{Math\.min\(idx\+1,job\.items\.length\)\}\/\$\{job\.items\.length\}`/);
  assert.match(source, /importHistorySessions\(job\.items\.filter\(i=>i\.status==='fail'\)\.map\(i=>i\.session\),\{retry:true\}\)/);
});

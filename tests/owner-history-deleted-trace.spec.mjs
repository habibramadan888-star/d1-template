import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ownerMainPath = "deploy-worker/public/index-51-main.js";
const workerPath = "deploy-worker/src/index.js";

test("owner history exposes a read-only deleted or voided trace", async () => {
  const main = await readFile(ownerMainPath, "utf8");
  const historyBlock =
    main.match(/async function renderHistory\(\)\{[\s\S]*?\/\* ── ANALYSIS/)?.[0] || "";

  assert.match(historyBlock, /showDeletedHistory/);
  assert.match(historyBlock, /state\.showDeletedHistory\?'&include_voided=1':''/);
  assert.match(historyBlock, /已删除\/已作废记录/);
  assert.match(historyBlock, /VOIDED · READ ONLY/);
  assert.match(historyBlock, /只读追踪/);
  assert.doesNotMatch(historyBlock, /data-act="restore"/);
  assert.doesNotMatch(historyBlock, /restore_session/);
});

test("deleted trace can view voided session detail without changing active history", async () => {
  const main = await readFile(ownerMainPath, "utf8");
  const worker = await readFile(workerPath, "utf8");

  assert.match(worker, /const includeVoided = url\.searchParams\.get\("include_voided"\) === "1"/);
  assert.match(worker, /SELECT \* FROM sessions WHERE corpid=\? ORDER BY created_at DESC/);
  assert.match(worker, /SELECT \* FROM transactions WHERE session_id=\? AND corpid=\? ORDER BY created_at ASC/);
  assert.match(main, /const detailUrl=`\/api\/session_detail\?id=\$\{encodeURIComponent\(s\.id\)\}\$\{s\._voided\?'&include_voided=1&include_corrections=1':''\}\$\{state\.historyBedQuery\?/);
  assert.match(main, /const rows=Array\.isArray\(detailPayload\)\?detailPayload:\(Array\.isArray\(detailPayload\?\.data\)\?detailPayload\.data:\[\]\)/);
});

test("deleted or voided cards label raw totals separately from active income", async () => {
  const main = await readFile(ownerMainPath, "utf8");

  assert.match(main, /function ownerArchiveVoidedTotalsHtml\(session,t\)/);
  assert.match(main, /function ownerArchiveVoidedDetailHtml\(session\)/);
  assert.match(main, /原始流水金额，不计入有效收入/);
  assert.match(main, /当前有效金额：0/);
  assert.match(main, /已删除\/已作废，不计入总收入/);
  assert.match(main, /Deleted\/voided, excluded from active income/);
  assert.match(main, /No correction anchor found \/ 修正记录不存在/);
  assert.match(main, /修正历史仍保留；作废只影响当前有效金额/);
});

test("history list preserves archive metadata for deleted or voided display semantics", async () => {
  const main = await readFile(ownerMainPath, "utf8");

  assert.match(main, /async function renderHistory\(\)/);
  assert.match(main, /archive_state:s\.archive_state/);
  assert.match(main, /raw_totals:s\.raw_totals/);
  assert.match(main, /correction_totals:s\.correction_totals/);
  assert.match(main, /corrected_totals:s\.corrected_totals/);
  assert.match(main, /archive_effective_totals:s\.archive_effective_totals/);
  assert.match(main, /active_for_totals:s\.active_for_totals/);
  assert.match(main, /grossLabel=deleted\?'原始流水金额，不计入有效收入':'总收入'/);
  assert.match(main, /ownerArchiveVoidedTotalsHtml\(s,t\)/);
});

test("history detail warns when saved entry count differs from transaction rows", async () => {
  const main = await readFile(ownerMainPath, "utf8");

  assert.match(main, /function historyDetailMismatchHtml\(session,renderedCount\)/);
  assert.match(main, /Detail Render Mismatch \/ 详情解析不完整/);
  assert.match(main, /summary cash \$\{fmtMoney\(summaryCash\)\} · rendered cash/);
  assert.match(main, /suspected missing categories/);
  assert.match(main, /historyDetailMismatchHtml\(s,cnt\)/);
});

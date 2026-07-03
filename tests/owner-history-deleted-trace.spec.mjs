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
  assert.match(main, /const detailUrl=`\/api\/session_detail\?id=\$\{encodeURIComponent\(s\.id\)\}\$\{s\._voided\?'&include_voided=1':''\}`/);
});

test("history detail warns when saved entry count differs from transaction rows", async () => {
  const main = await readFile(ownerMainPath, "utf8");

  assert.match(main, /记录数与交易行数量不一致，需单独核对。/);
  assert.match(main, /const expectedCount=Number\(s\.entriesCount\|\|s\.entries_count\|\|0\)/);
  assert.match(main, /expectedCount&&expectedCount!==cnt/);
});

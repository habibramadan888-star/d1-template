import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ownerMainPath = "deploy-worker/public/index-51-main.js";
const workerPath = "deploy-worker/src/index.js";

test("owner history delete route avoids runtime schema mutation and targets one session", async () => {
  const worker = await readFile(workerPath, "utf8");
  const route =
    worker.match(/if \(path === "\/api\/delete_session" && method === "POST"\) \{[\s\S]*?return success\(\{ success: true, sessionId: id[\s\S]*?\}\);\s*\}/)?.[0] ||
    "";

  assert.doesNotMatch(route, /empEnsureSchema\(env\)/);
  assert.match(route, /SELECT id, anchor_id, voided_at FROM sessions WHERE id=\? AND corpid=\? LIMIT 1/);
  assert.match(route, /anchor_mismatch/);
  assert.match(worker, /affected_session_count: 1/);
  assert.match(worker, /elapsed_ms/);
});

test("owner history delete removes the card without full history reload", async () => {
  const main = await readFile(ownerMainPath, "utf8");
  const deleteBlock =
    main.match(/if\(a\.dataset\.act==='del'\)\{[\s\S]*?\}else if\(a\.dataset\.act==='view'\)/)?.[0] ||
    "";

  assert.match(deleteBlock, /apiFetch\('\/api\/delete_session'/);
  assert.match(deleteBlock, /body:JSON\.stringify\(\{id,anchor:s\.anchorId\|\|''\}\)/);
  assert.match(deleteBlock, /card\.remove\(\)/);
  assert.doesNotMatch(deleteBlock, /renderHistory\(\);/);
});

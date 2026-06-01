import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("employee TF save posts the event-ledger payload with required anchors", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /async function submitBedTransferEvent\(\)/);
  assert.match(html, /from_bed:e\.bed_from/);
  assert.match(html, /to_bed:e\.bed_to/);
  assert.match(html, /transfer_date:e\.transfer_date/);
  assert.match(html, /reason:e\.transfer_reason/);
  assert.match(html, /note:e\.note/);
  assert.match(html, /old_ttlock_ref:e\.old_ttlock_ref/);
  assert.match(html, /idempotency_key:bedTransferEventIdempotencyKey\(e\)/);
});

test("employee TF save shows record-only wording instead of owner-review wording", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /Bed transfer recorded \/ 换床记录已保存/);
  assert.match(html, /RECORD TRANSFER/);
  assert.match(html, /recorded_with_notes/);
  assert.doesNotMatch(html, /Bed transfer submitted for owner review/);
  assert.doesNotMatch(html, /SUBMIT FOR REVIEW/);
});

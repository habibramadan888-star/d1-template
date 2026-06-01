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

test("employee TF save shows owner-review wording instead of completed-transfer wording", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /Bed transfer submitted for owner review/);
  assert.match(html, /pending_review/);
  assert.match(html, /不会直接改床位、押金、欠款或通通锁/);
  assert.doesNotMatch(html, /换床已完成/);
});

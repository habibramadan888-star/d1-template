import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ownerMainPath = "deploy-worker/public/index-51-main.js";
const workerPath = "deploy-worker/src/index.js";

test("owner history detail maps employee transaction anchors", async () => {
  const main = await readFile(ownerMainPath, "utf8");

  for (const field of [
    "source:'employee_entry'",
    "event_type:tx.type||tx.reason_code",
    "expected_rent:tx.period_due||tx.due",
    "raw_display_line:tx.note||tx.arrear_reason_detail",
    "linked_task_id:tx.linked_task_id",
    "short_paid:",
    "arrears_amount:",
    "arrears_due_date:tx.arrear_promise_date"
  ]) {
    assert.match(main, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("owner session detail reads structured transaction rows from cloud", async () => {
  const worker = await readFile(workerPath, "utf8");

  assert.match(worker, /if \(path === "\/api\/session_detail" && method === "GET"\)/);
  assert.match(worker, /SELECT \* FROM transactions WHERE session_id=\?/);
  assert.match(worker, /ORDER BY created_at ASC/);
});

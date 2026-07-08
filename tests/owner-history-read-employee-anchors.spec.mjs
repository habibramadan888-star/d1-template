import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ownerMainPath = "deploy-worker/public/index-51-main.js";
const workerPath = "deploy-worker/src/index.js";

test("owner history detail maps employee transaction anchors", async () => {
  const main = await readFile(ownerMainPath, "utf8");

  for (const field of [
    "source:tx.source||'employee_entry'",
    "const eventType=tx.event_type||tx.type||tx.reason_code||''",
    "expected_rent:tx.expected_rent??expected",
    "raw_display_line:tx.raw_display_line||tx.note||tx.arrear_reason_detail",
    "linked_task_id:tx.linked_task_id",
    "deposit_amount:tx.deposit_amount",
    "refund_amount:tx.refund_amount",
    "checkout_date:tx.checkout_date",
    "expense_amount:tx.expense_amount",
    "fee_amount:tx.fee_amount",
    "short_paid:",
    "arrears_amount:",
    "arrears_due_date:tx.arrears_due_date||tx.arrear_promise_date"
  ]) {
    assert.match(main, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("owner history list renders employee uploaded session summaries", async () => {
  const main = await readFile(ownerMainPath, "utf8");

  assert.match(main, /source:s\.source\|\|''/);
  assert.match(main, /cash_handover:s\.cash_handover/);
  assert.match(main, /bank_transfer_total:s\.bank_transfer_total/);
  assert.match(main, /gross_received:s\.gross_received/);
  assert.match(main, /createdBy:\(s\.source==='employee_entry'\|\|s\.source==='EMP'\)\?'staff'/);
  assert.match(main, /const hasEntries=s\.entries&&s\.entries\.length>0/);
  assert.match(main, /const has=hasEntries\|\|Number\(s\.cash_handover\|\|0\)/);
});

test("owner session detail reads structured transaction rows from cloud", async () => {
  const worker = await readFile(workerPath, "utf8");

  assert.match(worker, /if \(path === "\/api\/session_detail" && method === "GET"\)/);
  assert.match(worker, /SELECT \* FROM transactions WHERE session_id=\?/);
  assert.match(worker, /const anchorRows=extractEmployeeEntryAnchorsFromSession\(sessionRow\)/);
  assert.match(worker, /chooseOwnerEmployeeSessionDetailRows\(sessionRow,results,anchorRows,exportRows\)/);
  assert.match(worker, /ORDER BY created_at ASC/);
});

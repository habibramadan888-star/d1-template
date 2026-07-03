import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const htmlPath = "deploy-worker/public/employee-v3.html";
const workerPath = "deploy-worker/src/index.js";

test("employee Entry defines the 7 event anchor contract", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /const EMPLOYEE_ENTRY_ANCHOR_CONTRACT=/);
  for (const type of ["R", "AP", "D", "DR", "CO", "E", "TF"]) {
    assert.match(html, new RegExp(`${type}:\\[`));
  }
  for (const field of [
    "expected_rent",
    "paid_amount",
    "arrears_amount",
    "arrears_due_date",
    "arrears_note",
    "short_paid",
    "raw_display_line",
    "old_ttlock_context",
    "fee_status"
  ]) {
    assert.match(html, new RegExp(field));
  }
});

test("rent short paid upload payload preserves arrears anchors", async () => {
  const html = await readFile(htmlPath, "utf8");
  const worker = await readFile(workerPath, "utf8");

  assert.match(html, /function applyEntryAnchors\(e\)/);
  assert.match(html, /arrears_amount:tail/);
  assert.match(html, /arrears_due_date:tail>0\?/);
  assert.match(html, /arrears_status:tail>0\?'open'/);
  assert.match(html, /short_paid:tail>0/);
  assert.match(html, /return applyEntryAnchors\(payload\)/);
  assert.match(worker, /arrear_promise_date:arrearPromiseDate/);
  assert.match(worker, /arrear_reason_detail:arrearReasonDetail/);
  assert.match(worker, /promise_amount:Number\.isFinite\(promiseAmount\)\?promiseAmount:0/);
  assert.match(worker, /new_value:JSON\.stringify\(finalEntryForAudit\)/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

test("Bed Transfer UI exposes explicit from/to/date/reason fields", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /data-type="TF"/);
  assert.match(html, /id="transferFromBed"/);
  assert.match(html, /data-bed-transfer-from="true"/);
  assert.match(html, /id="bedTo"/);
  assert.match(html, /data-bed-transfer-to="true"/);
  assert.match(html, /id="transferDate"/);
  assert.match(html, /data-bed-transfer-date="true"/);
  assert.match(html, /id="transferReason"/);
  assert.match(html, /data-bed-transfer-reason="true"/);
  assert.match(html, /id="transferReviewPanel"/);
});

test("Bed Transfer payload carries accounting and trace anchors", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(
    html,
    /bed_from:\(\$\(\'transferFromBed\'\)\.value\.trim\(\)\|\|\$\(\'bed\'\)\.value\.trim\(\)\)/
  );
  assert.match(html, /bed_to:\$\(\'bedTo\'\)\.value\.trim\(\)/);
  assert.match(html, /transfer_date:\$\(\'transferDate\'\)\.value/);
  assert.match(html, /transfer_reason:\$\(\'transferReason\'\)\.value/);
  assert.match(html, /carry_over_arrears/);
  assert.match(html, /deposit_carried/);
  assert.match(html, /old_ttlock_ref/);
  assert.match(html, /rent_difference/);
});

test("Bed Transfer validation blocks missing or equal from/to beds", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /from_bed_required/);
  assert.match(html, /to_bed_required/);
  assert.match(html, /from_bed_must_differ_from_to_bed/);
  assert.match(html, /from_bed_no_active_tenant/);
});

test("Bed Transfer event-ledger write is disabled in the UI", async () => {
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /const BED_TRANSFER_WRITE_ENABLED=false/);
  assert.match(html, /function isBedTransferWriteGated/);
  assert.match(html, /async function submitBedTransferEvent\(\)/);
  assert.match(html, /\/api\/employee\/bed-transfers/);
  assert.match(html, /Bed transfer recorded \/ 换床记录已保存/);
  assert.match(html, /recorded_with_notes/);
  assert.doesNotMatch(html, /SUBMIT FOR REVIEW/);
  assert.match(html, /state\.drafts\.some\(e=>e\.type==='TF'/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});

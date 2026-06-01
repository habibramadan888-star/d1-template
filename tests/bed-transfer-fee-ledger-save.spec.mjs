import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf(`__name(${name}`, start);
  assert.notEqual(end, -1, `${name} __name marker must exist`);
  return source.slice(start, end);
}

test("Bed Transfer save supports charged and waived ledger anchors", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = extractFunction(worker, "handleEmployeeBedTransferCreate");

  assert.match(handler, /feeMode==="waived"\?0:5000/);
  assert.match(handler, /const category="bed_transfer_fee"/);
  assert.match(handler, /amount_fils:amountFils/);
  assert.match(handler, /fee_mode:feeMode/);
  assert.match(handler, /waiver_reason:waiverReason/);
  assert.match(handler, /entry_event_id:entryEventId/);
  assert.match(handler, /event_type, field_name/);
  assert.match(handler, /"bed_transfer","bed_transfer_fee"/);
});

test("Bed Transfer response copy reflects fee outcome", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const handler = extractFunction(worker, "handleEmployeeBedTransferCreate");

  assert.match(handler, /Bed transfer recorded\. Fee: 50 AED/);
  assert.match(handler, /Bed transfer recorded\. Fee waived/);
  assert.match(handler, /review_required:false/);
  assert.doesNotMatch(handler, /status:"pending_review"/);
});

test("Bed Transfer fee schema columns are declared", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const migration = await readFile("migrations/007_bed_transfer_fee_ledger.sql", "utf8");

  assert.match(worker, /"amount_fils","fee_mode","fee_status","payment_method","waiver_reason","category"/);
  assert.match(worker, /"entry_event_id"/);
  assert.match(migration, /amount_fils INTEGER DEFAULT 5000/);
  assert.match(migration, /fee_mode TEXT DEFAULT 'charged'/);
  assert.match(migration, /fee_status TEXT DEFAULT 'paid'/);
  assert.match(migration, /payment_method TEXT/);
  assert.match(migration, /category TEXT DEFAULT 'bed_transfer_fee'/);
});

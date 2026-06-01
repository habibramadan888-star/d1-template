import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerPath = "deploy-worker/src/index.js";

function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf(`__name(${name}`, start);
  assert.notEqual(end, -1, `${name} __name marker must exist`);
  return source.slice(start, end);
}

test("employee Bed Transfer API writes pending_review event ledger records", async () => {
  const worker = await readFile(workerPath, "utf8");
  const handler = extractFunction(worker, "handleEmployeeBedTransferCreate");

  assert.match(worker, /path===\"\/api\/employee\/bed-transfers\"&&request\.method===\"POST\"/);
  assert.match(handler, /bed_transfer_events/);
  assert.match(handler, /status:\"pending_review\"/);
  assert.match(handler, /from_bed_required/);
  assert.match(handler, /to_bed_required/);
  assert.match(handler, /transfer_date_required/);
  assert.match(handler, /transfer_reason_required/);
  assert.match(handler, /transfer_note_required/);
});

test("employee Bed Transfer API records audit, trace, and idempotency evidence", async () => {
  const worker = await readFile(workerPath, "utf8");
  const handler = extractFunction(worker, "handleEmployeeBedTransferCreate");

  assert.match(worker, /request_idempotency_keys/);
  assert.match(handler, /arrearsDirectiveRecordIdempotency/);
  assert.match(handler, /entry_events/);
  assert.match(handler, /employee\.bed_transfer\.create/);
  assert.match(handler, /Idempotency-Key/);
});

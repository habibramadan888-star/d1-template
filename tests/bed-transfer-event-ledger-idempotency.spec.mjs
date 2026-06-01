import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer event-ledger API requires and records idempotency", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const start = worker.indexOf("async function handleEmployeeBedTransferCreate");
  const end = worker.indexOf("__name(handleEmployeeBedTransferCreate", start);
  const handler = worker.slice(start, end);

  assert.match(handler, /idempotency_key_required/);
  assert.match(handler, /arrearsDirectiveIdempotencyReplay/);
  assert.match(handler, /arrearsDirectiveRecordIdempotency/);
  assert.match(handler, /employee\.bed_transfer\.create/);
  assert.match(handler, /idempotency_status:\"NEW\"/);
});

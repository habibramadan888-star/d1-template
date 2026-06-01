import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function handler(source) {
  const start = source.indexOf("async function handleEmployeeBedTransferCreate");
  assert.notEqual(start, -1, "handler must exist");
  const end = source.indexOf("__name(handleEmployeeBedTransferCreate", start);
  assert.notEqual(end, -1, "handler marker must exist");
  return source.slice(start, end);
}

test("Bed Transfer save is an Entry Ledger event first", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const h = handler(worker);

  assert.match(h, /INSERT INTO entry_events/);
  assert.match(h, /"bed_transfer","bed_transfer_fee"/);
  assert.match(h, /event_type:"bed_transfer"/);
  assert.match(h, /session_entry:sessionEntry/);
  assert.match(h, /INSERT INTO bed_transfer_events/);
  assert.ok(
    h.indexOf("INSERT INTO entry_events") < h.indexOf("INSERT INTO bed_transfer_events"),
    "entry_events insert must be before bed_transfer_events insert"
  );
});

test("Bed Transfer response exposes Current Session entry", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const h = handler(worker);

  assert.match(h, /const sessionEntry=\{/);
  assert.match(h, /type:"TF"/);
  assert.match(h, /event_type:"bed_transfer"/);
  assert.match(h, /sync_status:"SYNCED"/);
  assert.match(h, /status:"RECORDED"/);
});

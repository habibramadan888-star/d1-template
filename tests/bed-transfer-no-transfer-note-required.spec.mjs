import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer no longer requires a transfer note", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const start = worker.indexOf("async function handleEmployeeBedTransferCreate");
  const end = worker.indexOf("__name(handleEmployeeBedTransferCreate", start);
  const h = worker.slice(start, end);

  assert.doesNotMatch(h, /transfer_note_required/);
  assert.match(h, /body\?\.note\|\|body\?\.remark\|\|body\?\.transfer_note\|\|reason\|\|waiverReason\|\|"bed_transfer"/);
  assert.match(h, /bed_transfer_waiver_reason_required/);
});

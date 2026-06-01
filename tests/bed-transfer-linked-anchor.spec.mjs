import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Bed Transfer anchor links to entry_event_id", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");
  const start = worker.indexOf("async function handleEmployeeBedTransferCreate");
  const end = worker.indexOf("__name(handleEmployeeBedTransferCreate", start);
  const h = worker.slice(start, end);

  assert.match(h, /const entryEventId=traceId/);
  assert.match(h, /entry_event_id:entryEventId/);
  assert.match(h, /entry_event_id:authSafeId\(entryEventId\)/);
  assert.match(h, /bedTransferColumns=await empTableColumns\(env,"bed_transfer_events"\)/);
});

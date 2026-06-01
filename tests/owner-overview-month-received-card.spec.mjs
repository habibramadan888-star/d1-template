import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview month received card comes from cloud entry_events summary", async () => {
  const ui = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(ui, /const monthReceived=Number\(month\.gross_received\|\|0\)/);
  assert.match(ui, /MONTH RECEIVED/);
  assert.match(worker, /ownerOverviewFetchTransactions/);
  assert.match(worker, /entry_events/);
});


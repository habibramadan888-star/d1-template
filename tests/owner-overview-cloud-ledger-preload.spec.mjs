import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner overview cloud summary preloads entry ledger and arrears SOT read-only", async () => {
  const worker = await readFile("deploy-worker/src/index.js", "utf8");

  assert.match(worker, /ownerOverviewFetchTransactions/);
  assert.match(worker, /ownerOverviewFetchArrears/);
  assert.match(worker, /phase0OwnerOverviewComparativeSummary/);
  assert.match(worker, /readonly:true/);
  assert.doesNotMatch(worker.slice(worker.indexOf("async function phase0OwnerOverviewComparativeSummary"), worker.indexOf("__name(phase0OwnerOverviewComparativeSummary")), /\.run\(/);
});


import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee UI appends saved Bed Transfer to Current Session", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /function bedTransferSessionEntryFromResponse/);
  assert.match(html, /function appendSyncedBedTransferSessionEntry/);
  assert.match(html, /state\.drafts\.unshift\(entry\)/);
  assert.match(html, /appendSyncedBedTransferSessionEntry\(bedTransferSessionEntryFromResponse\(data,e\)\)/);
  assert.match(html, /sync_status:'SYNCED'/);
});

test("synced Bed Transfer rows do not keep handover export blocked", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  assert.match(html, /state\.drafts\.some\(e=>e\.type==='TF'&&e\.sync_status!=='SYNCED'\)/);
});

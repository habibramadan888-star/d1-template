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

test("Bed Transfer save API records events with status recorded", async () => {
  const worker = await readFile(workerPath, "utf8");
  const handler = extractFunction(worker, "handleEmployeeBedTransferCreate");

  assert.match(handler, /status:"recorded"/);
  assert.match(handler, /Bed transfer recorded\. Fee: 50 AED/);
  assert.match(handler, /Bed transfer recorded\. Fee waived/);
  assert.match(handler, /review_required:false/);
  assert.match(handler, /arrearsDirectiveRecordIdempotency/);
  assert.doesNotMatch(handler, /status:"pending_review"/);
});

test("recorded status is supported by the active and upgrade migrations", async () => {
  const initialMigration = await readFile("migrations/005_bed_transfer_events.sql", "utf8");
  const upgradeMigration = await readFile("migrations/006_bed_transfer_recorded_status.sql", "utf8");

  assert.match(initialMigration, /DEFAULT 'recorded'/);
  assert.match(initialMigration, /'recorded'/);
  assert.match(upgradeMigration, /DEFAULT 'recorded'/);
  assert.match(upgradeMigration, /'recorded'/);
});

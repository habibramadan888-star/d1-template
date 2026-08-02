import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const worker = await readFile(new URL("../deploy-worker/src/index.js", import.meta.url), "utf8");

function functionBlock(name) {
  const start = worker.indexOf(`async function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = worker.indexOf(`__name(${name},`, start);
  assert.ok(end > start, `${name} must have a boundary marker`);
  return worker.slice(start, end);
}

test("formal employee write delegates to one raw-ingestion boundary", () => {
  const route = functionBlock("handleEmployeeEntry");
  assert.match(route, /handleEmployeeRawIngestionEntry/);
  assert.match(route, /qaAcceptanceEmployeeFormalWriteGate/);
  assert.doesNotMatch(route, /TTLock|transactions|projection|arrears|deposit|rentConfig|bedTransferWrite/);
});

test("raw-ingestion boundary contains only technical envelope, schema, and persistence checks", () => {
  const boundary = functionBlock("handleEmployeeRawIngestionEntry");
  assert.match(boundary, /employeeRawIngestionEnvelope/);
  assert.match(boundary, /employeeRawIngestionValidationResult/);
  assert.match(boundary, /persistEmployeeRawIngestion/);
  assert.match(boundary, /"sessions"/);
  assert.match(boundary, /"entry_events"/);
  for (const forbidden of [
    "ttlockRequestContext",
    "validateEmployeeEntryUploadPayload",
    "transactions",
    "persistEmployeeBedTransferCanonicalArchive",
    "bedTransferWriteApproved",
    "durableStayWriteApproved",
    "empRentConfigReadOnly",
    "empFindProjectionArrearsForPaymentReadOnly"
  ]) assert.doesNotMatch(boundary, new RegExp(forbidden));
});

test("raw persistence remains held for review with zero business projection deltas", () => {
  const start = worker.indexOf("async function persistEmployeeRawIngestion(");
  const end = worker.indexOf("async function handleEmployeeRawIngestionEntry(", start);
  const persistence = worker.slice(start, end);
  assert.match(persistence, /projection_status:"HELD_FOR_REVIEW"/);
  assert.match(persistence, /owner_finance_delta:0/);
  assert.match(persistence, /owner_arrears_delta:0/);
  assert.match(persistence, /owner_deposit_delta:0/);
  assert.match(persistence, /owner_occupancy_delta:0/);
  assert.match(persistence, /owner_todo_delta:0/);
  assert.match(persistence, /ttlock_write_count:0/);
  assert.doesNotMatch(persistence, /INSERT INTO transactions|INSERT INTO arrear_tasks|INSERT INTO deposit_ledger/);
});

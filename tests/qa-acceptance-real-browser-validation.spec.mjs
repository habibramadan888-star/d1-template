import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS,
} from "./fixtures/employee-seven-event-golden-session.mjs";
import {
  QA_MATRIX_VERSION,
  qaAcceptanceMatrix,
} from "./fixtures/employee-qa-acceptance-matrices.mjs";
import { GOLDEN_FINANCE_EXPECTED } from "./helpers/employee-golden-session-oracle.mjs";

const root = new URL("../", import.meta.url);
const read = relative => readFile(new URL(relative, root), "utf8");

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} missing`);
  const namedEnd = source.indexOf(`__name(${name},`, start);
  if (namedEnd > start) return source.slice(start, namedEnd);
  const paramsStart = source.indexOf("(", start);
  let paramsDepth = 0;
  let open = -1;
  for (let index = paramsStart; index < source.length; index += 1) {
    if (source[index] === "(") paramsDepth += 1;
    if (source[index] === ")" && --paramsDepth === 0) {
      open = source.indexOf("{", index);
      break;
    }
  }
  assert.notEqual(open, -1, `${name} body missing`);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} unterminated`);
}

test("Quick fixture carries immutable legacy identity and complete left-with-arrears note", () => {
  const matrix = qaAcceptanceMatrix("quick");
  assert.equal(QA_MATRIX_VERSION, "employee-qa-matrix-v2");
  assert.equal(matrix.scenarios.length, 16);

  const legacy = matrix.scenarios[4].input;
  assert.equal(legacy.arrears_source, "legacy_manual");
  assert.match(legacy.arrears_ref, /^legacy-manual-GOLDEN-S05-AP-BANK-LEGACY-GOLDEN-E05$/);

  const checkout = matrix.scenarios[10].input;
  assert.equal(checkout.checkout_mode, "left_with_arrears");
  assert.equal(checkout.left_arrears_amount, 80);
  assert.equal(checkout.note, "QA left with arrears fixture");
  assert.equal(checkout.final_note, checkout.note);
  assert.deepEqual(GOLDEN_FINANCE_EXPECTED, {
    cash_received: 1620,
    bank_received: 880,
    total_received: 2500,
    cash_out: 199,
    bank_out: 600,
    total_expenses: 799,
    net_funds: 1701,
    cash_net: 1421,
    bank_net: 280,
    outstanding: 150,
    arrears_opened: 150,
    arrears_repaid: 70,
    deposit_included: 200,
    deposit_refund: 200,
    expense: 599,
    bed_transfer_fee: 100,
    rent_income: 2130,
  });
});

test("Run materialization assigns Session and Entry identities once and transports the exact legacy ref", async () => {
  const worker = await read("deploy-worker/src/index.js");
  const materialize = functionBlock(worker, "qaAcceptanceMaterializeMatrix");
  const draft = functionBlock(worker, "qaAcceptanceEmployeeDraft");
  assert.match(materialize, /session_id:sessionId/);
  assert.match(materialize, /legacy-manual-\$\{sessionId\}-\$\{entryId\}/);
  assert.match(materialize, /input\.linked_task_id=ref;input\.arrears_ref=ref;input\.original_arrears_id=ref/);
  assert.match(draft, /entries:scenarios\.map\(row=>row\.input\)/);
  assert.match(draft, /session_ids_by_entry:Object\.fromEntries/);
  assert.match(draft, /payload_hash:payloadHash/);
});

test("Employee hydrate and aggregate clone preserve per-entry QA Session identity", async () => {
  const employee = await read("deploy-worker/public/employee-v3.html");
  const clone = functionBlock(employee, "cloneEntryForUpload");
  const loader = functionBlock(employee, "employeeLoadQaAcceptanceRun");
  assert.match(clone, /scopedSessionId=employeeQaAcceptanceSessionId\(copy,sessionId\)/);
  assert.match(clone, /copy\.session_id=scopedSessionId/);
  assert.match(clone, /employee-entry-\$\{scopedSessionId\}-\$\{entryId\}/);
  assert.match(loader, /session_id:sessionIds\[id\]\|\|entry\.session_id/);
  assert.match(loader, /PENDING_VALIDATION/);
  assert.match(loader, /NEEDS_REVALIDATION/);
  assert.doesNotMatch(loader, /upload_status:'VALIDATION_PASSED'/);
});

test("Run status requires matching real validation attestation and gates Accept and Upload", async () => {
  const [worker, employee, consolePage] = await Promise.all([
    read("deploy-worker/src/index.js"),
    read("deploy-worker/public/employee-v3.html"),
    read("deploy-worker/public/qa-acceptance.html"),
  ]);
  const record = functionBlock(worker, "qaAcceptanceRecordAutomation");
  const accept = functionBlock(worker, "qaAcceptanceAcceptReview");
  const report = functionBlock(employee, "employeeQaAcceptanceReportValidation");
  assert.match(record, /\["DRAFT_READY","AUTOMATION_FAILED","AUTOMATION_PASS"\]/);
  assert.match(record, /automation_attestation_status:"ALREADY_CURRENT"/);
  assert.match(record, /status IN \('DRAFT_READY','AUTOMATION_FAILED','AUTOMATION_PASS'\)/);
  for (const field of ["qa_run_id", "artifact_sha256", "qa_worker_version", "matrix_version", "payload_hash"]) assert.match(record, new RegExp(field));
  assert.match(record, /nextStatus=failed===0&&automation\.aggregate_http_status===200\?"AUTOMATION_PASS":"AUTOMATION_FAILED"/);
  assert.match(accept, /QA_REAL_VALIDATION_REQUIRED/);
  assert.match(report, /\/automation/);
  assert.match(report, /formal_write_count:0/);
  assert.match(employee, /employeeQaAcceptanceStatePolicy\(state\.qaAcceptance\.status,state\.qaAcceptance\.cleanupStatus,state\.qaAcceptance\.loadStatus\)\.upload_allowed/);
  assert.match(consolePage, /acceptEmployee'\)\.disabled=run\.status!=='AUTOMATION_PASS'/);
});

test("validation attestation is invalidated by artifact Worker matrix payload or identity drift", async () => {
  const employee = await read("deploy-worker/public/employee-v3.html");
  const contract = functionBlock(employee, "employeeQaAcceptanceDeliveryContract");
  for (const field of ["qa_run_id", "artifact_sha256", "qa_worker_version", "matrix_version", "payload_hash"]) assert.match(contract, new RegExp(`attestation\\.${field}`));
  assert.match(contract, /attestedIds\.length===ids\.length/);
  assert.match(contract, /ids\.every\(id=>attestedIds\.includes\(id\)\)/);
});

test("Checkout validation keeps note and does not add TTLock work", async () => {
  const [worker, exitTest] = await Promise.all([
    read("deploy-worker/src/index.js"),
    read("tests/exit-events-post-access-removal.spec.mjs"),
  ]);
  assert.match(worker, /cleanText\(entry\.final_note\|\|entry\.note,500\)/);
  assert.match(worker, /LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING/);
  assert.match(exitTest, /external_call_count, 0/);
  assert.match(exitTest, /oauth: 0, lockList: 0, identityCardList: 0/);
  assert.equal(EMPLOYEE_SEVEN_EVENT_GOLDEN_SCENARIOS[10].expected_ttlock_calls, 0);
});

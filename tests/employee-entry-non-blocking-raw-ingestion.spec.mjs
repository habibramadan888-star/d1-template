import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const worker = await readFile(new URL("../deploy-worker/src/index.js", import.meta.url), "utf8");
const employee = await readFile(new URL("../deploy-worker/public/employee-v3.html", import.meta.url), "utf8");
const owner = await readFile(new URL("../deploy-worker/public/index-51-main.js", import.meta.url), "utf8");

test("raw ingestion keeps business anomalies non-blocking and technical failures fail closed", () => {
  assert.match(worker, /const EMPLOYEE_RAW_TECHNICAL_ERROR_CODES=new Set/);
  assert.match(worker, /function employeeRawIngestionValidationResult\(/);
  assert.match(worker, /ok:true,error_code:""/);
  assert.match(worker, /projection_status:"HELD_FOR_REVIEW"/);
  assert.match(worker, /review_required:anomalies\.length>0/);
  assert.match(worker, /EMPLOYEE_CORE_AMOUNT_INVALID/);
  assert.match(worker, /EMPLOYEE_IDEMPOTENCY_CONFLICT/);
});

test("raw ingestion persists only sessions and entry events with explicit zero projection deltas", () => {
  const start = worker.indexOf("async function persistEmployeeRawIngestion(");
  const end = worker.indexOf("async function handleEmployeeEntry(", start);
  assert.ok(start >= 0 && end > start);
  const body = worker.slice(start, end);
  assert.match(body, /employeeRawPreparedInsert\(env,"sessions"/);
  assert.match(body, /employeeRawPreparedInsert\(env,"entry_events"/);
  assert.match(body, /raw_event_saved:true/);
  assert.match(body, /canonical_anchor_saved:true/);
  for (const field of ["owner_finance_delta:0", "owner_arrears_delta:0", "owner_deposit_delta:0", "owner_occupancy_delta:0", "owner_todo_delta:0", "ttlock_write_count:0"]) {
    assert.match(body, new RegExp(field));
  }
  for (const forbidden of ["INSERT INTO transactions", "INSERT INTO deposit_ledger", "INSERT INTO arrear_tasks", "INSERT INTO stay_registry", "INSERT INTO today_todos"]) {
    assert.doesNotMatch(body, new RegExp(forbidden));
  }
});

test("short-paid rent needs an explanation but does not require an invented future date", () => {
  const start = employee.indexOf("function validateRentEntry()");
  const end = employee.indexOf("function validateArrearsPaymentEntry", start);
  assert.ok(start >= 0 && end > start);
  const body = employee.slice(start, end);
  assert.match(body, /Short-paid rent requires a reason or note/);
  assert.match(body, /Promised payment date is unknown/);
  assert.match(body, /Promised payment date is historical/);
  assert.doesNotMatch(body, /errors\.push\('Short-paid rent requires a promised payment date/);
  assert.doesNotMatch(body, /errors\.push\('Promised payment date cannot be earlier than today/);
});

test("zero reported rent remains a raw fact only when the employee explains it", () => {
  const start = employee.indexOf("function employeeValidateCommonAmount(");
  const end = employee.indexOf("function employeeRentPeriodDisclosureState", start);
  const body = employee.slice(start, end);
  assert.match(body, /allowZeroWithExplanation=false/);
  assert.match(body, /amt===0&&\(!allowZeroWithExplanation\|\|!employeeTrimField\('remark'\)\)/);
  assert.match(employee, /employeeValidateCommonAmount\(errors,\{label:'Paid Amount',allowZeroWithExplanation:true\}\)/);
});

test("deposit reference gaps are warnings and preserve the employee refund amount", () => {
  const start = employee.indexOf("function validateDepositOutEntry()");
  const end = employee.indexOf("function validateCheckoutEntry", start);
  const body = employee.slice(start, end);
  assert.match(body, /Historical deposit reference unavailable\. Owner Review will be required/);
  assert.match(body, /Refund Reason \/ Remark is required/);
  assert.match(employee, /actual_refund_amount:amount,refund_amount:amount/);
  assert.match(employee, /owner_review_required:ownerReview/);
});

test("starting the next entry resets period state without touching saved drafts", () => {
  const start = employee.indexOf("function resetForm()");
  const end = employee.indexOf("function hasLocalOnly", start);
  const body = employee.slice(start, end);
  assert.match(body, /\$\('cycle'\)\.value='1M'/);
  assert.match(body, /state\.current=null/);
  assert.doesNotMatch(body, /state\.drafts=/);
});

test("client clears a test draft only after complete raw persistence proof", () => {
  assert.match(employee, /rawIngestionConfirmed=data\?\.ingestion_status==='ACCEPTED'/);
  assert.match(employee, /data\?\.raw_event_saved===true/);
  assert.match(employee, /data\?\.session_saved===true/);
  assert.match(employee, /data\?\.entry_event_saved===true/);
  assert.match(employee, /data\?\.canonical_anchor_saved===true/);
  assert.match(employee, /rawIngestionCloudConfirmed=uploadList\.every/);
});

test("owner history reads raw-held sessions without interpreting them as projected business results", () => {
  assert.match(worker, /source==="employee_entry_raw_held"/);
  assert.match(owner, /source==='employee_entry_raw_held'/);
  assert.match(owner, /Raw Employee Entry/);
  assert.match(owner, /Accepted · Held for Review · Not Yet Projected/);
  assert.match(owner, /review_required:/);
  assert.match(owner, /anomalies:/);
});

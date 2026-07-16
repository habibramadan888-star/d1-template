import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = relative => readFile(new URL(relative, root), "utf8");

test("QA deployment config binds only the dedicated D1 and KV with exact gates", async () => {
  const [qa, production] = await Promise.all([read("deploy-worker/wrangler.qa.toml"), read("deploy-worker/wrangler.toml")]);
  assert.match(qa, /name = "homelink-finance-qa"/);
  assert.match(qa, /database_id = "33c63b22-728d-45fe-a0cb-60b533f6055c"/);
  assert.match(qa, /id = "4fba90660a0f4c02ad6e4114f179e929"/);
  assert.match(qa, /APP_ENV = "qa"/);
  assert.match(qa, /CORPID = "HL-QA"/);
  assert.match(qa, /QA_ACCEPTANCE_ENABLED = "true"/);
  assert.doesNotMatch(production, /33c63b22-728d-45fe-a0cb-60b533f6055c|4fba90660a0f4c02ad6e4114f179e929|QA_ACCEPTANCE_ENABLED/);
});

test("QA bootstrap is rerunnable and scopes archive columns to the dedicated QA database", async () => {
  const [bootstrap, migration] = await Promise.all([
    read("scripts/bootstrap-qa-acceptance-environment.mjs"),
    read("migrations/qa/001_qa_acceptance_platform.sql"),
  ]);
  assert.match(bootstrap, /PRAGMA table_info\(sessions\)/);
  assert.match(bootstrap, /if \(!sessionColumns\.has\("entries_json"\)\)/);
  assert.match(bootstrap, /if \(!sessionColumns\.has\("summary_json"\)\)/);
  assert.match(bootstrap, /const QA_D1 = "homelink-finance-qa"/);
  assert.doesNotMatch(migration, /ALTER TABLE sessions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS qa_acceptance_runs/);
});

test("QA credential setup rotates secrets and seeds only the QA Employee authentication table", async () => {
  const setup = await read("scripts/set-qa-acceptance-secrets.mjs");
  assert.match(setup, /const qaD1 = "homelink-finance-qa"/);
  assert.match(setup, /INSERT OR REPLACE INTO employee_users/);
  assert.match(setup, /seedQaEmployee\(hash\(staffPassword\)\)/);
  assert.doesNotMatch(setup, /homelink-finance(?:['"]|\s)/);
});

test("QA page and every QA API are server gated by environment host company role and binding identity", async () => {
  const worker = await read("deploy-worker/src/index.js");
  const gateStart = worker.indexOf("async function qaAcceptanceGate");
  const gateEnd = worker.indexOf("__name(qaAcceptanceGate", gateStart);
  const gate = worker.slice(gateStart, gateEnd);
  assert.match(gate, /qaAcceptanceEnabled/);
  assert.match(gate, /qaAcceptanceRequestHostAllowed/);
  assert.match(gate, /user\?\.corpid.*HL-QA/);
  assert.match(gate, /qaAcceptanceBindingIdentity/);
  assert.match(gate, /QA_MANAGER_REQUIRED/);
  assert.match(worker, /path==="\/qa\/acceptance"/);
  assert.match(worker, /path\.startsWith\("\/api\/qa\/acceptance"\)/);
  assert.match(worker, /return qaAcceptanceNotFound/);
});

test("QA run state machine preserves both human gates and formal upload verification", async () => {
  const worker = await read("deploy-worker/src/index.js");
  for (const state of ["DRAFT_READY", "AUTOMATION_FAILED", "AUTOMATION_PASS", "MANUAL_EMPLOYEE_ACCEPTED", "UPLOAD_PASS", "MANUAL_OWNER_ACCEPTED", "FINAL_ACCEPTED"]) assert.match(worker, new RegExp(state));
  assert.match(worker, /QA_UPLOAD_PERSISTENCE_MISMATCH/);
  assert.match(worker, /parseEmployeeEntryAnchorJson/);
  assert.match(worker, /canonicalFinanceProjectionBuild/);
  assert.match(worker, /nextStatus=failed===0&&automation\.aggregate_http_status===200\?"AUTOMATION_PASS":"AUTOMATION_FAILED"/);
  assert.match(worker, /status='MANUAL_EMPLOYEE_ACCEPTED'/);
  assert.match(worker, /status='MANUAL_OWNER_ACCEPTED'/);
});

test("QA materialization preserves server-verifiable legacy arrears and server-verified transfer genesis", async () => {
  const [worker, resolver] = await Promise.all([
    read("deploy-worker/src/index.js"),
    read("modules/employees/bed-transfer-source-context-resolver.mjs"),
  ]);
  assert.match(worker, /legacy-manual-\$\{sessionId\}-\$\{entryId\}/);
  assert.match(worker, /input\.linked_task_id=ref;input\.arrears_ref=ref;input\.original_arrears_id=ref/);
  assert.match(resolver, /\['internal_beta','qa'\]\.includes\(appEnv\)/);
});

test("QA uses only the versioned frozen TTLock snapshot and never requires a live refresh", async () => {
  const worker = await read("deploy-worker/src/index.js");
  assert.match(worker, /cached\?\.snapshot_version==="qa-ttlock-snapshot-v1"/);
  assert.match(worker, /qaSnapshotHost===qaExpectedHost\|\|qaLocalSnapshot/);
  assert.match(worker, /qaFrozenSnapshot\|\|age<=maxAgeMs/);
  assert.match(worker, /data_source:qaFrozenSnapshot\?"qa_frozen_snapshot":"ttl_cache"/);
  assert.match(worker, /host===TTLOCK_CANONICAL_PRODUCTION_HOST/);
});

test("QA cleanup is run-scoped and cannot address production bindings", async () => {
  const worker = await read("deploy-worker/src/index.js");
  const start = worker.indexOf("async function qaAcceptanceCleanup");
  const end = worker.indexOf("__name(qaAcceptanceCleanup", start);
  const block = worker.slice(start, end);
  assert.match(block, /qaAcceptanceRunId\(body\.qa_run_id\)!==run\.qa_run_id/);
  assert.match(block, /id LIKE \?/);
  assert.match(block, /session_id LIKE \?/);
  assert.doesNotMatch(block, /DROP TABLE|DELETE FROM sessions|database_id|namespace_id/i);
});

test("Employee QA loader uses the formal page and never auto-clicks Upload Session", async () => {
  const [employee, worker] = await Promise.all([read("deploy-worker/public/employee-v3.html"), read("deploy-worker/src/index.js")]);
  assert.match(employee, /employeeLoadQaAcceptanceRun/);
  assert.match(employee, /employeeQaAcceptanceSessionId/);
  assert.match(worker, /auto_upload:false/);
  assert.match(employee, /Review and Preview only; upload is not automatic/);
  assert.match(employee, /employeeQaAcceptanceReportUpload/);
  assert.match(employee, /raw\?\.data&&typeof raw\.data==='object'\?raw\.data:raw/);
  assert.match(employee, /session_id:sessionIds\[id\]\|\|entry\.session_id\|\|''/);
  assert.match(employee, /payment==='bank'\|\|payment==='b'\?'B'/);
  assert.match(employee, /entry\.fee_mode\|\|''\)\.toLowerCase\(\)==='paid'\?Number\(entry\.fee_amount_aed\|\|0\):0/);
  assert.match(employee, /reusablePass=data\.status==='AUTOMATION_PASS'&&validationAttestation&&attested\?\.ok===true/);
  assert.match(employee, /data\.status==='DRAFT_READY'\?'PENDING_VALIDATION':'NEEDS_REVALIDATION'/);
  const loader = employee.slice(employee.indexOf("async function employeeLoadQaAcceptanceRun"), employee.indexOf("async function employeeQaAcceptanceReportUpload"));
  assert.doesNotMatch(loader, /commitSessionAndExport\(|btnExportSession\.click|\/api\/employee\/entry['"]/);
});

test("QA console exposes explicit reviewer buttons without automatic acceptance", async () => {
  const page = await read("deploy-worker/public/qa-acceptance.html");
  assert.match(page, /Accept Employee Review/);
  assert.match(page, /Accept Owner Review/);
  assert.match(page, /confirm\('Confirm that YOU manually reviewed/);
  assert.doesNotMatch(page, /setInterval\([^)]*accept|automatic acceptance/i);
});

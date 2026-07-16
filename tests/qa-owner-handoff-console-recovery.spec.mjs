import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { qaOwnerHandoffHash } from "../scripts/issue-qa-owner-handoff.mjs";

const root = new URL("../", import.meta.url);
const read = relative => readFile(new URL(relative, root), "utf8");

function functionBlock(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.notEqual(start, -1, `${name} missing`);
  const end = source.indexOf(`__name(${name},`, start);
  assert.notEqual(end, -1, `${name} end missing`);
  return source.slice(start, end);
}

test("QA Owner handoff stores only a bounded single-use hash", async () => {
  const [migration, issuer] = await Promise.all([
    read("migrations/qa/002_qa_owner_handoff.sql"),
    read("scripts/issue-qa-owner-handoff.mjs"),
  ]);
  for (const column of ["handoff_id", "code_hash", "qa_run_id", "corpid", "owner_userid", "expires_at", "consumed_at", "revoked_at"]) assert.match(migration, new RegExp(column));
  assert.match(migration, /code_hash TEXT NOT NULL UNIQUE/);
  assert.match(issuer, /randomBytes\(24\)\.toString\("base64url"\)/);
  assert.match(issuer, /mode: 0o600/);
  assert.match(issuer, /code_exposed: false/);
  assert.doesNotMatch(issuer, /console\.log\([^\n]*(?:\bcode\b|owner_password)/);
  const input = { code: "QAO-test-code", runId: "QA-20260716-ABCDEF12" };
  const expected = createHash("sha256").update(`${input.runId}|HL-QA|qa-owner|MANUAL_EMPLOYEE_ACCEPTANCE|${input.code}`).digest("hex");
  assert.equal(qaOwnerHandoffHash(input), expected);
  assert.match(issuer, /OUTPUT_FILE_MUST_BE_OUTSIDE_REPOSITORY/);
  assert.match(issuer, /flag: "wx"/);
  assert.match(issuer, /String\(run\.status\) !== "AUTOMATION_PASS"/);
});

test("QA Owner handoff route is QA-bound and atomically creates a normal manager session", async () => {
  const worker = await read("deploy-worker/src/index.js");
  const boundary = functionBlock(worker, "qaAcceptanceBoundary");
  const handler = functionBlock(worker, "handleQaOwnerHandoffSession");
  assert.match(boundary, /qaAcceptanceEnabled/);
  assert.match(boundary, /qaAcceptanceRequestHostAllowed/);
  assert.match(boundary, /qaAcceptanceBindingIdentity/);
  assert.match(handler, /qaOwnerHandoffAccount/);
  assert.match(handler, /run\.status\|\|""\)!=="AUTOMATION_PASS"/);
  assert.match(handler, /consumed_at IS NULL AND revoked_at IS NULL AND expires_at>\?/);
  assert.match(handler, /changes!==1/);
  assert.match(handler, /createSession\(request,env,user\)/);
  assert.match(handler, /purpose="MANUAL_EMPLOYEE_ACCEPTANCE"/);
  assert.match(handler, /makeQaOwnerSessionCookie\(token\)/);
  assert.doesNotMatch(handler, /makeSessionCookie\(token\)/);
  assert.match(worker, /path === "\/api\/qa\/acceptance\/owner-handoff\/session"/);
  assert.match(worker, /QA_OWNER_SESSION_COOKIE = "__qa_owner_session"/);
  assert.match(worker, /qaAcceptanceRequestAuth/);
  assert.match(worker, /clearQaOwnerSessionCookie/);
  assert.match(worker, /path==="\/qa\/acceptance\/login"/);
});

test("QA Owner handoff page and Console expose the manual role-gated handoff", async () => {
  const [login, consolePage, employee] = await Promise.all([
    read("deploy-worker/public/qa-owner-acceptance-login.html"),
    read("deploy-worker/public/qa-acceptance.html"),
    read("deploy-worker/public/employee-v3.html"),
  ]);
  assert.match(login, /QA Owner Acceptance/);
  assert.match(login, /QA ENVIRONMENT/);
  assert.match(login, /One-time code/);
  assert.match(login, /Production passwords are not accepted/);
  assert.match(login, /\/api\/qa\/acceptance\/owner-handoff\/session/);
  assert.match(consolePage, /Employee Review/);
  assert.match(consolePage, /Formal writes/);
  assert.match(consolePage, /new URLSearchParams\(location\.search\).*qa_run_id/);
  assert.match(consolePage, /Accept Employee Review/);
  assert.match(consolePage, /End QA Owner Session/);
  assert.match(employee, /Employee review complete\? Continue in QA Acceptance Console using the QA Owner account/);
  assert.match(employee, /target="_blank" rel="noopener"/);
});

test("arrears directives schema gap is repaired in QA and remains a bounded no-write error", async () => {
  const [worker, bootstrap] = await Promise.all([
    read("deploy-worker/src/index.js"),
    read("scripts/bootstrap-qa-acceptance-environment.mjs"),
  ]);
  const handler = functionBlock(worker, "handleEmployeeArrearsDirectives");
  for (const column of ["boss_requested_at", "boss_requested_by", "boss_requested_due_date", "directive_status", "staff_promised_at"]) assert.match(bootstrap, new RegExp(column));
  assert.match(bootstrap, /migrations\/qa\/002_qa_owner_handoff\.sql/);
  assert.match(handler, /QA_ARREARS_DIRECTIVES_SCHEMA_UNAVAILABLE/);
  assert.match(handler, /QA_ARREARS_DIRECTIVES_READ_UNAVAILABLE/);
  assert.match(handler, /retryable:true,no_write:true/);
  assert.doesNotMatch(handler, /TTLOCK|sciener|oauth/i);
});

test("AUTOMATION_PASS re-attestation is idempotent or refreshable without unlocking upload", async () => {
  const [worker, employee] = await Promise.all([
    read("deploy-worker/src/index.js"),
    read("deploy-worker/public/employee-v3.html"),
  ]);
  const record = functionBlock(worker, "qaAcceptanceRecordAutomation");
  const reportStart = employee.indexOf("async function employeeQaAcceptanceReportValidation");
  const reportEnd = employee.indexOf("async function employeeQaAcceptanceSessionResume", reportStart);
  assert.notEqual(reportStart, -1);
  assert.notEqual(reportEnd, -1);
  const report = employee.slice(reportStart, reportEnd);
  assert.match(record, /\["DRAFT_READY","AUTOMATION_FAILED","AUTOMATION_PASS"\]/);
  assert.match(record, /previousFreshness\.current/);
  assert.match(record, /exactAttempt/);
  assert.match(record, /result_digest:resultDigest/);
  assert.match(record, /automation_attestation_status:"ALREADY_CURRENT"/);
  assert.match(record, /automation_attestation_status:runStatus==="AUTOMATION_PASS"\?"REFRESHED":"RECORDED"/);
  assert.match(record, /formal_write_count:0/);
  assert.match(report, /serverAttestation/);
  assert.doesNotMatch(report, /QA_RUN_STATE_CONFLICT[^\n]+AUTOMATION_PASS/);
  assert.match(employee, /Upload remains locked until manual Employee acceptance/);
  assert.match(worker, /QA_MANUAL_EMPLOYEE_ACCEPTANCE_REQUIRED/);
  assert.match(worker, /qaAcceptanceEmployeeFormalWriteGate/);
});

test("Staff cannot accept and Production has no QA handoff configuration", async () => {
  const [worker, production] = await Promise.all([
    read("deploy-worker/src/index.js"),
    read("deploy-worker/wrangler.toml"),
  ]);
  const api = functionBlock(worker, "handleQaAcceptanceApi");
  assert.match(api, /const staffRoute=staffDraft\|\|staffAutomation\|\|staffUploadComplete/);
  assert.match(api, /manager:!staffRoute/);
  assert.doesNotMatch(production, /QA_ACCEPTANCE_ENABLED|QA_HOSTNAME|QA_EXPECTED_D1_ID|QA_OWNER/);
  assert.match(worker, /path==="\/qa-owner-acceptance-login"\|\|path==="\/qa-owner-acceptance-login\.html"/);
});

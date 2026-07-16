import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { rootDir } from "./local-worker-utils.mjs";
import { qaCredentialPath } from "./set-qa-acceptance-secrets.mjs";

function cookieFrom(response) {
  const raw = response.headers.get("set-cookie") || "";
  return raw.split(";")[0];
}

async function jsonRequest(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    redirect: "manual",
    headers: { "Content-Type": "application/json", Origin: baseUrl, ...(options.headers || {}) },
  });
  const text = await response.text();
  let raw = {}; try { raw = text ? JSON.parse(text) : {}; } catch { raw = { error_code: "NON_JSON_RESPONSE" }; }
  const body = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  return { response, status: response.status, body };
}

async function login(baseUrl, password) {
  const result = await jsonRequest(baseUrl, "/auth/login", { method: "POST", body: JSON.stringify({ password }) });
  assert.equal(result.status, 200, `QA login failed: ${JSON.stringify(result.body)}`);
  return cookieFrom(result.response);
}

function validationRequests(draft) {
  return draft.entries.map((entry, event_index) => {
    const sessionId = draft.session_ids_by_entry[entry.id];
    const session = { id: sessionId, session_id: sessionId, date: "2026-07-16", source: "employee_entry", handover_status: "COMPLETED", entries: [entry], entries_count: 1, export_text: `QA RUN ${draft.qa_run_id} ${entry.id}` };
    return { entry_identity: entry.id, entry, entries: [entry], session, event_index, dry_run: true, validate_only: true, no_write: true };
  });
}

function sanitizedValidation(body = {}) {
  return {
    success: body.success,
    ok: body.ok,
    validation_result_count: body.validation_result_count,
    passed_result_count: body.passed_result_count,
    failed_result_count: body.failed_result_count,
    formal_write_count: body.formal_write_count,
    request_context_metrics: body.request_context_metrics,
    validation_results: (body.validation_results || []).map(row => ({ entry_identity: row.entry_identity, event_type: row.event_type, ok: row.ok, error_code: row.error_code || "", idempotent: row.idempotent === true, write_attempted: row.write_attempted === true })),
  };
}

export async function runQaAcceptanceAutomation({ mode = "quick" } = {}) {
  const credentials = JSON.parse(await readFile(qaCredentialPath, "utf8"));
  const baseUrl = `https://${credentials.qa_hostname}`;
  const [staffCookie, ownerCookie] = await Promise.all([login(baseUrl, credentials.staff_password), login(baseUrl, credentials.owner_password)]);
  const created = await jsonRequest(baseUrl, "/api/qa/acceptance/runs", { method: "POST", headers: { Cookie: ownerCookie }, body: JSON.stringify({ mode }) });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const run = created.body, runId = run.qa_run_id;
  const draftResult = await jsonRequest(baseUrl, `/api/qa/acceptance/runs/${runId}/employee-draft`, { headers: { Cookie: staffCookie } });
  assert.equal(draftResult.status, 200, JSON.stringify(draftResult.body));
  const draft = draftResult.body;
  assert.equal(draft.entries.length, draft.employee_record_count);
  const aggregate = await jsonRequest(baseUrl, "/api/employee/entry/validate", { method: "POST", headers: { Cookie: staffCookie }, body: JSON.stringify({ aggregate_preflight: true, validation_requests: validationRequests(draft), dry_run: true, validate_only: true, no_write: true }) });
  assert.equal(aggregate.status, 200, JSON.stringify(sanitizedValidation(aggregate.body)));
  assert.equal(aggregate.body.validation_result_count, draft.employee_record_count);
  assert.equal(aggregate.body.failed_result_count, 0);
  assert.equal(aggregate.body.formal_write_count, 0);
  const safe = sanitizedValidation(aggregate.body);
  const recorded = await jsonRequest(baseUrl, `/api/qa/acceptance/runs/${runId}/automation`, { method: "POST", headers: { Cookie: ownerCookie }, body: JSON.stringify({ aggregate_http_status: aggregate.status, validation_results: safe.validation_results, formal_write_count: 0, ttlock_external_calls: Number(safe.request_context_metrics?.ttlock_external_call_count || 0) }) });
  assert.equal(recorded.status, 200, JSON.stringify(recorded.body));
  assert.equal(recorded.body.status, "AUTOMATION_PASS");
  const evidenceDir = path.join(rootDir, "docs", "evidence", "qa-runs", runId);
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(evidenceDir, "manifest.json"), `${JSON.stringify({ qa_run_id: runId, mode, status: "AUTOMATION_PASS", artifact_sha256: run.artifact_sha256, artifact_commit: run.artifact_commit, qa_worker_version: run.qa_worker_version, scenario_count: run.scenario_count, employee_record_count: run.employee_record_count, created_at: run.created_at, production_business_data_changed: false }, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceDir, "scenario-matrix.json"), `${JSON.stringify({ qa_run_id: runId, mode, matrix_version: run.matrix_version, entry_ids: draft.entries.map(row => row.id), session_ids_by_entry: draft.session_ids_by_entry }, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceDir, "validate.json"), `${JSON.stringify(safe, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceDir, "ledger.txt"), "Pending manual Employee Preview & Copy capture.\n", "utf8");
  await writeFile(path.join(evidenceDir, "acceptance.md"), `# QA Acceptance ${runId}\n\n- Mode: ${mode}\n- Status: AUTOMATION_PASS\n- Employee manual acceptance: pending\n- Upload: not executed\n- Owner manual acceptance: pending\n- Final reconciliation: pending\n- Production business data changed: no\n`, "utf8");
  console.log(`QA_RUN_ID=${runId}`);
  console.log(`QA_RUN_STATUS=AUTOMATION_PASS`);
  console.log(`QA_EMPLOYEE_URL=${baseUrl}/employee?qa_run_id=${runId}#entry`);
  console.log(`QA_CONSOLE_URL=${baseUrl}/qa/acceptance`);
  console.log(`FORMAL_WRITE_COUNT=0`);
  console.log(`EVIDENCE_DIRECTORY=${evidenceDir}`);
  return { run: recorded.body, draft, validation: safe, evidence_directory: evidenceDir, employee_url: `${baseUrl}/employee?qa_run_id=${runId}#entry`, console_url: `${baseUrl}/qa/acceptance` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runQaAcceptanceAutomation({ mode: process.env.QA_RUN_MODE || "quick" }).catch(error => { console.error(error?.stack || error); process.exitCode = 1; });

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

export async function runQaAcceptanceAutomation({ mode = "quick" } = {}) {
  const credentials = JSON.parse(await readFile(qaCredentialPath, "utf8"));
  const baseUrl = `https://${credentials.qa_hostname}`;
  const [staffCookie, ownerCookie] = await Promise.all([login(baseUrl, credentials.staff_password), login(baseUrl, credentials.owner_password)]);
  const created = await jsonRequest(baseUrl, "/api/qa/acceptance/runs", { method: "POST", headers: { Cookie: ownerCookie }, body: JSON.stringify({ mode }) });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const run = created.body, runId = run.qa_run_id;
  assert.equal(run.status, "DRAFT_READY");
  const draftResult = await jsonRequest(baseUrl, `/api/qa/acceptance/runs/${runId}/employee-draft`, { headers: { Cookie: staffCookie } });
  assert.equal(draftResult.status, 200, JSON.stringify(draftResult.body));
  const draft = draftResult.body;
  assert.equal(draft.entries.length, draft.employee_record_count);
  const evidenceDir = path.join(rootDir, "docs", "evidence", "qa-runs", runId);
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(evidenceDir, "manifest.json"), `${JSON.stringify({ qa_run_id: runId, mode, status: "DRAFT_READY", artifact_sha256: run.artifact_sha256, artifact_commit: run.artifact_commit, qa_worker_version: run.qa_worker_version, scenario_count: run.scenario_count, employee_record_count: run.employee_record_count, payload_hash: draft.payload_hash, created_at: run.created_at, formal_write_count: 0, production_business_data_changed: false }, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceDir, "scenario-matrix.json"), `${JSON.stringify({ qa_run_id: runId, mode, matrix_version: run.matrix_version, entry_ids: draft.entries.map(row => row.id), session_ids_by_entry: draft.session_ids_by_entry }, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceDir, "validate.json"), `${JSON.stringify({ status: "PENDING_REAL_BROWSER_VALIDATION", validation_result_count: 0, passed_result_count: 0, failed_result_count: 0, formal_write_count: 0 }, null, 2)}\n`, "utf8");
  await writeFile(path.join(evidenceDir, "ledger.txt"), "Pending manual Employee Preview & Copy capture.\n", "utf8");
  await writeFile(path.join(evidenceDir, "acceptance.md"), `# QA Acceptance ${runId}\n\n- Mode: ${mode}\n- Status: DRAFT_READY\n- Real Employee Validate Session: pending\n- Employee manual acceptance: unavailable until real 16/16 validation\n- Upload: not executed\n- Owner manual acceptance: pending\n- Final reconciliation: pending\n- Formal write count: 0\n- Production business data changed: no\n`, "utf8");
  console.log(`QA_RUN_ID=${runId}`);
  console.log(`QA_RUN_STATUS=DRAFT_READY`);
  console.log(`QA_EMPLOYEE_URL=${baseUrl}/employee?qa_run_id=${runId}#entry`);
  console.log(`QA_CONSOLE_URL=${baseUrl}/qa/acceptance/login?qa_run_id=${runId}`);
  console.log(`FORMAL_WRITE_COUNT=0`);
  console.log(`EVIDENCE_DIRECTORY=${evidenceDir}`);
  return { run, draft, evidence_directory: evidenceDir, employee_url: `${baseUrl}/employee?qa_run_id=${runId}#entry`, console_url: `${baseUrl}/qa/acceptance/login?qa_run_id=${runId}` };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runQaAcceptanceAutomation({ mode: process.env.QA_RUN_MODE || "quick" }).catch(error => { console.error(error?.stack || error); process.exitCode = 1; });

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pbkdf2Sync } from "node:crypto";
import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { fetchWithRetry, removeDirWithRetries, rootDir, startWorker, stopProcessTree, waitForWorker, wranglerBin } from "./local-worker-utils.mjs";
import { QA_MATRIX_VERSION, QA_TTLOCK_SNAPSHOT_V1, qaAcceptanceMatrix } from "../tests/fixtures/employee-qa-acceptance-matrices.mjs";

const PASSWORD = "qa-local-durable-upload", SALT = "qa-local-durable-upload-salt";
const D1_ID = "44bacad0-9de9-4a27-a6ca-9f74d40db1ba", KV_ID = "4fba90660a0f4c02ad6e4114f179e929", BINDING_SHA = "7a3b133331e698544c819aa314f33a7d28aa98c53256c86ff8e3277544f47ebd";
const hash = value => pbkdf2Sync(value, SALT, 100000, 32, "sha256").toString("hex");

function freePort() { return new Promise((resolve, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); server.close(() => resolve(address.port)); }); }); }
function runWrangler(args) { return execFileSync(process.execPath, [wranglerBin, ...args], { cwd: rootDir, encoding: "utf8", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } }); }
function d1(args, persistTo) { return runWrangler(["d1", "execute", "homelink-finance-qa-auth086", "--local", "--persist-to", persistTo, "--config", "deploy-worker/wrangler.qa.toml", ...args]); }
function accessHash(value) { let h = 2166136261; for (const char of String(value)) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
async function kvPut(key, value, persistTo, tempRoot) { const file = path.join(tempRoot, `${key.replace(/[^a-z0-9]+/gi, "-")}.json`); await writeFile(file, JSON.stringify(value), "utf8"); runWrangler(["kv", "key", "put", key, "--path", file, "--binding", "RATE_LIMIT", "--local", "--persist-to", persistTo, "--config", "deploy-worker/wrangler.qa.toml"]); }
function cookie(response) { return (response.headers.get("set-cookie") || "").split(";")[0]; }
async function req(base, pathname, options = {}) { const response = await fetchWithRetry(`${base}${pathname}`, { ...options, headers: { "Content-Type": "application/json", Origin: base, ...(options.headers || {}) } }); const text = await response.text(); let raw = {}; try { raw = text ? JSON.parse(text) : {}; } catch { raw = { error_code: "NON_JSON" }; } return { status: response.status, body: raw?.data && typeof raw.data === "object" ? raw.data : raw, headers: response.headers }; }
async function login(base, password) { const result = await req(base, "/auth/login", { method: "POST", body: JSON.stringify({ password }) }); assert.equal(result.status, 200, JSON.stringify(result.body)); return cookie(result); }

async function migrate(persistTo) {
  for (const name of (await readdir(path.join(rootDir, "migrations", "local"))).filter(value => value.endsWith(".sql")).sort()) d1(["--file", path.join(rootDir, "migrations", "local", name)], persistTo);
  d1(["--command", "ALTER TABLE sessions ADD COLUMN entries_json TEXT"], persistTo);
  d1(["--command", "ALTER TABLE sessions ADD COLUMN summary_json TEXT"], persistTo);
  d1(["--file", path.join(rootDir, "migrations", "qa", "001_qa_acceptance_platform.sql")], persistTo);
  d1(["--file", path.join(rootDir, "migrations", "qa", "002_qa_owner_handoff.sql")], persistTo);
  d1(["--file", path.join(rootDir, "migrations", "009_employee_upload_attempts.sql")], persistTo);
  for (const definition of ["boss_requested_at TEXT", "boss_requested_by TEXT", "boss_requested_due_date TEXT", "directive_status TEXT DEFAULT 'none'", "staff_promised_at TEXT"]) d1(["--command", `ALTER TABLE arrear_tasks ADD COLUMN ${definition}`], persistTo);
  d1(["--command", "INSERT OR REPLACE INTO app_settings (corpid,key,value,updated_by,updated_at) VALUES ('HL-QA','rent_ref_room','{\"201\":700,\"202\":770,\"203\":700,\"7210\":730,\"7211\":770,\"7212\":700}','qa-local','2026-07-18T00:00:00.000Z')"], persistTo);
  for (const [taskId, actual] of [["GOLDEN-CLOUD-ARREARS-1", 60], ["FULL-CLOUD-ARREARS-1", 60], ["FULL-CLOUD-ARREARS-2", 40], ["FULL-CLOUD-ARREARS-3", 60]]) d1(["--command", `INSERT OR REPLACE INTO arrear_tasks (task_id,corpid,userid,entry_id,bed,tenant_name,arrear_amount,arrear_reason,created_at,followup_status,promise_date,promise_amount,actual_received,close_status) VALUES ('${taskId}','HL-QA','qa-staff','QA-SEED-${taskId}','204','QA Fixture',100,'QA durable upload','2026-07-18T00:00:00.000Z','pending','2026-07-20',100,${actual},'OPEN')`], persistTo);
}

export async function verifyDurableUploadAttemptLocal() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "homelink-durable-upload-")), persistTo = path.join(tempRoot, "runtime"); let worker = null;
  try {
    await migrate(persistTo);
    await kvPut("qa:environment-identity", { app_env: "qa", corpid: "HL-QA", d1_database_id: D1_ID, kv_namespace_id: KV_ID, binding_contract_sha256: BINDING_SHA }, persistTo, tempRoot);
    await kvPut(`qa:matrix:recovery:${QA_MATRIX_VERSION}`, qaAcceptanceMatrix("recovery"), persistTo, tempRoot);
    await kvPut("qa:artifact-manifest", { candidate_sha256: "d".repeat(64), git_commit: "LOCAL-DURABLE-UPLOAD" }, persistTo, tempRoot);
    await kvPut(`ttlock:snapshot:v2:internal_beta:${accessHash("HL-QA")}`, { ...QA_TTLOCK_SNAPSHOT_V1, observed_at: "2026-07-18T00:00:00.000Z", loadedAt: "2026-07-18T00:00:00.000Z", expires_at: "2099-01-01T00:00:00.000Z" }, persistTo, tempRoot);
    const accounts = [{ userid: "qa-staff", name: "QA Staff", role: "staff", hash: hash(PASSWORD), salt: SALT }, { userid: "qa-owner", name: "QA Owner", role: "manager", hash: hash(`${PASSWORD}-owner`), salt: SALT }];
    const envPath = path.join(tempRoot, "qa.env");
    await writeFile(envPath, [`JWT_SECRET=qa-local-jwt`, `PW_SALT=${SALT}`, `USER_ACCOUNTS='${JSON.stringify(accounts)}'`, "QA_ALLOW_LOCAL=true", "QA_ARTIFACT_COMMIT=LOCAL-DURABLE-UPLOAD", "QA_WORKER_VERSION=local-durable-upload"].join("\n"), "utf8");
    const port = await freePort(); worker = startWorker({ port, persistTo, configFile: "wrangler.qa.toml", envFiles: [envPath] }); const base = `http://127.0.0.1:${port}`; await waitForWorker(base, 60000, { child: worker, label: "durable upload local Worker" });
    const [staffCookie, ownerCookie] = await Promise.all([login(base, PASSWORD), login(base, `${PASSWORD}-owner`)]);
    const created = await req(base, "/api/qa/acceptance/runs", { method: "POST", headers: { Cookie: ownerCookie }, body: JSON.stringify({ mode: "recovery" }) });
    assert.equal(created.status, 200, JSON.stringify(created.body)); assert.equal(created.body.employee_record_count, 44);
    const runId = created.body.qa_run_id, draftResult = await req(base, `/api/qa/acceptance/runs/${runId}/employee-draft`, { headers: { Cookie: staffCookie } });
    assert.equal(draftResult.status, 200, JSON.stringify(draftResult.body)); const draft = draftResult.body; assert.equal(draft.entries.length, 44);
    const requests = draft.entries.map((entry, event_index) => ({ qa_run_id: runId, scenario_id: draft.scenario_ids_by_entry[entry.id], entry_identity: entry.id, entry, entries: [entry], session: { id: draft.session_ids_by_entry[entry.id], entries: [entry], source: "employee_entry" }, event_index, dry_run: true, validate_only: true, no_write: true }));
    const qaContext = { qa_run_id: runId, artifact_sha256: draft.artifact_sha256, qa_worker_version: draft.qa_worker_version, matrix_version: draft.matrix_version, payload_hash: draft.payload_hash };
    const aggregate = await req(base, "/api/employee/entry/validate", { method: "POST", headers: { Cookie: staffCookie }, body: JSON.stringify({ aggregate_preflight: true, validation_requests: requests, dry_run: true, validate_only: true, no_write: true, diagnostic: { frontend_asset_version: "qa-idempotent-finalization-v1" }, qa_validation_context: qaContext }) });
    assert.equal(aggregate.status, 200, JSON.stringify(aggregate.body)); assert.equal(aggregate.body.validation_result_count, 44); assert.equal(aggregate.body.failed_result_count, 0); assert.equal(aggregate.body.formal_write_count, 0);
    const automationBody = { ...qaContext, validation_attempt_id: aggregate.body.validation_attempt_id, trace_id: aggregate.body.trace_id, aggregate_http_status: 200, validation_results: aggregate.body.validation_results.map(row => ({ entry_identity: row.entry_identity, event_type: row.event_type, ok: row.ok, error_code: row.error_code || "", missing_fields: row.missing_fields || [], write_attestation: row.write_attestation || {}, write_attestation_signature: row.write_attestation_signature || "", diagnostic_envelope: row.diagnostic_envelope })), formal_write_count: 0, ttlock_external_calls: 0 };
    const automation = await req(base, `/api/qa/acceptance/runs/${runId}/automation`, { method: "POST", headers: { Cookie: staffCookie }, body: JSON.stringify(automationBody) });
    assert.equal(automation.status, 200, JSON.stringify(automation.body)); assert.equal(automation.body.status, "MANUAL_EMPLOYEE_ACCEPTED"); assert.equal(automation.body.recovery_auto_accepted, true);
    const attemptBody = { artifact_sha256: draft.artifact_sha256, payload_hash: draft.payload_hash, validation_attempt_id: aggregate.body.validation_attempt_id, session_id: `${runId}-CURRENT`, user_click_count: 1 };
    let progress = (await req(base, `/api/qa/acceptance/runs/${runId}/upload-attempts`, { method: "POST", headers: { Cookie: staffCookie }, body: JSON.stringify(attemptBody) })).body;
    assert.equal(progress.saved_count, 0); let responseLossCount = 0, statusRecoveryCount = 0, initialPersisted = null, initialMissing = [];
    for (let safety = 0; safety < 30 && progress.status !== "COMPLETED"; safety += 1) {
      if (progress.remaining_count === 0) { const finalized = await req(base, `/api/qa/acceptance/runs/${runId}/upload-attempts/${progress.attempt_id}/finalize`, { method: "POST", headers: { Cookie: staffCookie }, body: JSON.stringify(attemptBody) }); assert.equal(finalized.status, 200, JSON.stringify(finalized.body)); progress = finalized.body; continue; }
      const next = await req(base, `/api/qa/acceptance/runs/${runId}/upload-attempts/${progress.attempt_id}/next`, { method: "POST", headers: { Cookie: staffCookie }, body: JSON.stringify(attemptBody) });
      if (next.status === 503) { responseLossCount += 1; assert.equal(next.body.response_lost, true); const status = await req(base, `/api/qa/acceptance/runs/${runId}/upload-attempts/${progress.attempt_id}`, { headers: { Cookie: staffCookie } }); assert.equal(status.status, 200, JSON.stringify(status.body)); progress = status.body; statusRecoveryCount += 1; initialPersisted = progress.saved_count; initialMissing = progress.entry_progress.filter(row => row.status === "PENDING").map(row => row.entry_id); continue; }
      assert.equal(next.status, 200, JSON.stringify(next.body)); progress = next.body;
    }
    assert.equal(responseLossCount, 1); assert.equal(statusRecoveryCount, 1); assert.equal(initialPersisted, 40); assert.deepEqual(initialMissing.map(id => id.slice(-3)), ["E25", "E27", "E43", "E44"]);
    assert.equal(progress.status, "COMPLETED"); assert.equal(progress.saved_count, 44); assert.equal(progress.remaining_count, 0); assert.equal(progress.conflict_count, 0); assert.equal(progress.duplicate_count, 0); assert.equal(progress.upload_receipt.formal_write_count, 44); assert.equal(progress.upload_receipt.session_summary_result.parity_count, 44);
    const retry = await req(base, `/api/qa/acceptance/runs/${runId}/upload-attempts/${progress.attempt_id}/finalize`, { method: "POST", headers: { Cookie: staffCookie }, body: JSON.stringify(attemptBody) });
    assert.equal(retry.status, 200); assert.equal(retry.body.idempotent, true); assert.equal(retry.body.upload_receipt.receipt_id, progress.upload_receipt.receipt_id);
    const counts = JSON.parse(d1(["--command", `SELECT (SELECT COUNT(*) FROM sessions WHERE corpid='HL-QA' AND id LIKE '${runId}-%') sessions,(SELECT COUNT(*) FROM transactions WHERE corpid='HL-QA' AND session_id LIKE '${runId}-%') transactions`, "--json"], persistTo));
    assert.equal(counts[0].results[0].sessions, 44); assert.equal(counts[0].results[0].transactions, 38);
    console.log(`DURABLE_UPLOAD_LOCAL_RUN=${runId}`); console.log("DURABLE_UPLOAD_LOCAL_RESULT=PASS"); console.log("INITIAL_PERSISTED=40"); console.log("INITIAL_MISSING=E25,E27,E43,E44"); console.log("FINAL_PERSISTED=44"); console.log("USER_CLICK_COUNT=1"); console.log("MANUAL_RESUME_COUNT=0"); return { run_id: runId, receipt: progress.upload_receipt };
  } finally { if (worker) await stopProcessTree(worker, { label: "durable upload local Worker" }); if (process.env.KEEP_DURABLE_UPLOAD_FIXTURE === "true") console.log(`DURABLE_UPLOAD_FIXTURE=${tempRoot}`); else { const cleanup = await removeDirWithRetries(tempRoot, { label: "durable upload local environment" }); assert.equal(cleanup.ok, true); } }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) verifyDurableUploadAttemptLocal().catch(error => { console.error(error?.stack || error); process.exitCode = 1; });

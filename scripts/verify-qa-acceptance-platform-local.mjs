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

const PASSWORD = "qa-local-acceptance-password", SALT = "qa-local-acceptance-salt";
const D1_ID = "33c63b22-728d-45fe-a0cb-60b533f6055c", KV_ID = "4fba90660a0f4c02ad6e4114f179e929", BINDING_SHA = "aaa5d370f52b103b17718432596e0dae3db5b7500150d4081bad27ef0cad9afd";
const hash = value => pbkdf2Sync(value, SALT, 100000, 32, "sha256").toString("hex");

function freePort() { return new Promise((resolve, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); server.close(() => resolve(address.port)); }); }); }
function runWrangler(args) { return execFileSync(process.execPath, [wranglerBin, ...args], { cwd: rootDir, encoding: "utf8", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } }); }
function runQaD1(args, persistTo) { return runWrangler(["d1", "execute", "homelink-finance-qa", "--local", "--persist-to", persistTo, "--config", "deploy-worker/wrangler.qa.toml", ...args]); }
async function migrateQaD1(persistTo) {
  const localDir = path.join(rootDir, "migrations", "local");
  for (const name of (await readdir(localDir)).filter(value => value.endsWith(".sql")).sort()) runQaD1(["--file", path.join(localDir, name)], persistTo);
  runQaD1(["--command", "ALTER TABLE sessions ADD COLUMN entries_json TEXT"], persistTo);
  runQaD1(["--command", "ALTER TABLE sessions ADD COLUMN summary_json TEXT"], persistTo);
  runQaD1(["--file", path.join(rootDir, "migrations", "qa", "001_qa_acceptance_platform.sql")], persistTo);
}
function accessHash(value) { let h = 2166136261; for (const c of String(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
async function kvPut(key, value, persistTo, tempRoot) { const file = path.join(tempRoot, `${key.replace(/[^a-z0-9]+/gi, "-")}.json`); await writeFile(file, JSON.stringify(value), "utf8"); runWrangler(["kv", "key", "put", key, "--path", file, "--binding", "RATE_LIMIT", "--local", "--persist-to", persistTo, "--config", "deploy-worker/wrangler.qa.toml"]); }
function cookie(response) { return (response.headers.get("set-cookie") || "").split(";")[0]; }
async function req(base, pathname, options = {}) { const response = await fetchWithRetry(`${base}${pathname}`, { ...options, headers: { "Content-Type": "application/json", Origin: base, ...(options.headers || {}) } }); const text = await response.text(); let raw = {}; try { raw = text ? JSON.parse(text) : {}; } catch { raw = { error_code: "NON_JSON" }; } return { status: response.status, body: raw?.data && typeof raw.data === "object" ? raw.data : raw, headers: response.headers }; }
async function login(base, password) { const result = await req(base, "/auth/login", { method: "POST", body: JSON.stringify({ password }) }); assert.equal(result.status, 200); return cookie({ headers: result.headers }); }

export async function verifyQaAcceptancePlatformLocal() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "homelink-qa-platform-")), persistTo = path.join(tempRoot, "runtime"); let worker = null;
  try {
    await migrateQaD1(persistTo);
    runQaD1(["--command", "INSERT OR REPLACE INTO app_settings (corpid,key,value,updated_by,updated_at) VALUES ('HL-QA','rent_ref_room','{\"201\":700,\"202\":770,\"203\":700}','qa-local','2026-07-16T00:00:00.000Z')"], persistTo);
    runQaD1(["--command", "INSERT OR REPLACE INTO arrear_tasks (task_id,corpid,userid,entry_id,bed,tenant_name,arrear_amount,arrear_reason,created_at,followup_status,promise_date,promise_amount,actual_received,close_status) VALUES ('GOLDEN-CLOUD-ARREARS-1','HL-QA','qa-staff','QA-SEED-ARREARS','204','QA Fixture',100,'QA arrears','2026-07-15T08:00:00.000Z','pending','2026-07-20',100,60,'OPEN')"], persistTo);
    await kvPut("qa:environment-identity", { app_env: "qa", corpid: "HL-QA", d1_database_id: D1_ID, kv_namespace_id: KV_ID, binding_contract_sha256: BINDING_SHA }, persistTo, tempRoot);
    await kvPut(`qa:matrix:quick:${QA_MATRIX_VERSION}`, qaAcceptanceMatrix("quick"), persistTo, tempRoot);
    await kvPut("qa:artifact-manifest", { candidate_sha256: "a".repeat(64), git_commit: "LOCAL-QA-COMMIT" }, persistTo, tempRoot);
    await kvPut(`ttlock:snapshot:v2:qa:${accessHash("HL-QA")}`, { ...QA_TTLOCK_SNAPSHOT_V1, observed_at: "2020-01-01T00:00:00.000Z", loadedAt: "2020-01-01T00:00:00.000Z", expires_at: "2099-01-01T00:00:00.000Z" }, persistTo, tempRoot);
    const accounts = [{ userid: "qa-staff", name: "QA Staff", role: "staff", hash: hash(PASSWORD), salt: SALT }, { userid: "qa-owner", name: "QA Owner", role: "manager", hash: hash(`${PASSWORD}-owner`), salt: SALT }];
    const envPath = path.join(tempRoot, "qa.env");
    await writeFile(envPath, [`JWT_SECRET=qa-local-jwt`, `PW_SALT=${SALT}`, `USER_ACCOUNTS='${JSON.stringify(accounts)}'`, "QA_ALLOW_LOCAL=true", "QA_ARTIFACT_COMMIT=LOCAL-QA-COMMIT", "QA_WORKER_VERSION=local-qa"].join("\n"), "utf8");
    const port = await freePort(); worker = startWorker({ port, persistTo, configFile: "wrangler.qa.toml", envFiles: [envPath] }); const base = `http://127.0.0.1:${port}`; await waitForWorker(base, 60000, { child: worker, label: "QA acceptance local Worker" });
    const unauthorized = await req(base, "/api/qa/acceptance/runs"); assert.equal(unauthorized.status, 401);
    const staffCookie = await login(base, PASSWORD), ownerCookie = await login(base, `${PASSWORD}-owner`);
    const managerPage = await req(base, "/qa/acceptance", { headers: { Cookie: ownerCookie } }); assert.equal(managerPage.status, 200);
    const staffPage = await req(base, "/qa/acceptance", { headers: { Cookie: staffCookie } }); assert.equal(staffPage.status, 403);
    const created = await req(base, "/api/qa/acceptance/runs", { method: "POST", headers: { Cookie: ownerCookie }, body: JSON.stringify({ mode: "quick" }) }); assert.equal(created.status, 200, JSON.stringify(created.body)); assert.equal(created.body.status, "DRAFT_READY");
    const runId = created.body.qa_run_id, draft = await req(base, `/api/qa/acceptance/runs/${runId}/employee-draft`, { headers: { Cookie: staffCookie } }); assert.equal(draft.status, 200); assert.equal(draft.body.entries.length, 16); assert.equal(draft.body.auto_upload, false);
    const validationRequests = draft.body.entries.map((entry, event_index) => { const id = draft.body.session_ids_by_entry[entry.id]; return { entry_identity: entry.id, entry, entries: [entry], session: { id, entries: [entry], date: "2026-07-16", source: "employee_entry" }, event_index, dry_run: true, validate_only: true, no_write: true }; });
    const aggregate = await req(base, "/api/employee/entry/validate", { method: "POST", headers: { Cookie: staffCookie }, body: JSON.stringify({ aggregate_preflight: true, validation_requests: validationRequests, dry_run: true, validate_only: true, no_write: true }) }); assert.equal(aggregate.status, 200, JSON.stringify(aggregate.body)); assert.equal(aggregate.body.validation_result_count, 16); assert.equal(aggregate.body.formal_write_count, 0);
    const automation = await req(base, `/api/qa/acceptance/runs/${runId}/automation`, { method: "POST", headers: { Cookie: staffCookie }, body: JSON.stringify({ qa_run_id: runId, artifact_sha256: draft.body.artifact_sha256, qa_worker_version: draft.body.qa_worker_version, matrix_version: draft.body.matrix_version, payload_hash: draft.body.payload_hash, aggregate_http_status: 200, validation_results: aggregate.body.validation_results.map(row => ({ entry_identity: row.entry_identity, event_type: row.event_type, ok: row.ok, error_code: row.error_code || "", missing_fields: row.missing_fields || [] })), formal_write_count: 0, ttlock_external_calls: 0 }) }); assert.equal(automation.status, 200, JSON.stringify(automation.body)); assert.equal(automation.body.status, "AUTOMATION_PASS");
    const hydrated = await req(base, `/api/qa/acceptance/runs/${runId}/employee-draft`, { headers: { Cookie: staffCookie } }); assert.equal(hydrated.status, 200); assert.equal(hydrated.body.validation_attestation.passed_count, 16); assert.equal(hydrated.body.validation_attestation.failed_count, 0);
    const count = JSON.parse(runQaD1(["--command", "SELECT COUNT(*) AS count FROM sessions WHERE corpid='HL-QA'", "--json"], persistTo));
    assert.equal(count?.[0]?.results?.[0]?.count, 0);
    console.log("QA_ACCEPTANCE_LOCAL_PLATFORM: PASS"); console.log("QA_RUN_STATUS: AUTOMATION_PASS"); console.log("FORMAL_WRITE_COUNT: 0"); return { pass: true, run_id: runId };
  } finally { if (worker) await stopProcessTree(worker, { label: "QA acceptance local Worker" }); const cleanup = await removeDirWithRetries(tempRoot, { label: "QA acceptance local environment" }); assert.equal(cleanup.ok, true); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) verifyQaAcceptancePlatformLocal().catch(error => { console.error(error?.stack || error); process.exitCode = 1; });

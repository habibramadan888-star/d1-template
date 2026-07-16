import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { rootDir, wranglerBin } from "./local-worker-utils.mjs";
import {
  QA_MATRIX_VERSION,
  QA_TTLOCK_SNAPSHOT_V1,
  qaAcceptanceMatrix,
} from "../tests/fixtures/employee-qa-acceptance-matrices.mjs";

const QA_D1 = "homelink-finance-qa";
const QA_D1_ID = "33c63b22-728d-45fe-a0cb-60b533f6055c";
const QA_KV_ID = "4fba90660a0f4c02ad6e4114f179e929";
const BINDING_SHA = "aaa5d370f52b103b17718432596e0dae3db5b7500150d4081bad27ef0cad9afd";
const config = path.join(rootDir, "deploy-worker", "wrangler.qa.toml");

function run(args, options = {}) {
  return execFileSync(process.execPath, [wranglerBin, ...args], { cwd: rootDir, encoding: "utf8", stdio: options.stdio || "pipe", input: options.input, env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
}

function d1Rows(command) {
  const parsed = JSON.parse(run(["d1", "execute", QA_D1, "--remote", "--command", command, "--json"]));
  return parsed?.[0]?.results || [];
}

function accessSnapshotRuntimeHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}

async function kvPut(key, value, temp) {
  const file = path.join(temp, `${key.replace(/[^a-z0-9]+/gi, "-")}.json`);
  await writeFile(file, JSON.stringify(value), "utf8");
  run(["kv", "key", "put", key, "--path", file, "--namespace-id", QA_KV_ID, "--remote"]);
}

export async function bootstrapQaAcceptanceEnvironment({ artifactDirectory } = {}) {
  if (!process.argv.includes("--remote")) throw new Error("--remote is required for the QA-only bootstrap");
  const production = await readFile(path.join(rootDir, "deploy-worker", "wrangler.toml"), "utf8");
  const qa = await readFile(config, "utf8");
  if (production.includes(QA_D1_ID) || production.includes(QA_KV_ID)) throw new Error("QA binding leaked into Production config");
  if (!qa.includes(QA_D1_ID) || !qa.includes(QA_KV_ID)) throw new Error("QA binding contract missing");
  if (!d1Rows("PRAGMA table_info(sessions)").length) {
    for (const file of ["migrations/local/001_clean_legacy_bootstrap.sql", "migrations/local/002_handover_atomic_staging.sql"]) run(["d1", "execute", QA_D1, "--remote", "--file", path.join(rootDir, file)]);
  }
  const sessionColumns = new Set(d1Rows("PRAGMA table_info(sessions)").map(row => String(row.name)));
  if (!sessionColumns.has("entries_json")) run(["d1", "execute", QA_D1, "--remote", "--command", "ALTER TABLE sessions ADD COLUMN entries_json TEXT"]);
  if (!sessionColumns.has("summary_json")) run(["d1", "execute", QA_D1, "--remote", "--command", "ALTER TABLE sessions ADD COLUMN summary_json TEXT"]);
  run(["d1", "execute", QA_D1, "--remote", "--file", path.join(rootDir, "migrations/qa/001_qa_acceptance_platform.sql")]);
  run(["d1", "execute", QA_D1, "--remote", "--command", "INSERT OR REPLACE INTO app_settings (corpid,key,value,updated_by,updated_at) VALUES ('HL-QA','rent_ref_room','{\"201\":700,\"202\":770,\"203\":700}','qa-bootstrap','2026-07-16T00:00:00.000Z')"]);
  run(["d1", "execute", QA_D1, "--remote", "--command", "INSERT OR REPLACE INTO arrear_tasks (task_id,corpid,userid,entry_id,bed,tenant_name,arrear_amount,arrear_reason,created_at,followup_status,promise_date,promise_amount,actual_received,close_status) VALUES ('GOLDEN-CLOUD-ARREARS-1','HL-QA','qa-staff','QA-SEED-ARREARS','204','QA Fixture',100,'QA formal cloud arrears','2026-07-15T08:00:00.000Z','pending','2026-07-20',100,60,'OPEN')"]);
  const temp = await mkdtemp(path.join(os.tmpdir(), "homelink-qa-bootstrap-"));
  try {
    await kvPut("qa:environment-identity", { app_env: "qa", corpid: "HL-QA", d1_database_id: QA_D1_ID, kv_namespace_id: QA_KV_ID, binding_contract_sha256: BINDING_SHA }, temp);
    for (const mode of ["quick", "full", "recovery"]) await kvPut(`qa:matrix:${mode}:${QA_MATRIX_VERSION}`, qaAcceptanceMatrix(mode), temp);
    const now = Date.now();
    await kvPut(`ttlock:snapshot:v2:qa:${accessSnapshotRuntimeHash("HL-QA")}`, { ...QA_TTLOCK_SNAPSHOT_V1, observed_at: new Date(now).toISOString(), loadedAt: new Date(now).toISOString(), expires_at: new Date(now + 365 * 86400000).toISOString() }, temp);
    if (artifactDirectory) {
      const manifest = JSON.parse(await readFile(path.join(artifactDirectory, "artifact-manifest.json"), "utf8"));
      await kvPut("qa:artifact-manifest", manifest, temp);
    }
  } finally { await rm(temp, { recursive: true, force: true }); }
  console.log("QA_MIGRATION_APPLIED=yes");
  console.log("PRODUCTION_MIGRATION_APPLIED=no");
  console.log("QA_BINDINGS_SEEDED=yes");
}

const artifactArg = process.argv.find(arg => arg.startsWith("--artifact-dir="));
if (process.argv[1]?.endsWith("bootstrap-qa-acceptance-environment.mjs")) bootstrapQaAcceptanceEnvironment({ artifactDirectory: artifactArg?.slice("--artifact-dir=".length) }).catch(error => { console.error(error?.stack || error); process.exitCode = 1; });

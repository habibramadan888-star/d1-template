import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { chmod, writeFile } from "node:fs/promises";
import path from "node:path";

import { rootDir, wranglerBin } from "./local-worker-utils.mjs";

const QA_D1 = "homelink-finance-qa-auth086";
const QA_CORPID = "HL-QA";
const QA_OWNER = "qa-owner";
const config = path.join(rootDir, "deploy-worker", "wrangler.qa.toml");

function arg(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function d1Rows(command) {
  const output = execFileSync(process.execPath, [
    wranglerBin, "d1", "execute", QA_D1, "--remote", "--config", config,
    "--command", command, "--json",
  ], { cwd: rootDir, encoding: "utf8", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
  return JSON.parse(output)?.[0]?.results || [];
}

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function qaOwnerHandoffHash({ code, runId, corpid = QA_CORPID, ownerUserid = QA_OWNER }) {
  return createHash("sha256").update(`${runId}|${corpid}|${ownerUserid}|MANUAL_EMPLOYEE_ACCEPTANCE|${code}`).digest("hex");
}

export async function issueQaOwnerHandoff({ runId, outputFile, ttlSeconds = 900, purpose = "MANUAL_EMPLOYEE_ACCEPTANCE" }) {
  if (!/^QA-\d{8}-[A-Z0-9]{4,12}$/.test(runId)) throw new Error("QA_RUN_ID_INVALID");
  if (!path.isAbsolute(outputFile || "")) throw new Error("ABSOLUTE_OUTPUT_FILE_REQUIRED");
  const resolvedOutput = path.resolve(outputFile);
  const relativeToRepo = path.relative(rootDir, resolvedOutput);
  if (relativeToRepo === "" || (!relativeToRepo.startsWith(`..${path.sep}`) && relativeToRepo !== ".." && !path.isAbsolute(relativeToRepo))) throw new Error("OUTPUT_FILE_MUST_BE_OUTSIDE_REPOSITORY");
  if (purpose !== "MANUAL_EMPLOYEE_ACCEPTANCE") throw new Error("QA_OWNER_HANDOFF_PURPOSE_INVALID");
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < -3600 || ttlSeconds > 1800) throw new Error("TTL_OUT_OF_RANGE");
  const run = d1Rows(`SELECT qa_run_id,status,corpid FROM qa_acceptance_runs WHERE qa_run_id=${sql(runId)} AND corpid='HL-QA' LIMIT 1`)[0];
  if (!run) throw new Error("QA_RUN_NOT_FOUND");
  if (String(run.status) !== "AUTOMATION_PASS") throw new Error("QA_RUN_NOT_AVAILABLE_FOR_EMPLOYEE_ACCEPTANCE");
  const code = `QAO-${randomBytes(24).toString("base64url")}`;
  const handoffId = `QAH-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const codeHash = qaOwnerHandoffHash({ code, runId });
  d1Rows(`INSERT INTO qa_owner_handoff_codes (handoff_id,code_hash,qa_run_id,corpid,owner_userid,purpose,created_at,expires_at) VALUES (${sql(handoffId)},${sql(codeHash)},${sql(runId)},'HL-QA','qa-owner',${sql(purpose)},${sql(createdAt)},${expiresAt})`);
  await writeFile(resolvedOutput, `${JSON.stringify({ code, qa_run_id: runId, expires_at: new Date(expiresAt * 1000).toISOString() })}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(resolvedOutput, 0o600).catch(() => {});
  return { handoff_id: handoffId, qa_run_id: runId, expires_at: new Date(expiresAt * 1000).toISOString(), output_file: resolvedOutput };
}

if (process.argv[1]?.endsWith("issue-qa-owner-handoff.mjs")) {
  const runId = arg("run").toUpperCase();
  const outputFile = arg("output");
  const ttlSeconds = Number(arg("ttl-seconds", "900"));
  const purpose = arg("purpose", "MANUAL_EMPLOYEE_ACCEPTANCE");
  issueQaOwnerHandoff({ runId, outputFile, ttlSeconds, purpose })
    .then(result => console.log(JSON.stringify({ ...result, code_exposed: false })))
    .catch(error => { console.error(error?.message || error); process.exitCode = 1; });
}

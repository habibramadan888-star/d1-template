import { execFileSync } from "node:child_process";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { rootDir, wranglerBin } from "./local-worker-utils.mjs";

const credentialDir = path.join(os.tmpdir(), "homelink-qa-acceptance-074");
export const qaCredentialPath = path.join(credentialDir, "credentials.json");
const config = path.join(rootDir, "deploy-worker", "wrangler.qa.toml");
const qaD1 = "homelink-finance-qa";
const random = () => randomBytes(24).toString("base64url");

function secretPut(name, value) {
  execFileSync(process.execPath, [wranglerBin, "secret", "put", name, "--config", config], { cwd: rootDir, input: `${value}\n`, stdio: ["pipe", "inherit", "inherit"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
}

function seedQaEmployee(pinHash) {
  const now = new Date().toISOString();
  const sql = `INSERT OR REPLACE INTO employee_users (employee_id,employee_name,pin_hash,role,status,created_at,updated_at) VALUES ('qa-staff','QA Staff','${pinHash}','staff','ACTIVE','${now}','${now}')`;
  execFileSync(process.execPath, [wranglerBin, "d1", "execute", qaD1, "--remote", "--command", sql], { cwd: rootDir, stdio: ["ignore", "ignore", "inherit"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
}

export async function setQaAcceptanceSecrets() {
  const salt = random(), staffPassword = random(), ownerPassword = random();
  const hash = password => pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  const accounts = [
    { userid: "qa-staff", name: "QA Staff", role: "staff", hash: hash(staffPassword), salt },
    { userid: "qa-owner", name: "QA Owner", role: "manager", hash: hash(ownerPassword), salt },
  ];
  secretPut("JWT_SECRET", random());
  secretPut("PW_SALT", salt);
  secretPut("USER_ACCOUNTS", JSON.stringify(accounts));
  seedQaEmployee(hash(staffPassword));
  await mkdir(credentialDir, { recursive: true });
  await writeFile(qaCredentialPath, JSON.stringify({ qa_hostname: "homelink-finance-qa.habibramadan888.workers.dev", staff_password: staffPassword, owner_password: ownerPassword }), { encoding: "utf8", mode: 0o600 });
  console.log(`QA_CREDENTIAL_FILE=${qaCredentialPath}`);
  console.log("QA_CREDENTIAL_VALUES_EXPOSED=no");
}

if (process.argv[1]?.endsWith("set-qa-acceptance-secrets.mjs")) setQaAcceptanceSecrets().catch(error => { console.error(error?.stack || error); process.exitCode = 1; });

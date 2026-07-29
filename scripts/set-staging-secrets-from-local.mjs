import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import path from "node:path";

const CONFIRM = "--confirm-staging-secrets";
const secretMaterialPath = path.resolve(
  ".tmp",
  "staging-secrets",
  "staging-test-passwords.local.json"
);
const reportPath = path.resolve("STAGING_SECRET_SETUP_RESULT.md");
const expected = {
  env: "staging",
  worker: "homelink-finance-staging",
  d1Name: "homelink-finance-staging",
  d1Id: "4ff78bfc-3855-436b-aefb-6b492145d79c"
};

function exitWith(message, code = 1) {
  console.error(message);
  process.exit(code);
}

async function hashPassword(password, salt) {
  const keyMaterial = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await webcrypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  return Buffer.from(bits).toString("base64");
}

function requireValue(object, key) {
  const value = object?.[key];
  if (typeof value !== "string" || value.length < 24) {
    exitWith(`Missing or unsafe secret material for ${key}`);
  }
  return value;
}

function runWranglerSecretBulk(secrets) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "powershell.exe" : "npx";
    const args =
      process.platform === "win32"
        ? [
            "-NoProfile",
            "-Command",
            "& 'npx' 'wrangler' 'secret' 'bulk' '--env' 'staging' '--config' 'deploy-worker/wrangler.toml'"
          ]
        : [
            "wrangler",
            "secret",
            "bulk",
            "--env",
            "staging",
            "--config",
            "deploy-worker/wrangler.toml"
          ];
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      shell: false
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    child.stdin.write(`${JSON.stringify(secrets)}\n`);
    child.stdin.end();
  });
}

if (!process.argv.includes(CONFIRM)) {
  exitWith(`Refusing to set staging secrets without ${CONFIRM}`);
}

let material;
try {
  material = JSON.parse(await readFile(secretMaterialPath, "utf8"));
} catch (error) {
  exitWith(`Unable to read local ignored secret material: ${error.message}`);
}

if (material.target_environment !== expected.env)
  exitWith("Secret material target environment mismatch.");
if (material.target_worker !== expected.worker) exitWith("Secret material target worker mismatch.");
if (material.target_d1?.name !== expected.d1Name)
  exitWith("Secret material target D1 name mismatch.");
if (material.target_d1?.id !== expected.d1Id) exitWith("Secret material target D1 id mismatch.");

const source = material.cloudflare_secrets_to_set || {};
const baseSecrets = {
  JWT_SECRET: requireValue(source, "JWT_SECRET"),
  PW_SALT: requireValue(source, "PW_SALT"),
  DATA_ENCRYPTION_KEY: requireValue(source, "DATA_ENCRYPTION_KEY"),
  MANAGER_PW_HASH: requireValue(source, "MANAGER_PW_HASH"),
  STAFF_PW_HASH: requireValue(source, "STAFF_PW_HASH"),
  EMPLOYEE_STAGING_PASSWORD: requireValue(source, "EMPLOYEE_STAGING_PASSWORD"),
  OWNER_STAGING_PASSWORD: requireValue(source, "OWNER_STAGING_PASSWORD"),
  MANAGER_STAGING_PASSWORD: requireValue(source, "MANAGER_STAGING_PASSWORD")
};

const accounts = material.staging_account_seed_material || {};
const managerHash = await hashPassword(baseSecrets.MANAGER_STAGING_PASSWORD, baseSecrets.PW_SALT);
const userAccounts = [
  {
    userid: accounts.owner?.username || "owner_stg_qa_001",
    name: "Staging QA Owner",
    role: "manager",
    hash: baseSecrets.MANAGER_PW_HASH
  },
  {
    userid: accounts.manager_admin?.username || "manager_stg_qa_001",
    name: "Staging QA Manager",
    role: "manager",
    hash: managerHash
  }
];

const secrets = {
  ...baseSecrets,
  USER_ACCOUNTS: JSON.stringify(userAccounts)
};
const secretNames = Object.keys(secrets);

const result = await runWranglerSecretBulk(secrets);
const set = result.code === 0;

const report = [
  "# Staging Secret Setup Result",
  "",
  "Scope: staging environment only. Secret values are intentionally omitted.",
  "",
  `Command: \`npx wrangler secret bulk --env staging --config deploy-worker/wrangler.toml\``,
  "",
  "| Secret | Env | Set | Value Logged | Production Touched | Notes |",
  "|---|---|---|---|---|---|",
  ...secretNames.map(
    (name) =>
      `| \`${name}\` | staging | ${set ? "yes" : "no"} | no | no | Set from ignored local material via stdin; value omitted. |`
  ),
  "",
  `Wrangler exit code: ${result.code}`,
  "",
  "Production deploy: no",
  "Production secret touched: no",
  "Default environment secret touched: no",
  "Secret values logged: no",
  "Secret values committed: no",
  ""
].join("\n");

await writeFile(reportPath, report, "utf8");

if (!set) {
  console.error("STAGING_SECRET_SETUP=FAIL");
  console.error("See STAGING_SECRET_SETUP_RESULT.md for non-sensitive details.");
  process.exit(result.code || 1);
}

console.log("STAGING_SECRET_SETUP=PASS");
console.log(`STAGING_SECRET_NAMES=${secretNames.join(",")}`);
console.log("STAGING_SECRET_VALUES_LOGGED=no");
console.log(`Wrote ${path.basename(reportPath)}`);

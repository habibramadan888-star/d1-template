import { randomBytes, randomInt, webcrypto } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { workerDir } from "./local-worker-utils.mjs";

const outPath = path.join(workerDir, ".dev.vars");

function randomSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function randomPin() {
  return String(randomInt(100000, 999999));
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

if (existsSync(outPath)) {
  console.log(`Local dev secrets already exist at ${outPath}. No changes made.`);
  console.log("Run npm run dev:worker in one terminal, then npm run smoke and npm run smoke:auth.");
  process.exit(0);
}

const jwtSecret = randomSecret();
const salt = randomSecret();
const encryptionKey = randomSecret();
const managerPassword = `mgr-${randomSecret(12)}`;
const staffPassword = `staff-${randomSecret(12)}`;
const employeePin = randomPin();
const managerHash = await hashPassword(managerPassword, salt);
const staffHash = await hashPassword(staffPassword, salt);

function envLine(key, value) {
  return `${key}=${JSON.stringify(value)}`;
}

const content = [
  "# Generated for local development only.",
  "# Do not commit this file.",
  "",
  envLine("APP_NAME", "Homelink Finance"),
  envLine("APP_VERSION", "2.0.0"),
  envLine("APP_ENV", "development"),
  envLine("CORPID", "local-dev-company"),
  envLine("ALLOW_DEV_SEED", "true"),
  "",
  envLine("JWT_SECRET", jwtSecret),
  envLine("PW_SALT", salt),
  envLine("DATA_ENCRYPTION_KEY", encryptionKey),
  "",
  envLine("MANAGER_PW_HASH", managerHash),
  envLine("STAFF_PW_HASH", staffHash),
  "USER_ACCOUNTS='[]'",
  "",
  envLine("LOCAL_MANAGER_PASSWORD", managerPassword),
  envLine("LOCAL_STAFF_PASSWORD", staffPassword),
  envLine("LOCAL_EMPLOYEE_ID", "abdul"),
  envLine("LOCAL_EMPLOYEE_NAME", "阿布杜"),
  envLine("LOCAL_EMPLOYEE_PIN", employeePin),
  "",
  envLine("TTLOCK_API_ORIGIN", "https://api.sciener.com"),
  envLine("TTLOCK_CLIENT_ID", "local-test-only"),
  envLine("TTLOCK_CLIENT_SECRET", "local-test-only"),
  envLine("TTLOCK_USERNAME", "local-test-only"),
  envLine("TTLOCK_PASSWORD", "local-test-only"),
  "",
  envLine("ALLOWED_ORIGINS", "http://127.0.0.1:8793,http://localhost:8793"),
  envLine("ALLOWED_HOST", "127.0.0.1:8793"),
  envLine("CLOUD_API_ORIGIN", "http://127.0.0.1:8793"),
  ""
].join("\n");

writeFileSync(outPath, content, { encoding: "utf8", flag: "wx" });
console.log(`Created local dev secrets at ${outPath}`);
console.log("Run npm run smoke:with-worker to start the local Worker and execute smoke checks.");

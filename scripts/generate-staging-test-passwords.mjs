import { randomBytes, webcrypto } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputPath = path.resolve(".tmp", "staging-secrets", "staging-test-passwords.local.json");

function randomSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
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

const jwtSecret = randomSecret();
const passwordSalt = randomSecret();
const dataEncryptionKey = randomSecret();
const employeePassword = `emp-stg-${randomSecret(24)}`;
const ownerPassword = `owner-stg-${randomSecret(24)}`;
const managerPassword = `manager-stg-${randomSecret(24)}`;
const staffPassword = employeePassword;
const managerHash = await hashPassword(ownerPassword, passwordSalt);
const staffHash = await hashPassword(staffPassword, passwordSalt);
const employeePinHash = await hashPassword(employeePassword, passwordSalt);

const payload = {
  generated_at: new Date().toISOString(),
  target_environment: "staging",
  target_worker: "homelink-finance-staging",
  target_d1: {
    name: "homelink-finance-staging",
    id: "4ff78bfc-3855-436b-aefb-6b492145d79c"
  },
  warning: "Local ignored staging secret material. Do not commit or paste into Markdown.",
  cloudflare_secrets_to_set: {
    JWT_SECRET: jwtSecret,
    PW_SALT: passwordSalt,
    DATA_ENCRYPTION_KEY: dataEncryptionKey,
    MANAGER_PW_HASH: managerHash,
    STAFF_PW_HASH: staffHash,
    EMPLOYEE_STAGING_PASSWORD: employeePassword,
    OWNER_STAGING_PASSWORD: ownerPassword,
    MANAGER_STAGING_PASSWORD: managerPassword
  },
  staging_account_seed_material: {
    employee: {
      username: "employee_stg_qa_001",
      email: "employee_stg_qa_001@example.test",
      role: "staff",
      pin_hash: employeePinHash
    },
    owner: {
      username: "owner_stg_qa_001",
      email: "owner_stg_qa_001@example.test",
      role: "manager",
      password_hash_secret: "MANAGER_PW_HASH"
    },
    manager_admin: {
      username: "manager_stg_qa_001",
      email: "manager_stg_qa_001@example.test",
      role: "manager",
      note: "Current Worker auth uses manager/staff roles; no separate admin role was confirmed."
    }
  }
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, {
  encoding: "utf8",
  flag: "w"
});

console.log("STAGING_TEST_PASSWORDS_GENERATED=yes");
console.log(`STAGING_TEST_PASSWORDS_PATH=${outputPath}`);
console.log(
  "STAGING_TEST_PASSWORD_SECRET_NAMES=JWT_SECRET,PW_SALT,DATA_ENCRYPTION_KEY,MANAGER_PW_HASH,STAFF_PW_HASH,EMPLOYEE_STAGING_PASSWORD,OWNER_STAGING_PASSWORD,MANAGER_STAGING_PASSWORD"
);
console.log("STAGING_TEST_PASSWORD_VALUES_LOGGED=no");
console.log("STAGING_TEST_PASSWORDS_COMMIT=no");

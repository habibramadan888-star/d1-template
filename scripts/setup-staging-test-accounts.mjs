import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CONFIRM = "--confirm-staging-test-accounts";
const expectedD1 = {
  name: "homelink-finance-staging",
  id: "4ff78bfc-3855-436b-aefb-6b492145d79c"
};
const secretMaterialPath = path.resolve(
  ".tmp",
  "staging-secrets",
  "staging-test-passwords.local.json"
);
const sqlPath = path.resolve(".tmp", "staging-secrets", "staging-test-account-seed.sql");
const sqlCliPath = ".tmp/staging-secrets/staging-test-account-seed.sql";
const reportPath = path.resolve("STAGING_TEST_ACCOUNT_SETUP_RESULT.md");

function exitWith(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function sqlString(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

function runWrangler(args) {
  return new Promise((resolve) => {
    const command = process.platform === "win32" ? "powershell.exe" : "npx";
    const quotePs = (arg) => `'${String(arg).replaceAll("'", "''")}'`;
    const spawnArgs =
      process.platform === "win32"
        ? ["-NoProfile", "-Command", `& ${["npx", "wrangler", ...args].map(quotePs).join(" ")}`]
        : ["wrangler", ...args];
    const child = spawn(command, spawnArgs, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
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
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function queryEmployee(employeeId) {
  const sql = `SELECT employee_id, corpid, employee_name, role, status FROM employee_users WHERE lower(employee_id)=lower(${sqlString(employeeId)});`;
  const result = await runWrangler([
    "d1",
    "execute",
    expectedD1.name,
    "--remote",
    "--json",
    "--command",
    sql
  ]);
  if (result.code !== 0) {
    throw new Error("Unable to query staging employee_users safely.");
  }
  const parsed = JSON.parse(result.stdout);
  return parsed?.[0]?.results || [];
}

if (!process.argv.includes(CONFIRM)) {
  exitWith(`Refusing to create staging test accounts without ${CONFIRM}`);
}

const infoResult = await runWrangler(["d1", "info", expectedD1.name, "--json"]);
if (infoResult.code !== 0) exitWith("Unable to confirm staging D1 target.");
const info = JSON.parse(infoResult.stdout);
if (info.name !== expectedD1.name || info.uuid !== expectedD1.id) {
  exitWith("Staging D1 target mismatch; refusing to write test account row.");
}

let material;
try {
  material = JSON.parse(await readFile(secretMaterialPath, "utf8"));
} catch (error) {
  exitWith(`Unable to read local ignored secret material: ${error.message}`);
}

if (material.target_d1?.name !== expectedD1.name || material.target_d1?.id !== expectedD1.id) {
  exitWith("Secret material D1 target mismatch; refusing to write test account row.");
}

const employee = material.staging_account_seed_material?.employee;
if (!employee?.username || !employee?.pin_hash) {
  exitWith("Missing employee seed material.");
}

const beforeRows = await queryEmployee(employee.username);
let employeeStatus = "Exists";

if (beforeRows.length === 0) {
  const now = new Date().toISOString();
  const sql = [
    "-- Staging QA employee test account seed.",
    "-- Contains password hash only; plaintext password is not stored here.",
    "INSERT INTO employee_users",
    "  (employee_id, corpid, employee_name, pin_hash, role, status, created_at, updated_at)",
    "VALUES",
    `  (${sqlString(employee.username)}, 'homelink', 'Staging QA Employee', ${sqlString(employee.pin_hash)}, 'staff', 'ACTIVE', ${sqlString(now)}, ${sqlString(now)});`,
    ""
  ].join("\n");
  await mkdir(path.dirname(sqlPath), { recursive: true });
  await writeFile(sqlPath, sql, "utf8");

  const writeResult = await runWrangler([
    "d1",
    "execute",
    expectedD1.name,
    "--remote",
    "--yes",
    "--json",
    "--file",
    sqlCliPath
  ]);
  if (writeResult.code !== 0) {
    exitWith(
      "Failed to create staging employee test account. Temporary SQL remains ignored under .tmp."
    );
  }
  employeeStatus = "Created";
}

const afterRows = await queryEmployee(employee.username);
if (afterRows.length !== 1 || afterRows[0]?.employee_id !== employee.username) {
  exitWith("Staging employee test account confirmation failed.");
}

const rows = [
  {
    role: "Employee",
    username: employee.username,
    email: employee.email || "employee_stg_qa_001@example.test",
    status: employeeStatus,
    hashStored: "yes",
    plaintextLogged: "no",
    businessDataWritten: "no"
  },
  {
    role: "Owner",
    username: material.staging_account_seed_material?.owner?.username || "owner_stg_qa_001",
    email: material.staging_account_seed_material?.owner?.email || "owner_stg_qa_001@example.test",
    status: "Configured via USER_ACCOUNTS staging secret",
    hashStored: "yes",
    plaintextLogged: "no",
    businessDataWritten: "no"
  },
  {
    role: "Manager/Admin",
    username:
      material.staging_account_seed_material?.manager_admin?.username || "manager_stg_qa_001",
    email:
      material.staging_account_seed_material?.manager_admin?.email ||
      "manager_stg_qa_001@example.test",
    status: "Configured via USER_ACCOUNTS staging secret; no separate admin role exists",
    hashStored: "yes",
    plaintextLogged: "no",
    businessDataWritten: "no"
  }
];

const report = [
  "# Staging Test Account Setup Result",
  "",
  "Scope: `homelink-finance-staging` only. No sessions, transactions, deposit ledger, arrears, or handover rows were written.",
  "",
  "| Role | Username | Email | Created / Exists / N/A | Password Hash Stored | Plain Password Logged | Business Data Written |",
  "|---|---|---|---|---|---|---|",
  ...rows.map(
    (row) =>
      `| ${row.role} | \`${row.username}\` | \`${row.email}\` | ${row.status} | ${row.hashStored} | ${row.plaintextLogged} | ${row.businessDataWritten} |`
  ),
  "",
  "D1 target name: `homelink-finance-staging`",
  "D1 target id: `4ff78bfc-3855-436b-aefb-6b492145d79c`",
  "D1 business data written: no",
  "Plaintext password stored in D1: no",
  "Plaintext password logged: no",
  "Temporary SQL path: `.tmp/staging-secrets/staging-test-account-seed.sql` (ignored, not committed)",
  ""
].join("\n");

await writeFile(reportPath, report, "utf8");

console.log("STAGING_TEST_ACCOUNT_SETUP=PASS");
console.log(`EMPLOYEE_ACCOUNT_STATUS=${employeeStatus.toUpperCase()}`);
console.log("OWNER_ACCOUNT_STATUS=CONFIGURED_VIA_USER_ACCOUNTS_SECRET");
console.log(
  "MANAGER_ADMIN_ACCOUNT_STATUS=CONFIGURED_VIA_USER_ACCOUNTS_SECRET_NO_SEPARATE_ADMIN_ROLE"
);
console.log("PLAINTEXT_PASSWORD_LOGGED=no");
console.log("BUSINESS_DATA_WRITTEN=no");
console.log(`Wrote ${path.basename(reportPath)}`);

import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const rootFiles = [
  "AI_CONTRACT.md",
  "ARCHITECTURE.md",
  "PROJECT_MAP.md",
  "DIRECTORY_GOVERNANCE.md",
  "RUN_REPORT.md",
  "BLOCKER_REPORT.md",
  "NIGHT_SHIFT_REPORT.md",
  "API_INVENTORY.md",
  "DATABASE_AUDIT.md",
  "FINANCE_AUDIT.md",
  "AUTH_TENANCY_AUDIT.md",
  "EMPLOYEE_FLOW_REPORT.md",
  "OWNER_FLOW_REPORT.md",
  "MANUAL_TEST_PLAN.md",
  "COMMERCIALIZATION_BACKLOG.md",
  "NEXT_MORNING_REVIEW.md",
  "MIGRATION_BOOTSTRAP_PLAN.md",
  "MIGRATION_SCHEMA_CONTRACT.md"
];

test("commercial governance reports exist and contain content", async () => {
  for (const file of rootFiles) {
    const text = await readFile(file, "utf8");
    assert.ok(text.length > 200, `${file} should not be empty`);
  }
});

test("commercial blockers are explicitly tracked", async () => {
  const blocker = await readFile("BLOCKER_REPORT.md", "utf8");
  const backlog = await readFile("COMMERCIALIZATION_BACKLOG.md", "utf8");

  assert.match(blocker, /P0/i);
  assert.match(backlog, /P0-001/);
  assert.match(backlog, /Money uses `REAL`/);
  assert.match(backlog, /hard deletes financial records/i);
});

test("environment protection files exist", async () => {
  const gitignore = await readFile(".gitignore", "utf8");
  const envExample = await readFile(".env.example", "utf8");
  const localEnvExample = await readFile(".env.local.example", "utf8");

  assert.match(gitignore, /\.env\.local/);
  assert.match(gitignore, /\.dev\.vars/);
  assert.match(envExample, /JWT_SECRET/);
  assert.match(localEnvExample, /non-production/i);
});

test("migration schema contract keeps commercial money in integer minor units", async () => {
  const contract = await readFile("MIGRATION_SCHEMA_CONTRACT.md", "utf8");

  assert.match(contract, /amount_fils/);
  assert.match(contract, /due_fils/);
  assert.match(contract, /paid_fils/);
  assert.match(contract, /company_id/);
  assert.match(contract, /property_id/);
  assert.match(contract, /not executable SQL/i);
  assert.doesNotMatch(contract, /\|\s*[^|]*_fils\s*\|\s*REAL\s*\|/i);
});

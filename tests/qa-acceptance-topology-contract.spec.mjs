import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = relative => readFile(new URL(relative, root), "utf8");

test("QA topology contract pins distinct resource classes and triple gates", async () => {
  const [contract, production] = await Promise.all([
    read("docs/qa/HOMELINK_QA_TOPOLOGY_AND_ISOLATION_CONTRACT.md"),
    read("deploy-worker/wrangler.toml"),
  ]);
  assert.match(contract, /homelink-finance-qa/);
  assert.match(contract, /homelink-finance-qa-auth086/);
  assert.match(contract, /HOMELINK_FINANCE_QA/);
  assert.match(contract, /APP_ENV === "internal_beta"/);
  assert.match(contract, /QA_ACCEPTANCE_ENABLED === "true"/);
  assert.match(contract, /corpid === "HL-QA"/);
  assert.match(contract, /request hostname equals the configured dedicated QA hostname/);
  assert.match(contract, /QA_ACCEPTANCE_ENABLED` must be absent or false/i);
  assert.match(production, /database_id = "562aa079-1cca-4176-ba3b-7276a65f98fb"/);
  assert.match(production, /id = "c7c64d522d964baba2e72454e7262da9"/);
  assert.doesNotMatch(production, /QA_ACCEPTANCE_ENABLED\s*=\s*"true"/);
});

test("QA contract forbids production mutation and requires immutable artifact bytes", async () => {
  const contract = await read("docs/qa/HOMELINK_QA_TOPOLOGY_AND_ISOLATION_CONTRACT.md");
  for (const phrase of [
    "must never bind Production",
    "no live TTLock credential",
    "without rebuilding",
    "must not execute Production upload",
    "PRODUCTION_MIGRATION_APPLIED",
    "user action only",
    "PARTIAL_AWAITING_MANUAL_EMPLOYEE_ACCEPTANCE",
  ]) assert.match(contract, new RegExp(phrase, "i"));
});

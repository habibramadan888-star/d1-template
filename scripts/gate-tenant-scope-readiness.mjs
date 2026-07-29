#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve("deploy-worker/src/index.js");
const source = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, "utf8") : "";

const checks = [
  ["tenancy audit", "TENANCY_SCOPE_AUDIT.md"],
  ["tenancy migration plan", "TENANCY_MIGRATION_PLAN.md"],
  ["tenancy test plan", "TENANCY_TEST_PLAN.md"],
  ["API inventory", "API_INVENTORY.md"],
  ["database audit", "DATABASE_AUDIT.md"]
];

const rows = checks.map(([check, file]) => {
  const exists = fs.existsSync(path.resolve(file));
  return {
    check,
    result: exists ? "PASS" : "FAIL",
    evidence: exists ? file : `${file} missing`,
    notes: exists ? "available" : "required scope evidence missing"
  };
});

const corpidCount = (source.match(/\bcorpid\b/gi) || []).length;
const companyIdCount = (source.match(/\bcompany_id\b/g) || []).length;
const propertyIdCount = (source.match(/\bproperty_id\b/g) || []).length;

rows.push({
  check: "static CORPID reliance",
  result: corpidCount > companyIdCount ? "MANUAL_REQUIRED" : "WARNING",
  evidence: `corpid=${corpidCount}, company_id=${companyIdCount}, property_id=${propertyIdCount}`,
  notes: "Deployment-wide corpid remains the dominant live scope marker."
});

rows.push({
  check: "production mutation",
  result: "PASS",
  evidence: "script is read-only",
  notes: "no schema, auth, or data mutation is executed"
});

rows.push({
  check: "production SaaS readiness",
  result: "MANUAL_REQUIRED",
  evidence: "tenant model/backfill/cross-tenant tests not implemented",
  notes: "shared SaaS launch remains blocked until scope enforcement is live and tested"
});

const fail = rows.some((row) => row.result === "FAIL");
const manual = rows.some((row) => row.result === "MANUAL_REQUIRED");
const overall = fail ? "FAIL" : manual ? "MANUAL_REQUIRED" : "PASS";

const report = [
  "# Tenant Scope Readiness Gate Result",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `Overall: \`${overall}\``,
  "",
  "| Gate | Result | Evidence | Notes |",
  "| --- | --- | --- | --- |",
  ...rows.map((row) => `| ${row.check} | ${row.result} | ${row.evidence} | ${row.notes} |`),
  "",
  "This gate is read-only and does not change auth, schema, or data."
];

fs.writeFileSync(path.resolve("TENANT_SCOPE_READINESS_GATE_RESULT.md"), `${report.join("\n")}\n`);
console.log(`TENANT_SCOPE_READINESS_GATE=${overall}`);
console.log(`TENANT_SCOPE_CORPID_COUNT=${corpidCount}`);
console.log(`TENANT_SCOPE_COMPANY_ID_COUNT=${companyIdCount}`);
console.log(`TENANT_SCOPE_PROPERTY_ID_COUNT=${propertyIdCount}`);
console.log("Wrote TENANT_SCOPE_READINESS_GATE_RESULT.md");
process.exit(fail ? 1 : 0);

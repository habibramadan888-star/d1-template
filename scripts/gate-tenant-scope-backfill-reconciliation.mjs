#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const fixturePath = path.resolve("tests/fixtures/tenant-scope/local-staging.json");
const reportPath = path.resolve("TENANT_SCOPE_BACKFILL_RECONCILIATION_RESULT.md");

function rowId(row) {
  return row.id || row.row_id || "unknown";
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => row[column] ?? "").join(" | ")} |`)
  ].join("\n");
}

async function loadFixture() {
  return JSON.parse(await readFile(fixturePath, "utf8"));
}

function propertyKey(companyId, propertyId) {
  return `${companyId || ""}::${propertyId || ""}`;
}

function createKnownPropertySet(properties = []) {
  return new Set(
    properties.map((property) => propertyKey(property.company_id, property.property_id))
  );
}

function createKnownCompanySet(companies = []) {
  return new Set(companies.map((company) => company.company_id));
}

function findLegacyCollisions(row, rows) {
  return rows.filter((candidate) => {
    if (rowId(candidate) === rowId(row)) return false;
    if (candidate.corpid !== row.corpid) return false;
    const sameBed = row.bed && candidate.bed && row.bed === candidate.bed;
    const sameCid = row.cid && candidate.cid && row.cid === candidate.cid;
    if (!sameBed && !sameCid) return false;
    return candidate.company_id !== row.company_id || candidate.property_id !== row.property_id;
  });
}

export function createTenantScopeBackfillRows(fixture) {
  const knownCompanies = createKnownCompanySet(fixture.companies);
  const knownProperties = createKnownPropertySet(fixture.properties);

  return fixture.rows.map((row) => {
    const hasCompany = Boolean(row.company_id);
    const hasProperty = Boolean(row.property_id);
    const companyKnown = hasCompany && knownCompanies.has(row.company_id);
    const propertyKnown =
      hasProperty && knownProperties.has(propertyKey(row.company_id, row.property_id));
    const collisions = findLegacyCollisions(row, fixture.rows);
    const missing = [
      hasCompany ? null : "missing company_id",
      hasProperty ? null : "missing property_id",
      companyKnown ? null : "unknown company_id",
      propertyKnown ? null : "unknown property_id"
    ].filter(Boolean);
    const pass = missing.length === 0;
    const collisionRisk = collisions.length
      ? `COLLISION_RESOLVED_BY_CANONICAL_SCOPE: ${collisions.map(rowId).join(", ")}`
      : "none";

    return {
      "Source Row": rowId(row),
      Table: row.table || "unknown",
      "Legacy CORPID": row.corpid || "missing",
      Bed: row.bed || "n/a",
      CID: row.cid || "n/a",
      "Candidate Company": row.company_id || "missing",
      "Candidate Property": row.property_id || "missing",
      "Mapping Status": pass ? "MAPPABLE" : "BLOCKED",
      "Collision Risk": collisionRisk,
      Result: pass ? "PASS" : "BLOCKED",
      Notes: pass
        ? "Canonical company/property mapping exists; do not mutate live rows without approved backfill."
        : missing.join(", ")
    };
  });
}

export function summarizeTenantScopeBackfillRows(rows) {
  const blocked = rows.filter((row) => row.Result === "BLOCKED");
  const warnings = rows.filter((row) => row["Collision Risk"] !== "none");
  return {
    overall: blocked.length ? "BLOCKED" : "PASS",
    rowCount: rows.length,
    blockedCount: blocked.length,
    collisionWarningCount: warnings.length
  };
}

async function run() {
  const fixture = await loadFixture();
  const rows = createTenantScopeBackfillRows(fixture);
  const summary = summarizeTenantScopeBackfillRows(rows);
  const report = [
    "# Tenant Scope Backfill Reconciliation Result",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Scope: staging/local-only tenant scope backfill reconciliation using static fixtures. This script does not deploy, migrate, read or write D1, call production, mutate dashboard/history output, change auth behavior, or remove legacy CORPID fallback.",
    "",
    `Overall: \`${summary.overall}\``,
    "",
    markdownTable(rows, [
      "Source Row",
      "Table",
      "Legacy CORPID",
      "Bed",
      "CID",
      "Candidate Company",
      "Candidate Property",
      "Mapping Status",
      "Collision Risk",
      "Result",
      "Notes"
    ]),
    "",
    "Summary:",
    "",
    `- Rows reconciled: ${summary.rowCount}.`,
    `- Blocked rows: ${summary.blockedCount}.`,
    `- Legacy bed/CID collision warnings resolved by canonical scope: ${summary.collisionWarningCount}.`,
    "",
    "Safety:",
    "",
    "- Production deploy: no.",
    "- Production migration: no.",
    "- Production D1 write: no.",
    "- Production URL called: no.",
    "- Staging D1 write: no.",
    "- Staging D1 read: no; static fixture only.",
    "- Dashboard/history live result changed: no.",
    "- Production auth behavior changed: no.",
    "- Legacy CORPID fallback removed: no.",
    "- Secret/password/token/cookie printed: no.",
    "",
    "Production meaning:",
    "",
    "- P0-006 remains Partial, not Verified.",
    "- This gate proves only local/staging backfill mapping feasibility.",
    "- Production remains blocked until migration SQL, backup, rollback, live query wiring, and human tenancy decisions are approved.",
    ""
  ].join("\n");

  await writeFile(reportPath, `${report}\n`);
  console.log(`TENANT_SCOPE_BACKFILL_RECONCILIATION_GATE=${summary.overall}`);
  console.log(`TENANT_SCOPE_BACKFILL_RECONCILIATION_ROWS=${summary.rowCount}`);
  console.log(`TENANT_SCOPE_BACKFILL_RECONCILIATION_BLOCKED=${summary.blockedCount}`);
  console.log(
    `TENANT_SCOPE_BACKFILL_RECONCILIATION_COLLISION_WARNINGS=${summary.collisionWarningCount}`
  );
  console.log(
    `TENANT_SCOPE_BACKFILL_RECONCILIATION_REPORT=${path.relative(process.cwd(), reportPath)}`
  );
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch((error) => {
    console.error(`TENANT_SCOPE_BACKFILL_RECONCILIATION_GATE=BLOCKED: ${error?.message || error}`);
    process.exit(1);
  });
}

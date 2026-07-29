import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AUDIT_REQUIRED_FIELDS,
  DEFAULT_STAGING_EVIDENCE,
  ENTRY_REQUIRED_FIELDS,
  READ_ONLY_COUNTS_SQL,
  READ_ONLY_EVENT_COUNTS_SQL,
  READ_ONLY_SCHEMA_SQL,
  createTenantScopeAuditEntryEventsRehearsal,
  resolveAuditEventAccess
} from "../scripts/rehearse-tenant-scope-audit-entry-events.mjs";

function scenario(name, evidence = DEFAULT_STAGING_EVIDENCE) {
  const result = createTenantScopeAuditEntryEventsRehearsal(evidence);
  return result.rows.find((row) => row.Scenario === name);
}

test("unauthenticated cannot access tenant audit rows", () => {
  const row = scenario("unauthenticated cannot access tenant audit rows");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_401");
});

test("invalid JWT cannot access tenant audit rows", () => {
  const row = scenario("invalid JWT cannot access tenant event rows");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_401");
});

test("employee can access own tenant/property audit evidence if policy allows", () => {
  const row = scenario("employee own entry event allowed");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "ALLOW");
});

test("employee cannot access other tenant audit evidence", () => {
  const row = scenario("employee other tenant audit evidence filtered");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "FILTER_OUT");
});

test("employee cannot access other property audit evidence", () => {
  const row = scenario("employee other property entry event filtered");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "FILTER_OUT");
});

test("owner can access own tenant audit evidence", () => {
  const row = scenario("owner own tenant audit evidence allowed");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "ALLOW");
});

test("owner cannot access other tenant audit evidence", () => {
  const row = scenario("owner other tenant audit evidence filtered");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "FILTER_OUT");
});

test("manager/admin constrained by tenant/property", () => {
  const manager = scenario("manager other property audit evidence filtered");
  const admin = scenario("admin own tenant entry event allowed");

  assert.equal(manager.Result, "PASS");
  assert.equal(manager.Actual, "FILTER_OUT");
  assert.equal(admin.Result, "PASS");
  assert.equal(admin.Actual, "ALLOW");
});

test("frontend tenant_id tamper ignored", () => {
  const row = scenario("frontend tenant_id tamper ignored");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "company_a");
});

test("legacy CORPID fallback warning preserved", () => {
  const row = scenario("legacy CORPID fallback warning preserved");

  assert.equal(row.Result, "LEGACY_WARNING");
  assert.equal(row.Actual, "LEGACY_WARNING");
});

test("audit_logs scope fields validated", () => {
  const row = scenario("audit_logs scope fields validated");

  assert.equal(row.Result, "PASS");
  for (const field of AUDIT_REQUIRED_FIELDS) {
    assert.match(row.Actual, new RegExp(`\\b${field}\\b`));
  }
});

test("entry_events scope fields validated", () => {
  const row = scenario("entry_events scope fields validated");

  assert.equal(row.Result, "PASS");
  for (const field of ENTRY_REQUIRED_FIELDS) {
    assert.match(row.Actual, new RegExp(`\\b${field}\\b`));
  }
});

test("missing scope fields become MANUAL_REQUIRED, not PASS", () => {
  const evidence = structuredClone(DEFAULT_STAGING_EVIDENCE);
  evidence.schema.audit_logs = evidence.schema.audit_logs.filter((field) => field !== "company_id");
  const row = scenario("audit_logs scope fields validated", evidence);

  assert.equal(row.Result, "MANUAL_REQUIRED");
});

test("production env remains NO-GO", () => {
  const row = scenario("production tenant audit/event authority remains disabled");
  const result = createTenantScopeAuditEntryEventsRehearsal();

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "PRODUCTION_NO_GO");
  assert.equal(result.summary.productionNoGo, true);
});

test("current staging evidence closes scoped owner and void event rows", () => {
  const result = createTenantScopeAuditEntryEventsRehearsal();

  assert.equal(result.overall, "PASS");
  assert.equal(result.summary.auditLogsResult, "PASS");
  assert.equal(result.summary.entryEventsResult, "PASS");
  assert.equal(result.summary.missingCoverageCount, 0);
  assert.equal(result.summary.needsStagingEvidenceDataCount, 0);
});

test("access helper rejects missing tenant claims for direct access", () => {
  const actual = resolveAuditEventAccess({
    claim: { sub: "legacy", role: "employee", corp_id: "homelink", employee_id: "legacy" },
    row: { company_id: "company_a", property_id: "property_a_1" },
    table: "audit_logs"
  });

  assert.equal(actual, "LEGACY_WARNING");
});

test("rehearsal script only uses read-only SQL and staging D1", () => {
  const source = readFileSync(
    new URL("../scripts/rehearse-tenant-scope-audit-entry-events.mjs", import.meta.url),
    "utf8"
  );
  const readOnlySql = [READ_ONLY_SCHEMA_SQL, READ_ONLY_COUNTS_SQL, READ_ONLY_EVENT_COUNTS_SQL].join(
    "\n"
  );

  assert.match(source, /homelink-finance-staging/);
  assert.doesNotMatch(source, /https:\/\/homelink-finance\.workers\.dev/i);
  assert.doesNotMatch(readOnlySql, /\b(UPDATE|INSERT|DELETE|DROP|ALTER|CREATE)\b/i);
});

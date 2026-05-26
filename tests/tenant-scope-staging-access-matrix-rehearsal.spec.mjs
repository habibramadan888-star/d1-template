import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createTenantScopeStagingAccessMatrixRehearsal } from "../scripts/rehearse-tenant-scope-staging-access-matrix.mjs";

function scenario(name) {
  const result = createTenantScopeStagingAccessMatrixRehearsal();
  return result.rows.find((row) => row.Scenario === name);
}

test("unauthenticated denied", () => {
  const row = scenario("unauthenticated employee entry denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_401");
});

test("invalid JWT denied", () => {
  const row = scenario("invalid JWT history denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_401");
});

test("employee own tenant allowed", () => {
  const row = scenario("employee own tenant entry allowed");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "ALLOW");
});

test("employee other tenant denied", () => {
  const row = scenario("employee other tenant entry denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_403");
});

test("employee own property allowed", () => {
  const row = scenario("employee own property rent config read allowed");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "ALLOW");
});

test("employee other property denied", () => {
  const row = scenario("employee other property rent config denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_403");
});

test("owner own tenant allowed", () => {
  const row = scenario("owner tenant dashboard allowed");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "ALLOW");
});

test("owner other tenant denied", () => {
  const row = scenario("owner other tenant dashboard denied");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "DENY_403");
});

test("manager/admin constrained", () => {
  const managerOwn = scenario("manager app settings own property allowed");
  const managerOther = scenario("manager app settings other property denied");
  const adminOther = scenario("admin other tenant tenant records denied");

  assert.equal(managerOwn.Result, "PASS");
  assert.equal(managerOwn.Actual, "ALLOW");
  assert.equal(managerOther.Actual, "DENY_403");
  assert.equal(adminOther.Actual, "DENY_403");
});

test("frontend tenant_id ignored", () => {
  const row = scenario("frontend tenant id tamper ignored");

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "company_a");
});

test("legacy CORPID fallback warning preserved", () => {
  const row = scenario("legacy CORPID fallback warning preserved");

  assert.equal(row.Result, "LEGACY_WARNING");
  assert.equal(row.Actual, "LEGACY_WARNING");
});

test("delete_session respects tenant/property scope", () => {
  const own = scenario("owner delete session own tenant allowed");
  const other = scenario("owner delete session other tenant denied");
  const employee = scenario("employee delete session denied");

  assert.equal(own.Actual, "ALLOW");
  assert.equal(other.Actual, "DENY_403");
  assert.equal(employee.Actual, "DENY_403");
});

test("dashboard/history respects tenant/property scope", () => {
  const own = scenario("owner tenant dashboard allowed");
  const other = scenario("owner other tenant dashboard denied");
  const employee = scenario("employee owner dashboard denied");

  assert.equal(own.Actual, "ALLOW");
  assert.equal(other.Actual, "DENY_403");
  assert.equal(employee.Actual, "DENY_403");
});

test("settings/app_settings scope handled", () => {
  const own = scenario("manager app settings own property allowed");
  const other = scenario("manager app settings other property denied");

  assert.equal(own.Actual, "ALLOW");
  assert.equal(other.Actual, "DENY_403");
});

test("audit_logs and entry_events remain manual-required when not safely automatable", () => {
  const audit = scenario("audit logs require manual production mapping");
  const entry = scenario("entry events require manual production mapping");
  const result = createTenantScopeStagingAccessMatrixRehearsal();

  assert.equal(audit.Result, "MANUAL_REQUIRED");
  assert.equal(entry.Result, "MANUAL_REQUIRED");
  assert.equal(result.summary.manualRequiredCount, 2);
});

test("production env remains no-go", () => {
  const row = scenario("production access matrix authority remains disabled");
  const result = createTenantScopeStagingAccessMatrixRehearsal();

  assert.equal(row.Result, "PASS");
  assert.equal(row.Actual, "disabled");
  assert.equal(result.summary.failCount, 0);
});

test("staging rehearsal source does not call production or mutate D1", () => {
  const source = readFileSync(
    new URL("../scripts/rehearse-tenant-scope-staging-access-matrix.mjs", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /wrangler/i);
  assert.doesNotMatch(source, /d1\s+execute/i);
  assert.doesNotMatch(source, /UPDATE\s+/i);
  assert.doesNotMatch(source, /INSERT\s+/i);
  assert.doesNotMatch(source, /DELETE\s+/i);
  assert.doesNotMatch(source, /DROP\s+/i);
});
